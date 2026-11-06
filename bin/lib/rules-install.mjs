/**
 * AGENTS.md-first rule install / remove, plus Cursor-native `.mdc` files.
 *
 * Project:
 *   - Always-on → managed block in AGENTS.md + CLAUDE.md **and** `.cursor/rules/<name>.mdc`
 *   - Scoped (globs) → `.cursor/rules/<name>.mdc` (+ listed in the managed block)
 *   - Optional twins: `.claude/rules/*.md`, `.github/instructions/*.instructions.md`
 *
 * User (`--scope user`):
 *   - Managed blocks in ~/.claude/CLAUDE.md, ~/.codex/AGENTS.md, ~/.config/opencode/AGENTS.md
 *   - Cursor `.mdc` in ~/.cursor/rules/
 *   Customize → User Rules is account UI and is not written.
 */
import { writeFileSync, mkdirSync, unlinkSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, sep } from "node:path";
import { homedir } from "node:os";
import { PERSONAL_RULES } from "./pkg.mjs";
import { mergeManaged, removeManaged, renderRulesBlock, hasManagedBlock, rel } from "./render.mjs";
import { renderClaudeRule, renderCopilotInstructions } from "./rule-adapters.mjs";
import { getCapability } from "./agents.mjs";

/**
 * Split a rule list into personal vs team by name list (defaults to PERSONAL_RULES).
 * `--scope user` ignores this split and installs every selected rule user-wide.
 * @param {Array<{name: string}>} rules
 */
export function partitionRules(rules) {
  const personalNames = new Set(PERSONAL_RULES);
  const personal = rules.filter((r) => personalNames.has(r.name));
  const team = rules.filter((r) => !personalNames.has(r.name));
  return { personal, team };
}

/**
 * Union rule objects by name (catalog order preserved via catalog list).
 * @param {Array<{name: string}>} catalog
 * @param {string[]} names
 */
export function rulesByNames(catalog, names) {
  const set = new Set(names);
  return catalog.filter((r) => set.has(r.name));
}

/** SHA-256 of file text, recorded per kit-written file so later runs can tell user edits apart. */
export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/**
 * Ownership context for whole-file writes (`.mdc`, twins).
 * @typedef {{
 *   files: Record<string, string>,
 *   legacy: boolean,
 *   force: boolean,
 * }} FileGuard
 */

/** Guard that owns nothing recorded and treats existing files as the user's. */
export const freshGuard = () => ({ files: {}, legacy: false, force: false });

/**
 * True when an existing file at `dest` is safe to replace or delete: it is
 * byte-identical to what the kit last wrote (hash in the manifest), or the
 * manifest predates hashes (`legacy`) and already listed this rule.
 */
function ownsFile(dest, key, guard) {
  const recorded = guard.files[key];
  if (recorded) return recorded === sha256(readFileSync(dest, "utf8"));
  return guard.legacy;
}

/**
 * Write one kit file unless the user changed it. `--force` replaces it after
 * saving `<file>.bak`.
 * @returns {{ status: "wrote"|"same"|"kept"|"backed-up", hash: string }}
 */
export function writeKitFile(dest, key, content, guard, { dryRun = false } = {}) {
  const hash = sha256(content);
  if (existsSync(dest)) {
    const cur = readFileSync(dest, "utf8");
    if (cur === content) return { status: "same", hash };
    if (!ownsFile(dest, key, guard)) {
      if (!guard.force) return { status: "kept", hash: guard.files[key] ?? "" };
      if (!dryRun) copyFileSync(dest, `${dest}.bak`);
      if (!dryRun) writeFileSync(dest, content);
      return { status: "backed-up", hash };
    }
  }
  if (!dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
  return { status: "wrote", hash };
}

/**
 * Delete one kit file unless the user changed it.
 * @returns {boolean} True when removed (or would be, on dry-run).
 */
export function removeKitFile(dest, key, guard, { dryRun = false } = {}) {
  if (!existsSync(dest)) return false;
  if (!ownsFile(dest, key, guard)) return false;
  if (!dryRun) unlinkSync(dest);
  return true;
}

/**
 * Apply a `writeKitFile` result to the caller's report.
 * @param {{ written: string[], kept: string[], files: Record<string,string> }} out
 */
function track(out, shown, key, res) {
  if (res.status === "kept") {
    out.kept.push(shown);
    return;
  }
  out.written.push(res.status === "backed-up" ? `${shown} (your copy saved as ${shown}.bak)` : shown);
  out.files[key] = res.hash;
}

/**
 * Write Cursor `.mdc` files for every rule (always-on and scoped).
 * @param {string} keyPrefix Manifest key prefix (`.cursor/rules` or `~/.cursor/rules`).
 */
function writeCursorMdc(rules, dir, keyPrefix, guard, out, { dryRun = false } = {}) {
  for (const r of rules) {
    const dest = join(dir, `${r.name}.mdc`);
    const key = `${keyPrefix}/${r.name}.mdc`;
    track(out, keyPrefix.startsWith("~") ? key : rel(dest), key, writeKitFile(dest, key, r.raw, guard, { dryRun }));
    out.surfaces.push(key);
  }
}

/** Heads-up note for files the guard left alone. */
function keptNote(kept) {
  return kept.length
    ? `Kept ${kept.length} file(s) you changed (they differ from the kit): ${kept.join(", ")}. Re-run with --force to replace them; your copy is saved as .bak.`
    : null;
}

/**
 * Where standing rules go for one scope, given the picked tools.
 * A file that already carries a balakit block stays maintained even when its
 * tool is no longer picked, so dropping a tool never leaves a stale block.
 *
 * @typedef {{
 *   blocks: Array<{ abs: string, key: string, tools: string[] }>,
 *   cursor: { dir: string, keyPrefix: string } | null,
 *   twins: { claude: boolean, copilot: boolean },
 *   unserved: string[],
 * }} RuleTargets
 *
 * @param {{ scope: "project"|"user", agents?: string[], cwd?: string, home?: string, surfaces?: string[] }} input
 *   `agents` undefined means every tool (legacy callers and tests).
 * @returns {RuleTargets}
 */
export function resolveRuleTargets({ scope, agents, cwd = process.cwd(), home = homedir(), surfaces = [] }) {
  const all = agents === undefined;
  const picked = new Set(agents ?? []);
  const has = (id) => all || picked.has(id);
  const standing = (id) => getCapability(id)?.standing;
  const served = new Set();
  const blocks = [];
  const addBlock = (abs, key, tools) => {
    const live = hasManagedBlock(abs);
    if (!tools.length && !live) return;
    tools.forEach((t) => served.add(t));
    blocks.push({ abs, key, tools: tools.length ? tools : ["(kept: file already has a balakit block)"] });
  };

  let cursor = null;
  if (scope === "user") {
    const userBlocks = [
      ["claude-code", join(home, ".claude", "CLAUDE.md"), "~/.claude/CLAUDE.md"],
      ["codex", join(home, ".codex", "AGENTS.md"), "~/.codex/AGENTS.md"],
      ["opencode", join(home, ".config", "opencode", "AGENTS.md"), "~/.config/opencode/AGENTS.md"],
    ];
    for (const [id, abs, key] of userBlocks) addBlock(abs, key, has(id) ? [id] : []);
    if (has("cursor") || surfaces.some((x) => x.startsWith("~/.cursor/rules/"))) {
      cursor = { dir: join(home, ".cursor", "rules"), keyPrefix: "~/.cursor/rules" };
      served.add("cursor");
    }
  } else {
    const agentsMdTools = all
      ? ["(all AGENTS.md tools)"]
      : [...picked].filter((id) => standing(id) === "agents-md");
    addBlock(join(cwd, "AGENTS.md"), "AGENTS.md", agentsMdTools);
    addBlock(join(cwd, "CLAUDE.md"), "CLAUDE.md", has("claude-code") ? ["claude-code"] : []);
    if (has("cursor") || surfaces.some((x) => x.startsWith(".cursor/rules/"))) {
      cursor = { dir: join(cwd, ".cursor", "rules"), keyPrefix: ".cursor/rules" };
      served.add("cursor");
    }
  }

  const twins = { claude: scope === "project" && has("claude-code"), copilot: scope === "project" && has("copilot") };
  const unserved = all ? [] : [...picked].filter((id) => !served.has(id) && !(twins.copilot && id === "copilot"));
  return { blocks, cursor, twins, unserved };
}

/**
 * Install standing rules to the resolved targets for one scope.
 * Pass the **full desired** rule set (already reconciled with the manifest).
 * @param {Array} rules
 * @param {RuleTargets} targets From `resolveRuleTargets`.
 * @param {{ cwd?: string, dryRun?: boolean, guard?: FileGuard }} [opts]
 * @returns {{ written: string[], kept: string[], notes: string[], surfaces: string[], files: Record<string,string> }}
 */
export function installRules(rules, targets, { cwd = process.cwd(), dryRun = false, guard = freshGuard() } = {}) {
  const out = { written: [], kept: [], notes: [], surfaces: [], files: {} };
  if (!rules.length) return out;

  const block = renderRulesBlock(rules, { consumer: true });
  for (const b of targets.blocks) {
    if (!dryRun) mergeManaged(b.abs, block);
    out.written.push(b.key.startsWith("~") ? b.key : rel(b.abs));
    out.surfaces.push(b.key);
  }
  if (targets.cursor) writeCursorMdc(rules, targets.cursor.dir, targets.cursor.keyPrefix, guard, out, { dryRun });

  const agents = [...(targets.twins.claude ? ["claude-code"] : []), ...(targets.twins.copilot ? ["copilot"] : [])];
  for (const r of rules.filter((x) => !x.always)) writeScopedTwins(r, { cwd, agents, dryRun, guard, out });

  if (targets.unserved.length) {
    out.notes.push(
      `No standing-rule file for: ${targets.unserved.join(", ")} at this scope (they get skills only, or need rules set in their own settings).`,
    );
  }
  const kept = keptNote(out.kept);
  if (kept) out.notes.push(kept);
  out.surfaces = [...new Set(out.surfaces)];
  return out;
}

/**
 * Install team (project-scoped) rules for the picked tools.
 * @param {{ cwd?: string, dryRun?: boolean, agents?: string[], guard?: FileGuard, surfaces?: string[] }} [opts]
 */
export function installTeamRules(rules, { cwd = process.cwd(), dryRun = false, agents, guard = freshGuard(), surfaces = [] } = {}) {
  const targets = resolveRuleTargets({ scope: "project", agents, cwd, surfaces });
  return installRules(rules, targets, { cwd, dryRun, guard });
}

/**
 * Install rules at user/global scope (this machine, all projects) for the picked tools.
 * Customize → User Rules in Cursor is account UI and is not written.
 * @param {{ home?: string, dryRun?: boolean, agents?: string[], guard?: FileGuard, surfaces?: string[] }} [opts]
 */
export function installPersonalRules(rules, { home = homedir(), dryRun = false, agents, guard = freshGuard(), surfaces = [] } = {}) {
  const targets = resolveRuleTargets({ scope: "user", agents, home, surfaces });
  return installRules(rules, targets, { dryRun, guard });
}

/** Alias used by `--scope user`. */
export const installUserRules = installPersonalRules;

/**
 * Remove team rules from the project (managed blocks + `.mdc` + twins).
 * Files the user changed are left in place and listed in `kept`.
 */
export function removeTeamRules(toRemove, remaining, { cwd = process.cwd(), dryRun = false, guard = freshGuard() } = {}) {
  const written = [];
  const removed = [];
  const kept = [];
  const agentsMd = join(cwd, "AGENTS.md");
  const claudeMd = join(cwd, "CLAUDE.md");

  if (remaining.length) {
    const block = renderRulesBlock(remaining, { consumer: true });
    for (const f of [agentsMd, claudeMd].filter(hasManagedBlock)) {
      if (!dryRun) mergeManaged(f, block);
      written.push(rel(f));
    }
  } else {
    if (!dryRun) {
      if (removeManaged(agentsMd)) removed.push(rel(agentsMd));
      if (removeManaged(claudeMd)) removed.push(rel(claudeMd));
    } else {
      if (hasManagedBlock(agentsMd)) removed.push(rel(agentsMd));
      if (hasManagedBlock(claudeMd)) removed.push(rel(claudeMd));
    }
  }

  for (const r of toRemove) {
    const files = [
      [join(cwd, ".cursor", "rules", `${r.name}.mdc`), `.cursor/rules/${r.name}.mdc`],
      [join(cwd, ".claude", "rules", `${r.name}.md`), `.claude/rules/${r.name}.md`],
      [join(cwd, ".github", "instructions", `${r.name}.instructions.md`), `.github/instructions/${r.name}.instructions.md`],
    ];
    for (const [dest, key] of files) {
      if (!existsSync(dest)) continue;
      if (removeKitFile(dest, key, guard, { dryRun })) removed.push(rel(dest));
      else kept.push(rel(dest));
    }
  }

  return { written, removed, kept };
}

/**
 * Remove user-wide rules from home config. Files the user changed stay.
 */
export function removePersonalRules(toRemove, remaining, { home = homedir(), dryRun = false, guard = freshGuard() } = {}) {
  const removed = [];
  const written = [];
  const kept = [];
  const targets = [
    join(home, ".claude", "CLAUDE.md"),
    join(home, ".codex", "AGENTS.md"),
    join(home, ".config", "opencode", "AGENTS.md"),
  ];

  if (remaining.length) {
    const block = renderRulesBlock(remaining, { consumer: true });
    for (const file of targets.filter(hasManagedBlock)) {
      if (!dryRun) mergeManaged(file, block);
      written.push(file);
    }
  } else {
    for (const file of targets) {
      if (!dryRun) {
        if (removeManaged(file)) removed.push(file);
      } else if (hasManagedBlock(file)) {
        removed.push(file);
      }
    }
  }

  for (const r of toRemove) {
    const dest = join(home, ".cursor", "rules", `${r.name}.mdc`);
    if (!existsSync(dest)) continue;
    if (removeKitFile(dest, `~/.cursor/rules/${r.name}.mdc`, guard, { dryRun })) removed.push(dest);
    else kept.push(dest);
  }

  return { written, removed, kept };
}

export const removeUserRules = removePersonalRules;

/**
 * Write scoped-rule twins for Claude Code and Copilot when those agents are selected.
 * Always-on rules stay in AGENTS.md / CLAUDE.md only.
 */
function writeScopedTwins(rule, { cwd, agents, dryRun, guard, out }) {
  const ids = new Set(agents);
  const twins = [];
  if (ids.has("claude-code")) {
    twins.push([join(cwd, ".claude", "rules", `${rule.name}.md`), `.claude/rules/${rule.name}.md`, renderClaudeRule(rule)]);
  }
  if (ids.has("copilot")) {
    twins.push([
      join(cwd, ".github", "instructions", `${rule.name}.instructions.md`),
      `.github/instructions/${rule.name}.instructions.md`,
      renderCopilotInstructions(rule),
    ]);
  }
  for (const [dest, key, content] of twins) {
    track(out, rel(dest), key, writeKitFile(dest, key, content, guard, { dryRun }));
    out.surfaces.push(key);
  }
}

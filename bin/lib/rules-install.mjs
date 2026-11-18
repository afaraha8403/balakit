/**
 * Single-injection rule install / remove across AGENTS.md, CLAUDE.md,
 * Cursor `.mdc`, Claude/Copilot scoped twins, and user-level config files.
 *
 * Project:
 *   - Cursor-only (`--agents cursor`) → `.cursor/rules/<name>.mdc` only (no duplicate AGENTS.md)
 *   - AGENTS.md tools (`codex`, `opencode`, `copilot`, …) → managed block in `AGENTS.md`
 *   - Cursor + AGENTS.md tool (`--agents cursor,codex`) → always-on rules in `AGENTS.md` once,
 *     plus scoped (glob) `.mdc` files in `.cursor/rules/` (zero 2x prompt injection)
 *   - Claude Code (`--agents claude-code`) → managed block in `CLAUDE.md` + `.claude/rules/<scoped>.md`
 *   - Copilot (`--agents copilot`) → `AGENTS.md` + `.github/instructions/<scoped>.instructions.md`
 *   - Scoped reference copy in `.balakit/rules/<scoped>.md` whenever a standing block points at it
 *
 * User (`--scope user`):
 *   - Managed blocks in `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`,
 *     `~/.config/opencode/AGENTS.md`, `~/.copilot/copilot-instructions.md`, `~/.gemini/GEMINI.md`
 *   - Cursor `.mdc` in `~/.cursor/rules/`
 *   - Scoped reference copy in `~/.balakit/rules/<scoped>.md` when a standing block points at it
 */
import { writeFileSync, mkdirSync, unlinkSync, existsSync, readFileSync, copyFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { PERSONAL_RULES, RETIRED_RULES } from "./pkg.mjs";
import { mergeManaged, removeManaged, renderRulesBlock, hasManagedBlock, rel } from "./render.mjs";
import { renderClaudeRule, renderCopilotInstructions } from "./rule-adapters.mjs";
import { getCapability } from "./agents.mjs";

/** User-scope standing instruction files keyed by agent id. */
export function userBlockTargets(home = homedir()) {
  return [
    ["claude-code", join(home, ".claude", "CLAUDE.md"), "~/.claude/CLAUDE.md"],
    ["codex", join(home, ".codex", "AGENTS.md"), "~/.codex/AGENTS.md"],
    ["opencode", join(home, ".config", "opencode", "AGENTS.md"), "~/.config/opencode/AGENTS.md"],
    ["copilot", join(home, ".copilot", "copilot-instructions.md"), "~/.copilot/copilot-instructions.md"],
    ["gemini-cli", join(home, ".gemini", "GEMINI.md"), "~/.gemini/GEMINI.md"],
  ];
}

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
 * Ownership context for whole-file writes (`.mdc`, twins, scoped references).
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
  if (!existsSync(dest) || !statSync(dest).isFile()) return false;
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
 * Delete one kit file unless the user changed it (unless `guard.force` is set,
 * in which case a `.bak` copy is saved before deletion).
 * @returns {boolean} True when removed (or would be, on dry-run).
 */
export function removeKitFile(dest, key, guard, { dryRun = false } = {}) {
  if (!existsSync(dest) || !statSync(dest).isFile()) return false;
  if (!ownsFile(dest, key, guard)) {
    if (!guard.force) return false;
    if (!dryRun) {
      copyFileSync(dest, `${dest}.bak`);
      unlinkSync(dest);
    }
    return true;
  }
  if (!dryRun) unlinkSync(dest);
  return true;
}

/**
 * Apply a `writeKitFile` result to the caller's report.
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
 * Render a clean Markdown reference file for a scoped rule referenced from
 * `AGENTS.md` / `CLAUDE.md` / user-scope standing blocks.
 */
export function renderScopedRuleDoc(rule) {
  const scopeLine = rule.globs ? `> Scope: apply when working on files matching \`${rule.globs}\`.\n\n` : "";
  return `${scopeLine}${rule.body.trim()}\n`;
}

/**
 * Write Cursor `.mdc` files for selected rules.
 * When `scopedOnly` is true (because root `AGENTS.md` is also active in the
 * same repo), only glob-scoped rules are written as `.mdc` and redundant
 * kit-owned always-on `.mdc` files are pruned to prevent 2x prompt injection.
 */
function writeCursorMdc(rules, cursorTarget, guard, out, { dryRun = false } = {}) {
  const { dir, keyPrefix, scopedOnly } = cursorTarget;
  const toWrite = scopedOnly ? rules.filter((r) => !r.always) : rules;
  const toPrune = scopedOnly ? rules.filter((r) => r.always) : [];

  for (const r of toWrite) {
    const dest = join(dir, `${r.name}.mdc`);
    const key = `${keyPrefix}/${r.name}.mdc`;
    track(out, keyPrefix.startsWith("~") ? key : rel(dest), key, writeKitFile(dest, key, r.raw, guard, { dryRun }));
  }
  if (toWrite.length) out.surfaces.push(`${keyPrefix}/*.mdc`);

  for (const r of toPrune) {
    const dest = join(dir, `${r.name}.mdc`);
    const key = `${keyPrefix}/${r.name}.mdc`;
    if (!existsSync(dest)) continue;
    if (removeKitFile(dest, key, guard, { dryRun })) {
      out.removed.push(keyPrefix.startsWith("~") ? key : rel(dest));
      out.droppedFiles.push(key);
    }
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
 *
 * @typedef {{
 *   scope: "project"|"user",
 *   blocks: Array<{ abs: string, key: string, tools: string[] }>,
 *   staleBlocks: Array<{ abs: string, key: string }>,
 *   cursor: { dir: string, keyPrefix: string, scopedOnly: boolean } | null,
 *   staleCursor: { dir: string, keyPrefix: string } | null,
 *   twins: { claude: boolean, copilot: boolean },
 *   unserved: string[],
 * }} RuleTargets
 *
 * @param {{
 *   scope: "project"|"user",
 *   agents?: string[],
 *   cwd?: string,
 *   home?: string,
 *   surfaces?: string[],
 *   pruneUnselected?: boolean,
 * }} input
 *   `agents` undefined means every tool (legacy callers and tests).
 * @returns {RuleTargets}
 */
export function resolveRuleTargets({
  scope,
  agents,
  cwd = process.cwd(),
  home = homedir(),
  surfaces = [],
  pruneUnselected = false,
}) {
  const all = agents === undefined;
  const picked = new Set(agents ?? []);
  const has = (id) => all || picked.has(id);
  const standing = (id) => getCapability(id)?.standing;
  const served = new Set();
  const blocks = [];
  const staleBlocks = [];

  const addBlock = (abs, key, tools) => {
    const live = hasManagedBlock(abs);
    if (!tools.length) {
      if (live) {
        if (pruneUnselected) staleBlocks.push({ abs, key });
        else blocks.push({ abs, key, tools: ["(kept: file already has a balakit block)"] });
      }
      return;
    }
    tools.forEach((t) => served.add(t));
    blocks.push({ abs, key, tools });
  };

  let cursor = null;
  let staleCursor = null;

  if (scope === "user") {
    for (const [id, abs, key] of userBlockTargets(home)) {
      addBlock(abs, key, has(id) ? [id] : []);
    }
    const hadCursor = surfaces.some((x) => x.startsWith("~/.cursor/rules"));
    if (has("cursor") || (!pruneUnselected && hadCursor)) {
      cursor = { dir: join(home, ".cursor", "rules"), keyPrefix: "~/.cursor/rules", scopedOnly: false };
      served.add("cursor");
    } else if (pruneUnselected && hadCursor) {
      staleCursor = { dir: join(home, ".cursor", "rules"), keyPrefix: "~/.cursor/rules" };
    }
  } else {
    const agentsMdTools = all
      ? ["(all AGENTS.md tools)"]
      : [...picked].filter((id) => standing(id) === "agents-md");
    addBlock(join(cwd, "AGENTS.md"), "AGENTS.md", agentsMdTools);
    addBlock(join(cwd, "CLAUDE.md"), "CLAUDE.md", has("claude-code") ? ["claude-code"] : []);

    const hadCursor = surfaces.some((x) => x.startsWith(".cursor/rules"));
    const agentsMdActive = blocks.some((b) => b.key === "AGENTS.md");
    if (has("cursor") || (!pruneUnselected && hadCursor)) {
      cursor = {
        dir: join(cwd, ".cursor", "rules"),
        keyPrefix: ".cursor/rules",
        scopedOnly: !all && agentsMdActive,
      };
      served.add("cursor");
    } else if (pruneUnselected && hadCursor) {
      staleCursor = { dir: join(cwd, ".cursor", "rules"), keyPrefix: ".cursor/rules" };
    }
  }

  const twins = { claude: scope === "project" && has("claude-code"), copilot: scope === "project" && has("copilot") };
  const unserved = all ? [] : [...picked].filter((id) => !served.has(id) && !(twins.copilot && id === "copilot"));
  return { scope, blocks, staleBlocks, cursor, staleCursor, twins, unserved };
}

/**
 * Remove retired and unselected kit-owned rule files so upgrades and tool
 * switches never leave orphan `.mdc` or scoped twin files behind.
 */
export function pruneStaleRuleArtifacts({
  scope,
  activeRules,
  targets,
  cwd = process.cwd(),
  home = homedir(),
  guard = freshGuard(),
  dryRun = false,
}) {
  const removed = [];
  const droppedFiles = [];
  const activeSet = new Set(activeRules.map((r) => r.name));
  const scopedSet = new Set(activeRules.filter((r) => !r.always).map((r) => r.name));
  const root = scope === "user" ? home : cwd;
  const prefix = scope === "user" ? "~/" : "";

  for (const stale of targets.staleBlocks ?? []) {
    if (!dryRun) {
      if (removeManaged(stale.abs)) removed.push(stale.key);
    } else if (hasManagedBlock(stale.abs)) {
      removed.push(stale.key);
    }
  }

  const candidateNames = new Set([
    ...RETIRED_RULES,
    ...activeRules.map((r) => r.name),
    ...Object.keys(guard.files ?? {})
      .map((k) => {
        const m = k.match(/(?:rules|instructions)\/([^/.]+)\.(?:mdc|instructions\.md|md)$/);
        return m ? m[1] : null;
      })
      .filter(Boolean),
  ]);

  for (const name of candidateNames) {
    const isRetired = RETIRED_RULES.includes(name) || !activeSet.has(name);
    const isScoped = scopedSet.has(name);

    const cursorDir = scope === "user" ? join(home, ".cursor", "rules") : join(cwd, ".cursor", "rules");
    const cursorKey = `${prefix}.cursor/rules/${name}.mdc`;
    const shouldDropCursor =
      Boolean(targets.staleCursor) ||
      isRetired ||
      (targets.cursor?.scopedOnly && !isScoped);
    if (shouldDropCursor && existsSync(join(cursorDir, `${name}.mdc`))) {
      if (removeKitFile(join(cursorDir, `${name}.mdc`), cursorKey, guard, { dryRun })) {
        removed.push(cursorKey);
        droppedFiles.push(cursorKey);
      }
    }

    const scopedRefDest = join(root, ".balakit", "rules", `${name}.md`);
    const scopedRefKey = `${prefix}.balakit/rules/${name}.md`;
    if ((isRetired || !isScoped || !targets.blocks.length) && existsSync(scopedRefDest)) {
      if (removeKitFile(scopedRefDest, scopedRefKey, guard, { dryRun })) {
        removed.push(scopedRefKey);
        droppedFiles.push(scopedRefKey);
      }
    }

    if (scope === "project") {
      const claudeDest = join(cwd, ".claude", "rules", `${name}.md`);
      const claudeKey = `.claude/rules/${name}.md`;
      if ((isRetired || !isScoped || !targets.twins.claude) && existsSync(claudeDest)) {
        if (removeKitFile(claudeDest, claudeKey, guard, { dryRun })) {
          removed.push(rel(claudeDest));
          droppedFiles.push(claudeKey);
        }
      }

      const copilotDest = join(cwd, ".github", "instructions", `${name}.instructions.md`);
      const copilotKey = `.github/instructions/${name}.instructions.md`;
      if ((isRetired || !isScoped || !targets.twins.copilot) && existsSync(copilotDest)) {
        if (removeKitFile(copilotDest, copilotKey, guard, { dryRun })) {
          removed.push(rel(copilotDest));
          droppedFiles.push(copilotKey);
        }
      }
    }
  }

  return { removed, droppedFiles };
}

/**
 * Install standing rules to the resolved targets for one scope.
 * Pass the **full desired** rule set (already reconciled with the manifest).
 * @param {Array} rules
 * @param {RuleTargets} targets From `resolveRuleTargets`.
 * @param {{ cwd?: string, home?: string, dryRun?: boolean, guard?: FileGuard, pruneStale?: boolean }} [opts]
 * @returns {{ written: string[], removed: string[], kept: string[], notes: string[], surfaces: string[], files: Record<string,string>, droppedFiles: string[] }}
 */
export function installRules(
  rules,
  targets,
  { cwd = process.cwd(), home = homedir(), dryRun = false, guard = freshGuard(), pruneStale = true } = {},
) {
  const out = { written: [], removed: [], kept: [], notes: [], surfaces: [], files: {}, droppedFiles: [] };
  if (!rules.length) return out;

  const isUser = targets.scope === "user";
  const scopedPointer = (r) => `${isUser ? "~/" : ""}.balakit/rules/${r.name}.md`;
  const block = renderRulesBlock(rules, { consumer: true, scopedPointer });

  for (const b of targets.blocks) {
    if (!dryRun) mergeManaged(b.abs, block);
    out.written.push(b.key.startsWith("~") ? b.key : rel(b.abs));
    out.surfaces.push(b.key);
  }

  if (targets.blocks.length) {
    const root = isUser ? home : cwd;
    for (const r of rules.filter((x) => !x.always)) {
      const dest = join(root, ".balakit", "rules", `${r.name}.md`);
      const key = scopedPointer(r);
      track(out, isUser ? key : rel(dest), key, writeKitFile(dest, key, renderScopedRuleDoc(r), guard, { dryRun }));
    }
  }

  if (targets.cursor) writeCursorMdc(rules, targets.cursor, guard, out, { dryRun });

  const agents = [...(targets.twins.claude ? ["claude-code"] : []), ...(targets.twins.copilot ? ["copilot"] : [])];
  for (const r of rules.filter((x) => !x.always)) writeScopedTwins(r, { cwd, agents, dryRun, guard, out });

  if (pruneStale) {
    const pruned = pruneStaleRuleArtifacts({ scope: targets.scope, activeRules: rules, targets, cwd, home, guard, dryRun });
    out.removed.push(...pruned.removed);
    out.droppedFiles.push(...pruned.droppedFiles);
  }

  if (targets.unserved.length) {
    out.notes.push(
      `No standing-rule file for: ${targets.unserved.join(", ")} at this scope (they get skills only, or need rules set in their own settings).`,
    );
  }
  const kept = keptNote(out.kept);
  if (kept) out.notes.push(kept);
  out.surfaces = [...new Set(out.surfaces)];
  out.droppedFiles = [...new Set(out.droppedFiles)];
  return out;
}

/**
 * Install team (project-scoped) rules for the picked tools.
 * @param {{ cwd?: string, dryRun?: boolean, agents?: string[], guard?: FileGuard, surfaces?: string[], pruneUnselected?: boolean }} [opts]
 */
export function installTeamRules(
  rules,
  { cwd = process.cwd(), dryRun = false, agents, guard = freshGuard(), surfaces = [], pruneUnselected = false } = {},
) {
  const targets = resolveRuleTargets({ scope: "project", agents, cwd, surfaces, pruneUnselected });
  return installRules(rules, targets, { cwd, dryRun, guard });
}

/**
 * Install rules at user/global scope (this machine, all projects) for the picked tools.
 * Customize → User Rules in Cursor is account UI and is not written.
 * @param {{ home?: string, dryRun?: boolean, agents?: string[], guard?: FileGuard, surfaces?: string[], pruneUnselected?: boolean }} [opts]
 */
export function installPersonalRules(
  rules,
  { home = homedir(), dryRun = false, agents, guard = freshGuard(), surfaces = [], pruneUnselected = false } = {},
) {
  const targets = resolveRuleTargets({ scope: "user", agents, home, surfaces, pruneUnselected });
  return installRules(rules, targets, { home, dryRun, guard });
}

/** Alias used by `--scope user`. */
export const installUserRules = installPersonalRules;

/**
 * Remove team rules from the project (managed blocks + `.mdc` + twins + `.balakit/rules`).
 * Files the user changed are left in place and listed in `kept`.
 */
export function removeTeamRules(toRemove, remaining, { cwd = process.cwd(), dryRun = false, guard = freshGuard() } = {}) {
  const written = [];
  const removed = [];
  const kept = [];
  const agentsMd = join(cwd, "AGENTS.md");
  const claudeMd = join(cwd, "CLAUDE.md");

  if (remaining.length) {
    const block = renderRulesBlock(remaining, {
      consumer: true,
      scopedPointer: (r) => `.balakit/rules/${r.name}.md`,
    });
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
      [join(cwd, ".balakit", "rules", `${r.name}.md`), `.balakit/rules/${r.name}.md`],
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
  const targets = userBlockTargets(home).map(([, abs]) => abs);

  if (remaining.length) {
    const block = renderRulesBlock(remaining, {
      consumer: true,
      scopedPointer: (r) => `~/.balakit/rules/${r.name}.md`,
    });
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
    const files = [
      [join(home, ".cursor", "rules", `${r.name}.mdc`), `~/.cursor/rules/${r.name}.mdc`],
      [join(home, ".balakit", "rules", `${r.name}.md`), `~/.balakit/rules/${r.name}.md`],
    ];
    for (const [dest, key] of files) {
      if (!existsSync(dest)) continue;
      if (removeKitFile(dest, key, guard, { dryRun })) removed.push(dest);
      else kept.push(dest);
    }
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

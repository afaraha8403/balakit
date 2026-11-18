/**
 * Compare what a manifest says balakit installed with what is on disk,
 * plus reverse disk → manifest checks for retired/leftover artifacts and
 * cross-scope duplicates.
 * Shared by `doctor` (health, exit code) and `status` (inventory).
 */
import { existsSync, lstatSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { BEGIN, END, CMD, RETIRED_RULES, RETIRED_SKILLS, RETIRED_PLUGINS } from "./pkg.mjs";
import { loadRules } from "./catalog.mjs";
import { renderRulesBlock } from "./render.mjs";
import { rulesByNames, sha256, userBlockTargets, resolveRuleTargets } from "./rules-install.mjs";
import { readManifest, projectManifestPath, globalManifestPath, isCorruptManifest, emptyManifest } from "./manifest.mjs";
import {
  allSkillLinkDirs,
  missingSkillLinksForAgents,
  treeSha256,
  hasLegacySkillsLock,
} from "./skills-install.mjs";

/**
 * One check result.
 * @typedef {{ level: "issue"|"warn", text: string }} Finding
 *
 * @typedef {{
 *   scope: "project"|"user",
 *   manifest: import("./manifest.mjs").Manifest,
 *   findings: Finding[],
 *   skills: { present: string[], missing: string[] },
 *   brokenLinks: string[],
 *   retiredOnDisk: string[],
 * }} ScopeReport
 */

function managedBlockOf(file) {
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  const a = text.indexOf(BEGIN);
  const b = text.indexOf(END);
  if (a < 0 || b < a) return null;
  return text.slice(a + BEGIN.length, b).trim();
}

function isDanglingLink(p) {
  try {
    if (!lstatSync(p).isSymbolicLink()) return false;
  } catch {
    return false;
  }
  try {
    statSync(p);
    return false;
  } catch {
    return true;
  }
}

/**
 * True when a skill resolves in `.agents/skills` AND across every active
 * agent's expected link folder.
 */
function skillHealthy(root, scope, name, agentIds, where) {
  const canonicalOk = existsSync(join(root, ".agents", "skills", name, "SKILL.md"));
  if (!canonicalOk) {
    const anyFallback = allSkillLinkDirs(scope).some((d) => existsSync(join(root, d, name, "SKILL.md")));
    if (!anyFallback) return false;
  }
  if (agentIds?.length) {
    const missingLinks = missingSkillLinksForAgents([name], agentIds, scope, where);
    if (missingLinks.length) return false;
  }
  return true;
}

/**
 * Delete dangling tool-folder links for the given skills (or all entries when
 * `names` is omitted).
 * @param {string[]|null} names
 * @param {"project"|"user"} scope
 * @param {{ cwd?: string, home?: string }} [where]
 * @returns {string[]} Links removed.
 */
export function pruneDanglingSkillLinks(names, scope, { cwd = process.cwd(), home = homedir() } = {}) {
  const root = scope === "user" ? home : cwd;
  const removed = [];
  for (const dir of allSkillLinkDirs(scope)) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    const candidates = names?.length ? names : readdirSync(abs);
    for (const name of candidates) {
      const link = join(abs, name);
      if (isDanglingLink(link)) {
        rmSync(link, { force: true });
        removed.push(`${scope === "user" ? "~/" : ""}${dir}/${name}`);
      }
    }
  }
  return removed;
}

/**
 * Scan disk for retired kit skills, rules, or plugins that survived an earlier
 * version or manual edit.
 */
export function findRetiredArtifacts(scope, { cwd = process.cwd(), home = homedir() } = {}) {
  const root = scope === "user" ? home : cwd;
  const prefix = scope === "user" ? "~/" : "";
  const retired = [];

  for (const skill of RETIRED_SKILLS) {
    for (const dir of [".agents/skills", ...allSkillLinkDirs(scope)]) {
      const target = join(root, dir, skill);
      if (existsSync(target) || isDanglingLink(target)) {
        retired.push(`${prefix}${dir}/${skill}`);
      }
    }
  }

  for (const rule of RETIRED_RULES) {
    if (rule === "mental") continue;
    const candidates =
      scope === "user"
        ? [[join(home, ".cursor", "rules", `${rule}.mdc`), `~/.cursor/rules/${rule}.mdc`]]
        : [
            [join(cwd, ".cursor", "rules", `${rule}.mdc`), `.cursor/rules/${rule}.mdc`],
            [join(cwd, ".claude", "rules", `${rule}.md`), `.claude/rules/${rule}.md`],
            [
              join(cwd, ".github", "instructions", `${rule}.instructions.md`),
              `.github/instructions/${rule}.instructions.md`,
            ],
          ];
    for (const [abs, shown] of candidates) {
      if (existsSync(abs)) retired.push(shown);
    }
  }

  if (scope === "user") {
    for (const plugin of RETIRED_PLUGINS) {
      const target = join(home, ".cursor", "plugins", "local", plugin);
      if (existsSync(target)) retired.push(`~/.cursor/plugins/local/${plugin}`);
    }
  }

  return [...new Set(retired)];
}

/**
 * Check one scope against disk.
 * @param {"project"|"user"} scope
 * @param {{ cwd?: string, home?: string }} [where]
 * @returns {ScopeReport}
 */
export function verifyScope(scope, { cwd = process.cwd(), home = homedir() } = {}) {
  if (scope === "project" && resolve(cwd) === resolve(home)) {
    return {
      scope,
      manifest: emptyManifest(),
      findings: [],
      skills: { present: [], missing: [] },
      brokenLinks: [],
      retiredOnDisk: [],
    };
  }

  const root = scope === "user" ? home : cwd;
  const prefix = scope === "user" ? "~/" : "";
  const manifest = readManifest(scope === "user" ? globalManifestPath(home) : projectManifestPath(cwd));
  const findings = [];
  const issue = (text) => findings.push({ level: "issue", text });
  const warn = (text) => findings.push({ level: "warn", text });
  const label = scope === "user" ? "User" : "Project";

  if (isCorruptManifest(manifest)) {
    issue(`${label} manifest is corrupt (${prefix}.balakit/installed.json) — fix or delete it, then run \`npx ${CMD}@latest doctor --fix\`.`);
  }

  const ruleNames = manifest.rules.filter((n) => n !== "mental");
  const allBlockCandidates =
    scope === "user"
      ? userBlockTargets(home).map(([, abs, key]) => [key, abs])
      : [
          ["AGENTS.md", join(cwd, "AGENTS.md")],
          ["CLAUDE.md", join(cwd, "CLAUDE.md")],
        ];

  const liveBlocks = allBlockCandidates
    .map(([key, abs]) => [key, managedBlockOf(abs)])
    .filter(([, b]) => b !== null);

  if (liveBlocks.length && !ruleNames.length && !isCorruptManifest(manifest)) {
    issue(`Live balakit block in ${liveBlocks.map(([k]) => k).join(", ")} but the ${scope} manifest lists no rules.`);
  }

  if (ruleNames.length) {
    const resolvedTargets = resolveRuleTargets({
      scope,
      agents: manifest.agents.length ? manifest.agents : undefined,
      cwd,
      home,
      surfaces: manifest.surfaces,
    });
    const expectedBlockEntries = manifest.surfaces.length
      ? allBlockCandidates.filter(([key]) => manifest.surfaces.includes(key))
      : resolvedTargets.blocks.map((b) => [b.key, b.abs]);

    const expectedText = renderRulesBlock(rulesByNames(loadRules(), ruleNames), {
      consumer: true,
      scopedPointer: (r) => `${prefix}.balakit/rules/${r.name}.md`,
    });

    for (const [shown, abs] of expectedBlockEntries) {
      const b = managedBlockOf(abs);
      if (b === null) {
        issue(`${shown} has no balakit block, but the manifest lists rules (${ruleNames.join(", ")}).`);
      } else if (b !== expectedText) {
        warn(`${shown} block differs from this balakit version (edited by hand, or written by another version). \`npx ${CMD}@latest update\` rewrites it.`);
      }
    }
  }

  for (const [key, hash] of Object.entries(manifest.files)) {
    const target = key.startsWith("~/") ? join(home, key.slice(2)) : join(cwd, key);
    if (!existsSync(target)) {
      issue(`Missing ${key}. \`npx ${CMD}@latest doctor --fix\` or \`update\` restores it.`);
      continue;
    }
    const st = statSync(target);
    const actual = st.isDirectory() ? treeSha256(target) : sha256(readFileSync(target, "utf8"));
    if (actual !== hash) {
      warn(`You changed ${key}; balakit will keep your copy unless you pass --force.`);
    }
  }

  const present = [];
  const missing = [];
  const where = { cwd, home };
  for (const name of manifest.skills.filter((s) => s !== "mental")) {
    (skillHealthy(root, scope, name, manifest.agents, where) ? present : missing).push(name);
  }
  if (missing.length) {
    issue(
      `${missing.length} recorded skill(s) missing or unlinked in ${prefix}.agents/skills: ${missing.join(", ")}. \`npx ${CMD}@latest doctor --fix\` or \`update\` restores them.`,
    );
  }

  const brokenLinks = [];
  for (const dir of allSkillLinkDirs(scope)) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      if (isDanglingLink(join(abs, entry))) brokenLinks.push(`${prefix}${dir}/${entry}`);
    }
  }
  if (brokenLinks.length) {
    issue(`Broken skill link(s): ${brokenLinks.join(", ")}. \`npx ${CMD}@latest doctor --fix\` cleans and relinks them.`);
  }

  const retiredOnDisk = findRetiredArtifacts(scope, where);
  if (retiredOnDisk.length) {
    issue(
      `Retired kit artifact(s) still on disk: ${retiredOnDisk.join(", ")}. Run \`npx ${CMD}@latest doctor --fix\` or \`update\` to prune them.`,
    );
  }

  if (hasLegacySkillsLock(scope, where)) {
    warn(
      `Legacy skills-lock.json in ${scope} scope still contains machine-local balakit paths. Run \`npx ${CMD}@latest doctor --fix\` or \`update\` to scrub it.`,
    );
  }

  return { scope, manifest, findings, skills: { present, missing }, brokenLinks, retiredOnDisk };
}

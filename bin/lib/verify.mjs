/**
 * Compare what a manifest says balakit installed with what is on disk.
 * Shared by `doctor` (health, exit code) and `status` (inventory).
 */
import { existsSync, lstatSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { BEGIN, END } from "./pkg.mjs";
import { loadRules } from "./catalog.mjs";
import { renderRulesBlock } from "./render.mjs";
import { rulesByNames, sha256 } from "./rules-install.mjs";
import { readManifest, projectManifestPath, globalManifestPath, isCorruptManifest } from "./manifest.mjs";

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
 * }} ScopeReport
 */

/** Skill folders that tools read and skills.sh may fill with links to the canonical copy. */
const LINK_DIRS = {
  project: [".claude/skills", ".cursor/skills"],
  user: [".claude/skills", ".cursor/skills", ".copilot/skills"],
};

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
 * True when a skill resolves in the shared `.agents/skills` folder or in a
 * tool folder (skills.sh copies there instead of linking in some cases).
 */
function skillPresent(root, scope, name) {
  return [".agents/skills", ...LINK_DIRS[scope]].some((d) => existsSync(join(root, d, name, "SKILL.md")));
}

/**
 * Delete dangling tool-folder links for the given skills. A dangling link
 * makes skills.sh copy into that tool folder instead of restoring the shared
 * copy, so `update` prunes them first.
 * @param {string[]} names
 * @param {"project"|"user"} scope
 * @param {{ cwd?: string, home?: string }} [where]
 * @returns {string[]} Links removed.
 */
export function pruneDanglingSkillLinks(names, scope, { cwd = process.cwd(), home = homedir() } = {}) {
  const root = scope === "user" ? home : cwd;
  const removed = [];
  for (const dir of LINK_DIRS[scope]) {
    for (const name of names) {
      const link = join(root, dir, name);
      if (isDanglingLink(link)) {
        rmSync(link);
        removed.push(`${scope === "user" ? "~/" : ""}${dir}/${name}`);
      }
    }
  }
  return removed;
}

/**
 * Check one scope against disk.
 * @param {"project"|"user"} scope
 * @param {{ cwd?: string, home?: string }} [where]
 * @returns {ScopeReport}
 */
export function verifyScope(scope, { cwd = process.cwd(), home = homedir() } = {}) {
  const root = scope === "user" ? home : cwd;
  const manifest = readManifest(scope === "user" ? globalManifestPath(home) : projectManifestPath(cwd));
  const findings = [];
  const issue = (text) => findings.push({ level: "issue", text });
  const warn = (text) => findings.push({ level: "warn", text });
  const label = scope === "user" ? "User" : "Project";

  if (isCorruptManifest(manifest)) {
    issue(`${label} manifest is corrupt (${scope === "user" ? "~/" : ""}.balakit/installed.json) — fix or delete it, then run update.`);
  }

  const ruleNames = manifest.rules.filter((n) => n !== "mental");
  const blockFiles =
    scope === "user"
      ? [".claude/CLAUDE.md", ".codex/AGENTS.md", ".config/opencode/AGENTS.md"]
      : ["AGENTS.md", "CLAUDE.md"];
  const recordedBlocks = blockFiles.filter((f) => manifest.surfaces.includes(scope === "user" ? `~/${f}` : f));
  const expectedFiles = recordedBlocks.length ? recordedBlocks : blockFiles;
  const blocks = expectedFiles.map((f) => [f, managedBlockOf(join(root, f))]);
  const live = blocks.filter(([, b]) => b !== null);

  if (live.length && !ruleNames.length && !isCorruptManifest(manifest)) {
    issue(`Live balakit block in ${live.map(([f]) => f).join(", ")} but the ${scope} manifest lists no rules.`);
  }
  if (ruleNames.length) {
    const expected = renderRulesBlock(rulesByNames(loadRules(), ruleNames), { consumer: true });
    for (const [f, b] of blocks) {
      const shown = scope === "user" ? `~/${f}` : f;
      if (b === null) issue(`${shown} has no balakit block, but the manifest lists rules (${ruleNames.join(", ")}).`);
      else if (b !== expected) warn(`${shown} block differs from this balakit version (edited by hand, or written by another version). \`update\` rewrites it.`);
    }
  }

  for (const [key, hash] of Object.entries(manifest.files)) {
    const file = key.startsWith("~/") ? join(home, key.slice(2)) : join(cwd, key);
    if (!existsSync(file)) issue(`Missing ${key}. \`update\` restores it.`);
    else if (sha256(readFileSync(file, "utf8")) !== hash) warn(`You changed ${key}; balakit will keep your copy unless you pass --force.`);
  }

  const present = [];
  const missing = [];
  for (const name of manifest.skills.filter((s) => s !== "mental")) {
    (skillPresent(root, scope, name) ? present : missing).push(name);
  }
  if (missing.length) {
    issue(`${missing.length} recorded skill(s) missing from ${scope === "user" ? "~/" : ""}.agents/skills: ${missing.join(", ")}. \`update\` reinstalls them.`);
  }

  const brokenLinks = [];
  for (const dir of LINK_DIRS[scope]) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      if (isDanglingLink(join(abs, entry))) brokenLinks.push(`${scope === "user" ? "~/" : ""}${dir}/${entry}`);
    }
  }
  if (brokenLinks.length) {
    issue(`Broken skill link(s): ${brokenLinks.join(", ")}. \`update\` relinks recorded skills; delete the rest.`);
  }

  return { scope, manifest, findings, skills: { present, missing }, brokenLinks };
}

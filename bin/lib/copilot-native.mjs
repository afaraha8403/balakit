/**
 * Copilot user-scope skill links.
 *
 * skills.sh owns files under `~/.agents/skills`. VS Code Copilot's personal
 * slash-command index is `~/.copilot/skills`, which skills.sh only writes when
 * it treats Copilot as installed — and Balakit previously had no owner for
 * that dest. This post-pass keeps the two trees in lockstep.
 */
import {
  mkdirSync,
  symlinkSync,
  lstatSync,
  rmSync,
  cpSync,
  existsSync,
  readlinkSync,
} from "node:fs";
import { join, relative } from "node:path";
import { homedir } from "node:os";

function isSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * True when user-scope Copilot should get a `~/.copilot/skills` post-pass.
 * @param {string} scope
 * @param {string[]|undefined} agentIds
 * @param {string[]|undefined} skillNames
 */
export function shouldLinkCopilotUserSkills(scope, agentIds, skillNames) {
  return scope === "user" && Boolean(skillNames?.length) && (agentIds ?? []).includes("copilot");
}

/**
 * Symlink `~/.copilot/skills/<name>` → `~/.agents/skills/<name>`.
 * Skips a dest that already exists and is not a kit symlink (no clobber).
 * Falls back to a copy when the platform refuses symlinks.
 * @param {string[]} skillNames
 * @returns {{ written: string[], notes: string[] }}
 */
export function linkCopilotUserSkills(skillNames, { home = homedir(), dryRun = false } = {}) {
  const written = [];
  const notes = [];
  if (!skillNames?.length) return { written, notes };

  const destDir = join(home, ".copilot", "skills");
  const srcDir = join(home, ".agents", "skills");
  if (!dryRun) mkdirSync(destDir, { recursive: true });

  for (const name of skillNames) {
    const target = join(srcDir, name);
    const link = join(destDir, name);
    if (!existsSync(target)) {
      notes.push(`Skipped Copilot skill link for ${name}: ${target} not present.`);
      continue;
    }
    const relTarget = relative(destDir, target);
    if (existsSync(link) || isSymlink(link)) {
      const st = lstatSync(link);
      if (st.isSymbolicLink() && readlinkSync(link) === relTarget) {
        written.push(link);
        continue;
      }
      if (!st.isSymbolicLink()) {
        notes.push(
          `Skipped Copilot skill link for ${name}: ~/.copilot/skills/${name} exists and is not a kit symlink.`,
        );
        continue;
      }
    }
    if (dryRun) {
      written.push(link);
      continue;
    }
    if (isSymlink(link)) {
      rmSync(link, { recursive: true, force: true });
    }
    try {
      symlinkSync(relTarget, link);
      written.push(link);
    } catch {
      try {
        rmSync(link, { recursive: true, force: true });
        cpSync(target, link, { recursive: true });
        written.push(link);
        notes.push(`Copied ${name} into ~/.copilot/skills (symlink unavailable).`);
      } catch (err) {
        notes.push(`Failed Copilot skill link for ${name}: ${err.message}`);
      }
    }
  }
  return { written, notes };
}

/**
 * Remove kit symlinks under `~/.copilot/skills` for the given names.
 * Leaves a real directory in place (foreign dest or copy fallback).
 * @param {string[]} skillNames
 * @returns {{ removed: string[], notes: string[] }}
 */
export function unlinkCopilotUserSkills(skillNames, { home = homedir(), dryRun = false } = {}) {
  const removed = [];
  const notes = [];
  for (const name of skillNames) {
    const link = join(home, ".copilot", "skills", name);
    if (!existsSync(link) && !isSymlink(link)) continue;
    const st = lstatSync(link);
    if (!st.isSymbolicLink()) {
      notes.push(`Left ~/.copilot/skills/${name} in place (not a kit symlink).`);
      continue;
    }
    if (!dryRun) rmSync(link, { recursive: true, force: true });
    removed.push(link);
  }
  return { removed, notes };
}

/**
 * Skill names listed in the user manifest that are absent under `~/.copilot/skills`.
 * A dangling symlink counts as missing (the dest does not resolve).
 * @param {string[]} skillNames
 * @returns {string[]}
 */
export function missingCopilotUserSkills(skillNames, { home = homedir() } = {}) {
  if (!skillNames?.length) return [];
  return skillNames.filter((name) => !existsSync(join(home, ".copilot", "skills", name)));
}

/**
 * Install manifest — tracks what balakit owns so status/remove/update work.
 *
 * Project: `.balakit/installed.json`
 * Personal/global: `~/.balakit/installed.json`
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import {
  VERSION,
  MANIFEST_SCHEMA,
  canonicalizeRuleNames,
  canonicalizeSkillNames,
  RETIRED_RULES,
  RETIRED_SKILLS,
} from "./pkg.mjs";

/**
 * @typedef {{
 *   schema: number,
 *   rules: string[],
 *   skills: string[],
 *   agents: string[],
 *   surfaces: string[],
 *   files: Record<string, string>,
 *   updatedAt: string,
 *   version: string,
 *   _migratedRules?: string[],
 *   _migratedSkills?: string[],
 * }} Manifest
 */

/** @returns {Manifest} */
export function emptyManifest() {
  return {
    schema: MANIFEST_SCHEMA,
    rules: [],
    skills: [],
    agents: [],
    surfaces: [],
    files: {},
    updatedAt: new Date().toISOString(),
    version: VERSION,
  };
}

const empty = emptyManifest;

/**
 * Normalize a raw JSON object to the current Manifest schema, translating
 * renamed/merged rule and skill slugs and recording retired slugs in transient
 * `_migratedRules` / `_migratedSkills` fields so `update` can prune disk ghosts.
 * @param {object} data
 * @returns {Manifest}
 */
export function migrateManifest(data) {
  const rawRules = Array.isArray(data.rules) ? data.rules : [];
  const rawSkills = Array.isArray(data.skills) ? data.skills : [];
  const rules = canonicalizeRuleNames(rawRules);
  const skills = canonicalizeSkillNames(rawSkills);
  const retiredRuleSet = new Set(RETIRED_RULES);
  const retiredSkillSet = new Set(RETIRED_SKILLS);
  const migratedRules = rawRules.filter((r) => retiredRuleSet.has(r));
  const migratedSkills = rawSkills.filter((s) => retiredSkillSet.has(s));

  const out = {
    schema: MANIFEST_SCHEMA,
    rules,
    skills,
    agents: Array.isArray(data.agents) ? data.agents : [],
    surfaces: Array.isArray(data.surfaces) ? data.surfaces : [],
    files: data.files && typeof data.files === "object" && !Array.isArray(data.files) ? data.files : {},
    updatedAt: data.updatedAt ?? "",
    version: data.version ?? "",
    _rawSchema: typeof data.schema === "number" ? data.schema : 1,
  };
  if (migratedRules.length) out._migratedRules = migratedRules;
  if (migratedSkills.length) out._migratedSkills = migratedSkills;
  return out;
}

export function projectManifestPath(cwd = process.cwd()) {
  return join(cwd, ".balakit", "installed.json");
}

export function globalManifestPath(home = homedir()) {
  return join(home, ".balakit", "installed.json");
}

/** @param {string} file @returns {Manifest} */
export function readManifest(file) {
  if (!existsSync(file)) return empty();
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return migrateManifest(data);
  } catch {
    return { ...empty(), _corrupt: true };
  }
}

/**
 * True when the manifest file was unreadable (treated as empty).
 * @param {Manifest & {_corrupt?: boolean}} m
 */
export function isCorruptManifest(m) {
  return m?._corrupt === true;
}

/** @param {string} file @param {Partial<Manifest>} data */
export function writeManifest(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const out = {
    schema: MANIFEST_SCHEMA,
    rules: canonicalizeRuleNames(data.rules ?? []).sort(),
    skills: canonicalizeSkillNames(data.skills ?? []).sort(),
    agents: [...new Set(data.agents ?? [])].sort(),
    surfaces: [...new Set(data.surfaces ?? [])].sort(),
    files: Object.fromEntries(Object.entries(data.files ?? {}).sort(([a], [b]) => a.localeCompare(b))),
    updatedAt: new Date().toISOString(),
    version: VERSION,
  };
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  return out;
}

/**
 * Merge or replace names in a manifest file.
 * - `patch.replaceAgents`: set the tool list instead of unioning.
 * - `patch.replaceRules` / `patch.replaceSkills` / `patch.replaceSurfaces`:
 *   replace those collections (used on `init` / `update` after pruning).
 * - `patch.dropFiles`: file hash keys removed during upgrade pruning.
 * @param {"project"|"global"} scope
 */
export function recordInstall(scope, patch, { cwd = process.cwd(), home = homedir(), dryRun = false } = {}) {
  const file = scope === "global" ? globalManifestPath(home) : projectManifestPath(cwd);
  const cur = readManifest(file);
  const dropF = new Set(patch.dropFiles ?? []);
  const mergedFiles = Object.fromEntries(
    Object.entries({ ...cur.files, ...(patch.files ?? {}) }).filter(([k]) => !dropF.has(k)),
  );
  const next = {
    rules: patch.replaceRules ? [...(patch.rules ?? [])] : [...cur.rules, ...(patch.rules ?? [])],
    skills: patch.replaceSkills ? [...(patch.skills ?? [])] : [...cur.skills, ...(patch.skills ?? [])],
    agents: patch.replaceAgents ? [...(patch.agents ?? [])] : [...(cur.agents ?? []), ...(patch.agents ?? [])],
    surfaces: patch.replaceSurfaces ? [...(patch.surfaces ?? [])] : [...(cur.surfaces ?? []), ...(patch.surfaces ?? [])],
    files: mergedFiles,
  };
  if (dryRun) return { file, ...next };
  return { file, ...writeManifest(file, next) };
}

/**
 * Remove names from a manifest file.
 * @param {"project"|"global"} scope
 */
export function recordRemove(scope, names, { cwd = process.cwd(), home = homedir(), dryRun = false } = {}) {
  const file = scope === "global" ? globalManifestPath(home) : projectManifestPath(cwd);
  const cur = readManifest(file);
  const dropR = new Set(names.rules ?? []);
  const dropS = new Set(names.skills ?? []);
  const nextRules = cur.rules.filter((r) => !dropR.has(r));
  const nextSkills = cur.skills.filter((s) => !dropS.has(s));
  const dropF = new Set(names.files ?? []);
  const dropSurf = new Set(names.surfaces ?? names.files ?? []);
  const nextFiles = Object.fromEntries(Object.entries(cur.files).filter(([k]) => !dropF.has(k)));
  const nextSurfaces = (cur.surfaces ?? []).filter((x) => !dropSurf.has(x));
  const next = {
    rules: nextRules,
    skills: nextSkills,
    agents: cur.agents ?? [],
    surfaces: nextSurfaces,
    files: nextFiles,
  };
  if (dryRun) return { file, ...next };
  if (!existsSync(file) && !cur.rules.length && !cur.skills.length) return { file, ...next };
  return { file, ...writeManifest(file, next) };
}

/**
 * File-ownership guard for a manifest: which kit-written files may be replaced.
 * A manifest that lists rules or skills but predates hashes (`legacy`) owns its
 * recorded items by name so upgrades from <=1.21.0 stay seamless.
 * @param {Manifest} m
 * @param {{ force?: boolean }} [opts]
 * @returns {import("./rules-install.mjs").FileGuard}
 */
export function guardFor(m, { force = false } = {}) {
  const files = m.files ?? {};
  const keys = Object.keys(files);
  const hasSkillHashes = keys.some((k) => k.includes(".agents/skills/"));
  return {
    files,
    legacy: (m.rules.length > 0 || m.skills.length > 0) && keys.length === 0,
    legacySkills: m.skills.length > 0 && ((m._rawSchema ?? MANIFEST_SCHEMA) < 4 || !hasSkillHashes),
    force,
  };
}

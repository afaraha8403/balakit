/**
 * Package identity, kit defaults, and upgrade migration tables.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the published package root (parent of `bin/`). */
export const PKG_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));

/** npm package name. */
export const NAME = pkg.name;

/** CLI binary name. */
export const CMD = Object.keys(pkg.bin ?? {})[0] ?? NAME;

/** Semver from package.json. */
export const VERSION = pkg.version;

/**
 * GitHub owner/repo slug, derived from package.json `repository.url`.
 */
export const REPO =
  (pkg.repository?.url ?? "")
    .replace(/^git\+/, "")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "") || NAME;

export const RULES_DIR = join(PKG_ROOT, "rules");
export const SKILLS_DIR = join(PKG_ROOT, "skills");

/**
 * Rule name aliases → canonical basenames. Keeps old CLI/manifest names working
 * after renames or merges (`global` → `base`, `release` → `base`).
 */
export const RULE_ALIASES = Object.freeze({
  global: "base",
  release: "base",
});

/** Rule basenames retired from disk; upgrade prunes their old `.mdc` / twin files. */
export const RETIRED_RULES = Object.freeze(["global", "release"]);

/**
 * Skill name aliases → canonical directory names. Supports CLI shorthand and
 * seamless upgrades across renamed or consolidated skills.
 */
export const SKILL_ALIASES = Object.freeze({
  "nlm-skill": "notebooklm",
  nlm: "notebooklm",
  "generating-app-verify": "verify-app",
  "refreshing-app-verify": "verify-app",
  "unmatched-workflow": "kit-workflows",
  workflows: "kit-workflows",
  opinion: "execute",
  "prove-safety": "proving-change-safety",
  "write-docs": "documentation-writer",
});

/** Skill directory slugs retired from disk; upgrade prunes their stale folders and links. */
export const RETIRED_SKILLS = Object.freeze([
  "nlm-skill",
  "generating-app-verify",
  "refreshing-app-verify",
  "unmatched-workflow",
  "opinion",
]);

/** Plugin directory slugs retired/renamed under `~/.cursor/plugins/local/`. */
export const RETIRED_PLUGINS = Object.freeze(["balakit-nlm"]);

/**
 * Map a user/manifest rule name to the on-disk canonical name.
 * @param {string} name
 */
export function canonicalizeRuleName(name) {
  return RULE_ALIASES[name] ?? name;
}

/**
 * Canonicalize a list of rule names, dropping retired `"mental"` and duplicates.
 * @param {string[]} names
 */
export function canonicalizeRuleNames(names) {
  return [...new Set(names.filter((n) => n && n !== "mental").map(canonicalizeRuleName))];
}

/**
 * Map a user/manifest skill name to the on-disk canonical name.
 * @param {string} name
 */
export function canonicalizeSkillName(name) {
  return SKILL_ALIASES[name] ?? name;
}

/**
 * Canonicalize a list of skill names, dropping retired `"mental"` and duplicates.
 * @param {string[]} names
 */
export function canonicalizeSkillNames(names) {
  return [...new Set(names.filter((n) => n && n !== "mental").map(canonicalizeSkillName))];
}

/** Legacy empty constants preserved for public ESM API compatibility. */
export const RULE_BUNDLED_SKILLS = Object.freeze({});
export const PERSONAL_RULES = Object.freeze([]);
export const SKILL_BUNDLED_BY = Object.freeze({});

/** Default rules installed by `balakit init` (`changelog` is path-scoped). */
export const TEAM_INIT_RULES = ["base", "testing", "comments", "changelog"];

/**
 * Default engineering skills installed by `balakit init` unless `--rules-only`.
 * Kit-meta authoring (`authoring-skills-and-rules`, `blinded-eval`), stealth
 * scraping (`cloakbrowser-fallback`), marketing, SEO, media, and NotebookLM
 * stay opt-in via `balakit add`.
 */
export const TEAM_INIT_SKILLS = Object.freeze([
  "subsystem-walkthrough",
  "design-rationale",
  "proving-change-safety",
  "kit-workflows",
  "dissect",
  "deep-deliberation",
  "inception",
  "execute",
  "trl",
  "verify-app",
  "documentation-writer",
  "release-deploy",
]);

/**
 * Packaged names from TEAM_INIT_SKILLS, or empty when `--rules-only`.
 * @param {{ name: string }[]} catalog
 * @param {{ rulesOnly?: boolean }} [opts]
 */
export function defaultInitSkills(catalog, { rulesOnly = false } = {}) {
  if (rulesOnly) return [];
  const packaged = new Set(catalog.map((s) => s.name));
  return TEAM_INIT_SKILLS.filter((n) => packaged.has(n));
}

/** Manifest schema version for ownership ledger. */
export const MANIFEST_SCHEMA = 4;

export const BEGIN = `<!-- BEGIN ${NAME} (managed — edits inside are overwritten on reinstall) -->`;
export const END = `<!-- END ${NAME} -->`;

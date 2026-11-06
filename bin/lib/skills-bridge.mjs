/**
 * Delegate skill install/remove to skills.sh (vercel-labs/skills).
 * Balakit does not own per-agent skill path maps.
 *
 * The skills CLI is a pinned dependency, run with this Node binary, and its
 * source is this package's own `skills/` tree. That keeps skills on the same
 * version as the rules, works offline, and avoids spawning `npx` (a `.cmd`
 * shim on Windows that `spawnSync` cannot run without a shell).
 *
 * `SKILLS_SH_VERIFIED_IDS` is the allowlist of `-a` targets confirmed against
 * vercel-labs/skills `src/agents.ts` (smoke-tested). Unknown ids are never
 * passed through to skills.sh.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PKG_ROOT } from "./pkg.mjs";
import { getCapability } from "./agents.mjs";

const require = createRequire(import.meta.url);
const SKILLS_PKG_DIR = dirname(require.resolve("skills/package.json"));
const skillsPkg = JSON.parse(readFileSync(join(SKILLS_PKG_DIR, "package.json"), "utf8"));

/** Version of the bundled vercel-labs `skills` CLI (exact pin in package.json). */
export const SKILLS_CLI_VERSION = skillsPkg.version;

/** Absolute path to the bundled skills CLI entry script. */
export const SKILLS_BIN = join(
  SKILLS_PKG_DIR,
  typeof skillsPkg.bin === "string" ? skillsPkg.bin : skillsPkg.bin.skills,
);

/** Minimum Node version the bundled skills CLI declares in its `engines`. */
export const SKILLS_MIN_NODE = String(skillsPkg.engines?.node ?? "").replace(/^>=\s*/, "") || "0.0.0";

/**
 * skills.sh agent names verified live against vercel-labs/skills registry.
 * Pin: SKILLS_CLI_VERSION. Refresh when adding a new skillsShId.
 */
export const SKILLS_SH_VERIFIED_IDS = Object.freeze([
  "amp",
  "claude-code",
  "cline",
  "codex",
  "continue",
  "cursor",
  "gemini-cli",
  "github-copilot",
  "junie",
  "kilo",
  "kiro-cli",
  "opencode",
  "pi",
  "roo",
  "windsurf",
  "zed",
]);

const VERIFIED = new Set(SKILLS_SH_VERIFIED_IDS);

/**
 * Map balakit agent ids → skills.sh `-a` ids that are on the verified allowlist.
 * @param {string[]} agentIds
 * @returns {{ skillsShIds: string[], skippedUnverified: string[], skippedUnsupported: string[] }}
 */
export function resolveSkillsShTargets(agentIds) {
  const skillsShIds = [];
  const skippedUnverified = [];
  const skippedUnsupported = [];
  for (const id of agentIds) {
    const cap = getCapability(id);
    const sid = cap?.skillsShId;
    if (!sid) {
      skippedUnsupported.push(id);
      continue;
    }
    if (!VERIFIED.has(sid)) {
      skippedUnverified.push(`${id}→${sid}`);
      continue;
    }
    if (!skillsShIds.includes(sid)) skillsShIds.push(sid);
  }
  return { skillsShIds, skippedUnverified, skippedUnsupported };
}

/**
 * True when `version` (x.y.z) is at least `min` (x.y.z).
 * @param {string} version
 * @param {string} min
 */
export function versionAtLeast(version, min) {
  const a = version.replace(/^v/, "").split(".").map(Number);
  const b = min.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
}

const runner = () => [process.execPath, SKILLS_BIN];

/**
 * Build the argv that installs packaged skills via the bundled skills CLI.
 * @param {string[]} skillNames
 * @param {string[]} agentIds balakit agent ids
 * @param {"project"|"global"} scope
 */
export function skillsAddArgv(skillNames, agentIds, scope) {
  const { skillsShIds } = resolveSkillsShTargets(agentIds);
  return [
    ...runner(),
    "add",
    PKG_ROOT,
    ...skillNames.flatMap((s) => ["-s", s]),
    ...skillsShIds.flatMap((a) => ["-a", a]),
    ...(scope === "global" ? ["-g"] : []),
    "-y",
  ];
}

/**
 * Build the argv that removes skills via the bundled skills CLI.
 * @param {string[]} skillNames
 * @param {"project"|"global"} scope
 */
export function skillsRemoveArgv(skillNames, scope) {
  return [...runner(), "remove", ...skillNames, ...(scope === "global" ? ["-g"] : []), "-y"];
}

/**
 * Short, human-readable form of a skills argv for review output.
 * The Node binary and package path are replaced with readable names.
 * @param {string[]} argv
 */
export function formatSkillsArgv(argv) {
  const [, , ...rest] = argv;
  const shown = rest.map((a) => (a === PKG_ROOT ? "<balakit package>" : a));
  return `skills@${SKILLS_CLI_VERSION} ${shown.join(" ")}`;
}

/**
 * Copy-pasteable shell command for the same argv (manual retry).
 * @param {string[]} argv
 */
export function shellCommand(argv) {
  const q = (s) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `"${s.replace(/(["\\$`])/g, "\\$1")}"`);
  return argv.map(q).join(" ");
}

/** Display form of the install command (tests / review). */
export function skillsAddCommand(skillNames, agentIds, scope) {
  return formatSkillsArgv(skillsAddArgv(skillNames, agentIds, scope));
}

/** Display form of the remove command (tests / review). */
export function skillsRemoveCommand(skillNames, scope) {
  return formatSkillsArgv(skillsRemoveArgv(skillNames, scope));
}

/**
 * Run a skills argv with inherited stdio. Never spawns a shell.
 * @param {string[]} argv
 * @returns {{ ok: boolean, reason?: string }}
 */
export function runSkillsArgv(argv) {
  if (!versionAtLeast(process.versions.node, SKILLS_MIN_NODE)) {
    return {
      ok: false,
      reason: `Skills need Node ${SKILLS_MIN_NODE} or newer (this is ${process.versions.node}). Rules were not affected.`,
    };
  }
  const result = spawnSync(argv[0], argv.slice(1), { stdio: "inherit" });
  if (result.error) return { ok: false, reason: result.error.message };
  return { ok: result.status === 0, reason: result.status === 0 ? undefined : `skills exited ${result.status}` };
}

/**
 * Smoke: list packaged skills while targeting the given skills.sh ids.
 * Offline (local source).
 * @param {string[]} [skillsShIds]
 * @returns {{ ok: boolean, status: number|null, stderr: string }}
 */
export function smokeSkillsShAgents(skillsShIds = SKILLS_SH_VERIFIED_IDS) {
  const argv = [...runner(), "add", PKG_ROOT, "-l", ...skillsShIds.flatMap((a) => ["-a", a]), "-y"];
  const result = spawnSync(argv[0], argv.slice(1), { encoding: "utf8" });
  return {
    ok: result.status === 0,
    status: result.status,
    stderr: (result.stderr || "") + (result.stdout || ""),
  };
}

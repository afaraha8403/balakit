/**
 * Delegate skill install/remove/update to skills.sh (vercel-labs/skills).
 * Balakit does not own per-agent skill path maps.
 *
 * `SKILLS_SH_VERIFIED_IDS` is the allowlist of `-a` targets confirmed against
 * vercel-labs/skills `src/agents.ts` (smoke-tested). Unknown ids are never
 * passed through to skills.sh.
 */
import { spawnSync } from "node:child_process";
import { REPO } from "./pkg.mjs";
import { getCapability } from "./agents.mjs";

/** npm dist-tag pin for the vercel-labs `skills` CLI. */
export const SKILLS_CLI_VERSION = "1.5.25";

/**
 * skills.sh agent names verified live against vercel-labs/skills registry.
 * Last smoke: 2026-07-18 (npx skills add … -l -a <ids>).
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

function skillsBin() {
  return `skills@${SKILLS_CLI_VERSION}`;
}

/**
 * Build an `npx skills add` argv list.
 * @param {string[]} skillNames
 * @param {string[]} agentIds balakit agent ids
 * @param {"project"|"global"} scope
 */
export function skillsAddArgv(skillNames, agentIds, scope) {
  const { skillsShIds } = resolveSkillsShTargets(agentIds);
  return [
    "npx",
    "-y",
    skillsBin(),
    "add",
    REPO,
    ...skillNames.flatMap((s) => ["-s", s]),
    ...skillsShIds.flatMap((a) => ["-a", a]),
    ...(scope === "global" ? ["-g"] : []),
    "-y",
  ];
}

/**
 * Build an `npx skills add` command string (tests / review).
 * @param {string[]} skillNames
 * @param {string[]} agentIds balakit agent ids
 * @param {"project"|"global"} scope
 */
export function skillsAddCommand(skillNames, agentIds, scope) {
  return skillsAddArgv(skillNames, agentIds, scope).join(" ");
}

/**
 * Build an `npx skills remove` argv list.
 * @param {string[]} skillNames
 * @param {"project"|"global"} scope
 */
export function skillsRemoveArgv(skillNames, scope) {
  return [
    "npx",
    "-y",
    skillsBin(),
    "remove",
    ...skillNames,
    ...(scope === "global" ? ["-g"] : []),
    "-y",
  ];
}

/**
 * Build an `npx skills remove` command string.
 * @param {string[]} skillNames
 * @param {"project"|"global"} scope
 */
export function skillsRemoveCommand(skillNames, scope) {
  return skillsRemoveArgv(skillNames, scope).join(" ");
}

/**
 * Build an `npx skills update` argv list.
 * @param {string[]} [skillNames]
 * @param {"project"|"global"} scope
 */
export function skillsUpdateArgv(skillNames, scope) {
  return [
    "npx",
    "-y",
    skillsBin(),
    "update",
    ...(skillNames?.length ? skillNames : []),
    scope === "global" ? "-g" : "-p",
    "-y",
  ];
}

/**
 * Build an `npx skills update` command string.
 * @param {string[]} [skillNames]
 * @param {"project"|"global"} scope
 */
export function skillsUpdateCommand(skillNames, scope) {
  return skillsUpdateArgv(skillNames, scope).join(" ");
}

/**
 * Run skills.sh via argv (no shell). Accepts argv or a whitespace-joined string.
 * @returns {{ ok: boolean, cmd: string }}
 */
export function runSkillsCmd(cmd, { dryRun = false } = {}) {
  const args = Array.isArray(cmd) ? cmd : String(cmd).split(/\s+/).filter(Boolean);
  const display = args.join(" ");
  if (dryRun) return { ok: true, cmd: display };
  const result = spawnSync(args[0], args.slice(1), { stdio: "inherit" });
  return { ok: result.status === 0, cmd: display };
}

/**
 * Live smoke: list package skills while targeting verified agent ids.
 * Network-dependent; used by tests / optional doctor check.
 * @param {string[]} [skillsShIds]
 * @returns {{ ok: boolean, status: number|null, stderr: string }}
 */
export function smokeSkillsShAgents(skillsShIds = SKILLS_SH_VERIFIED_IDS.slice(0, 8)) {
  const cmd = [
    "npx",
    "-y",
    skillsBin(),
    "add",
    REPO,
    "-l",
    ...skillsShIds.flatMap((a) => ["-a", a]),
    "-y",
  ];
  const result = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8" });
  return {
    ok: result.status === 0,
    status: result.status,
    stderr: (result.stderr || "") + (result.stdout || ""),
  };
}

/** Alias kept for tests / older imports. */
export const skillsCommand = skillsAddCommand;

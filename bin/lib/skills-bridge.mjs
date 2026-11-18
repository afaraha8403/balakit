/**
 * Skill target resolution and human-readable install command formatting.
 *
 * Skill placement runs natively through `skills-install.mjs` (zero external
 * subprocess, Node >=18 safe, no `skills-lock.json` machine-path pollution).
 * Existing helper names stay exported for CLI stability and tests.
 */
import { existsSync } from "node:fs";
import { SKILLS_DIR } from "./pkg.mjs";
import {
  VERIFIED_SKILL_TARGET_IDS,
  resolveSkillDestinations,
} from "./skills-install.mjs";

/** Native installer marker (replaces external skills CLI pin). */
export const SKILLS_CLI_VERSION = "native";

/**
 * Verified target ids mapped from `agents.mjs` `skillsShId`.
 */
export const SKILLS_SH_VERIFIED_IDS = VERIFIED_SKILL_TARGET_IDS;

/**
 * Map balakit agent ids → verified target ids.
 * @param {string[]} agentIds
 * @returns {{ skillsShIds: string[], skippedUnverified: string[], skippedUnsupported: string[] }}
 */
export function resolveSkillsShTargets(agentIds) {
  const { targetIds, skippedUnverified, skippedUnsupported } = resolveSkillDestinations(agentIds, "project");
  return { skillsShIds: targetIds, skippedUnverified, skippedUnsupported };
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

/**
 * Display form of the native skill install action (dry-run / tests).
 * @param {string[]} skillNames
 * @param {string[]} agentIds
 * @param {"project"|"global"} scope
 */
export function skillsAddCommand(skillNames, agentIds, scope) {
  const { skillsShIds } = resolveSkillsShTargets(agentIds);
  const flags = [
    ...skillNames.map((s) => `-s ${s}`),
    ...skillsShIds.map((a) => `-a ${a}`),
    ...(scope === "global" ? ["-g"] : []),
    "-y",
  ];
  return `balakit-skills@${SKILLS_CLI_VERSION} add <balakit package> ${flags.join(" ")}`;
}

/**
 * Display form of the native skill remove action (dry-run / tests).
 * @param {string[]} skillNames
 * @param {"project"|"global"} scope
 */
export function skillsRemoveCommand(skillNames, scope) {
  return `balakit-skills@${SKILLS_CLI_VERSION} remove ${skillNames.join(" ")}${scope === "global" ? " -g" : ""} -y`;
}

/**
 * Verify that every target id has a path spec and packaged `skills/` exists.
 * @param {string[]} [skillsShIds]
 * @returns {{ ok: boolean, status: number, stderr: string }}
 */
export function smokeSkillsShAgents(skillsShIds = SKILLS_SH_VERIFIED_IDS) {
  const verified = new Set(VERIFIED_SKILL_TARGET_IDS);
  const bad = skillsShIds.filter((id) => !verified.has(id));
  if (bad.length) {
    return { ok: false, status: 1, stderr: `Unverified target id(s): ${bad.join(", ")}` };
  }
  if (!existsSync(SKILLS_DIR)) {
    return { ok: false, status: 1, stderr: `Missing packaged skills dir: ${SKILLS_DIR}` };
  }
  return { ok: true, status: 0, stderr: "" };
}

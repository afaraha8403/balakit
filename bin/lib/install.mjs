/**
 * Plan-first install orchestration for init / add / interactive / update.
 */
import { homedir } from "node:os";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import { bundledSkillsFor } from "./catalog.mjs";
import {
  detectAgents,
  skillsCapableAgents,
  skillsUnsupportedAgents,
  getCapability,
} from "./agents.mjs";
import { installTeamRules, installUserRules, partitionRules, resolveRuleTargets } from "./rules-install.mjs";
import { skillsAddArgv, formatSkillsArgv, shellCommand, runSkillsArgv, resolveSkillsShTargets } from "./skills-bridge.mjs";
import { recordInstall, readManifest, projectManifestPath, globalManifestPath, guardFor } from "./manifest.mjs";
import { linkCursorProjectSkills, copyCursorLocalPlugins, listCursorLocalPlugins } from "./cursor-native.mjs";
import { pruneDanglingSkillLinks } from "./verify.mjs";
import {
  shouldLinkCopilotUserSkills,
  linkCopilotUserSkills,
} from "./copilot-native.mjs";

/** @typedef {"project"|"user"} InstallScope */

/**
 * True when cwd is the user home directory (npx from `~` would write AGENTS.md there).
 * @param {string} [cwd]
 * @param {string} [home]
 */
export function isHomeCwd(cwd = process.cwd(), home = homedir()) {
  return resolve(cwd) === resolve(home);
}

/**
 * Copy for refusing a project-scope install that would land in `$HOME`.
 */
export const HOME_PROJECT_INIT =
  "Refusing project init in your home directory. cd into a git repo, or pass --scope user. A leftover ~/node_modules/balakit also makes `npx balakit` run that old copy — use npx balakit@latest.";

/** Shown when a prompt is needed but stdin is not an interactive terminal. */
export const NO_TTY =
  "This step asks a question, but there is no interactive terminal (piped or CI input). Re-run with -y to accept the shown plan, or --dry-run to preview.";

/**
 * True when prompts can be answered (stdin is a TTY).
 * @param {{ isTTY?: boolean }} [stdin]
 */
export function canPrompt(stdin = process.stdin) {
  return Boolean(stdin.isTTY);
}

/**
 * Resolve agent ids: explicit flag, else the tools this install already
 * serves (manifest), else auto-detect. Detection only seeds a first install,
 * so later runs never drift to whatever folders happen to exist.
 * @param {string[]|undefined} agents
 * @param {string[]} [recorded] Manifest `agents`.
 * @returns {{ ids: string[], source: "flag"|"manifest"|"detected" }}
 */
export function resolveAgents(agents, recorded = []) {
  if (agents?.length) return { ids: agents, source: "flag" };
  if (recorded.length) return { ids: recorded, source: "manifest" };
  return { ids: detectAgents(), source: "detected" };
}

/**
 * Expand selection with bundled skills; split personal vs team.
 * @param {string[]} ruleNames
 * @param {string[]} skillNames
 * @param {Array} allRules
 */
export function planSelection(ruleNames, skillNames, allRules) {
  const bundled = bundledSkillsFor(ruleNames).filter((s) => !skillNames.includes(s));
  const skills = [...skillNames, ...bundled];
  const selectedRules = allRules.filter((r) => ruleNames.includes(r.name));
  const { personal, team } = partitionRules(selectedRules);
  return { selectedRules, personal, team, skills, bundled };
}

/**
 * Build a first-class InstallPlan (no mutation).
 * Reconciles rules with the matching scope manifest so add never shrinks
 * the managed block.
 *
 * @param {object} input
 * @param {boolean} [input.replaceAgents] `init`: the picked tools replace the recorded list (add/update union).
 * @param {boolean} [input.cursorPlugins] Copy Cursor plugin packs (user scope). Undefined keeps what is already there.
 * @returns {object} InstallPlan
 */
export function buildInstallPlan({
  ruleNames = [],
  skillNames = [],
  allRules,
  agents,
  cwd = process.cwd(),
  home,
  scope = "project",
  reconcile = true,
  replaceAgents = false,
  cursorPlugins,
} = {}) {
  const installScope = scope === "user" ? "user" : "project";
  const userHome = home ?? homedir();
  const manifest = readManifest(
    installScope === "user" ? globalManifestPath(userHome) : projectManifestPath(cwd),
  );
  const { ids: agentIds, source: agentSource } = resolveAgents(agents, manifest.agents);
  let names = [...ruleNames];
  if (reconcile) names = [...new Set([...manifest.rules, ...names])];

  const selection = planSelection(names, skillNames, allRules);
  const userRules = installScope === "user" ? selection.selectedRules : selection.personal;
  const teamRules = installScope === "user" ? [] : selection.team;

  const ruleTargets = resolveRuleTargets({
    scope: installScope,
    agents: agentIds,
    cwd,
    home: userHome,
    surfaces: manifest.surfaces,
  });

  const hasKitPlugins =
    manifest.surfaces.includes("~/.cursor/plugins/local") ||
    listCursorLocalPlugins(userHome).some((n) => n.startsWith("balakit"));
  const copyPlugins = installScope === "user" && agentIds.includes("cursor") && (cursorPlugins ?? hasKitPlugins);

  const surfaces = [];
  if (teamRules.length || userRules.length) {
    surfaces.push(...ruleTargets.blocks.map((b) => b.key));
    if (ruleTargets.cursor) surfaces.push(`${ruleTargets.cursor.keyPrefix}/*.mdc`);
  }
  if (installScope === "user" && selection.skills.length && agentIds.includes("copilot")) {
    surfaces.push("~/.copilot/skills");
  }
  if (copyPlugins) surfaces.push("~/.cursor/plugins/local");

  return {
    ...selection,
    team: teamRules,
    personal: userRules,
    agentIds,
    agentSource,
    replaceAgents,
    cursorPlugins: copyPlugins,
    ruleTargets,
    surfaces,
    ruleNames: names,
    scope: installScope,
    cwd,
    home,
    manifest,
  };
}

/**
 * Format review lines for an InstallPlan: what, for which tools, and every
 * file or folder that will be written.
 * @param {object} plan
 * @param {{ dryRun?: boolean }} [opts]
 */
export function formatPlanReview(plan, { dryRun = false } = {}) {
  const lines = [];
  const user = plan.scope === "user";
  const label = (id) => getCapability(id)?.label ?? id;
  const sourceNote = {
    flag: "from --agents",
    picked: "picked in setup",
    manifest: "as recorded last time",
    detected: "detected — pass --agents to choose",
  };
  lines.push(`Scope: ${user ? "this machine (all projects)" : "this repo"}`);
  lines.push(`Tools: ${plan.agentIds.map(label).join(", ")}  (${sourceNote[plan.agentSource] ?? plan.agentSource})`);
  const rules = [...plan.team, ...plan.personal];
  if (rules.length) lines.push(`Rules (${rules.length}): ${rules.map((r) => r.name).join(", ")}`);
  if (plan.skills.length) {
    const tag = (s) => (plan.bundled.includes(s) ? `${s} (bundled)` : s);
    lines.push(`Skills (${plan.skills.length}): ${plan.skills.map(tag).join(", ")}`);
  }

  lines.push("", "Files:");
  const t = plan.ruleTargets;
  if (rules.length && t) {
    for (const b of t.blocks) lines.push(`  ${b.key}  ← managed block for ${b.tools.map(label).join(", ")}`);
    if (t.cursor) lines.push(`  ${t.cursor.keyPrefix}/<rule>.mdc  ← Cursor (${rules.length} file(s); files you changed are kept)`);
    if (rules.some((r) => !r.always)) {
      if (t.twins.claude) lines.push("  .claude/rules/<scoped rule>.md  ← Claude Code");
      if (t.twins.copilot) lines.push("  .github/instructions/<scoped rule>.instructions.md  ← GitHub Copilot");
    }
    if (t.unserved.length) lines.push(`  (no standing-rule file at this scope for ${t.unserved.map(label).join(", ")})`);
  }
  if (plan.skills.length) {
    const capable = skillsCapableAgents(plan.agentIds);
    const root = user ? "~/.agents/skills" : ".agents/skills";
    lines.push(`  ${root}/<skill>  ← shared copy; skills.sh links or copies it for ${capable.map(label).join(", ") || "(no tool can take skills)"}`);
    if (!user && plan.agentIds.includes("cursor")) lines.push("  .cursor/skills/<skill>  → link to .agents/skills");
    if (user && plan.agentIds.includes("copilot")) lines.push("  ~/.copilot/skills/<skill>  → link to ~/.agents/skills");
    const none = skillsUnsupportedAgents(plan.agentIds);
    if (none.length) lines.push(`  (no skills for ${none.map(label).join(", ")}: rules only)`);
  }
  if (plan.cursorPlugins) lines.push("  ~/.cursor/plugins/local/balakit-*  ← every Cursor plugin pack (--cursor-plugins)");
  if (!user && !plan.skills.length && !rules.length) lines.push("  (nothing)");
  if (dryRun) lines.unshift("[dry-run]");
  return lines;
}

/**
 * Execute an InstallPlan. No mutation before review/confirm.
 * The manifest records rules and file hashes as they are written, but the
 * tool list only after the whole run succeeds, so a failed target is never
 * remembered for later `add` / `update` runs.
 * @param {object} plan From `buildInstallPlan`.
 * @param {{ dryRun?: boolean, yes?: boolean, review?: boolean, force?: boolean }} [opts]
 * @returns {Promise<{ cancelled: boolean, ok: boolean, noTty?: boolean, agents?: string[], partial?: boolean }>}
 */
export async function runInstallPlan(plan, { dryRun = false, yes = false, review = true, force = false } = {}) {
  if (review) {
    p.note(formatPlanReview(plan, { dryRun }).join("\n"), dryRun ? "Review (dry-run)" : "Review");

    if (!yes && !dryRun) {
      if (!canPrompt()) {
        p.log.error(NO_TTY);
        return { cancelled: true, ok: false, noTty: true };
      }
      const go = await p.confirm({ message: "Install now?" });
      if (p.isCancel(go) || !go) {
        p.cancel("Cancelled.");
        return { cancelled: true, ok: false };
      }
    }
  }

  const notes = [];
  let skillsFailed = false;
  const agentIds = plan.agentIds;
  const scope = plan.scope === "user" ? "user" : "project";
  const manifestScope = scope === "user" ? "global" : "project";
  const where = { cwd: plan.cwd, home: plan.home };
  const guard = guardFor(plan.manifest ?? readManifest(scope === "user" ? globalManifestPath(plan.home) : projectManifestPath(plan.cwd)), { force });

  const writeRules = (rules, install, label) => {
    if (!rules.length) return;
    const s = p.spinner();
    s.start(dryRun ? `Resolving ${label} targets` : `Installing ${label}`);
    const r = install(rules);
    s.stop(dryRun ? `Would write ${r.written.length} file(s)` : `${label[0].toUpperCase()}${label.slice(1)} installed (${r.written.length} file(s))`);
    if (r.written.length) p.note(r.written.join("\n"), dryRun ? "Would write" : "Wrote");
    notes.push(...r.notes);
    if (!dryRun) {
      recordInstall(manifestScope, { rules: rules.map((x) => x.name), surfaces: r.surfaces, files: r.files }, where);
    }
  };

  const recorded = plan.manifest?.surfaces ?? [];
  writeRules(plan.team, (rules) => installTeamRules(rules, { dryRun, agents: agentIds, cwd: plan.cwd, guard, surfaces: recorded }), "project rules");
  writeRules(plan.personal, (rules) => installUserRules(rules, { dryRun, agents: agentIds, home: plan.home, guard, surfaces: recorded }), "user-wide rules");

  if (notes.length) p.note([...new Set(notes)].join("\n\n"), "Heads-up");

  const runSkillBatch = (names, skillScope) => {
    if (!names.length) return true;
    const noSkills = skillsUnsupportedAgents(agentIds);
    if (noSkills.length) {
      p.log.warn(`These tools cannot take skills (rules only): ${noSkills.join(", ")}.`);
    }
    const capable = skillsCapableAgents(agentIds);
    const { skillsShIds, skippedUnverified } = resolveSkillsShTargets(capable);
    if (skippedUnverified.length) {
      p.log.warn(`Skipped tools whose skills.sh id is not verified: ${skippedUnverified.join(", ")}.`);
    }
    if (!skillsShIds.length) {
      p.log.error("None of the selected tools can receive skills. Skills were not installed.");
      return false;
    }
    const argv = skillsAddArgv(names, capable, skillScope);
    if (dryRun) {
      p.log.step(`Would install ${names.length} skill(s) from this package:\n${formatSkillsArgv(argv)}`);
      return true;
    }
    const pruned = pruneDanglingSkillLinks(names, scope, where);
    if (pruned.length) p.log.info(`Removed broken skill link(s) first: ${pruned.join(", ")}`);
    p.log.step(`Installing ${names.length} skill(s) from this package (${formatSkillsArgv(argv).split(" ")[0]})`);
    const result = runSkillsArgv(argv);
    if (!result.ok) {
      p.log.error(`Skills did not install: ${result.reason}. To retry by hand:`);
      p.log.message(shellCommand(argv));
      return false;
    }
    recordInstall(skillScope, { skills: names }, where);
    return true;
  };

  if (!runSkillBatch(plan.skills, manifestScope)) skillsFailed = true;

  if (!skillsFailed && plan.skills.length && scope === "project" && agentIds.includes("cursor")) {
    const linked = linkCursorProjectSkills(plan.skills, { dryRun, cwd: plan.cwd });
    if (linked.written.length) {
      p.note(linked.written.join("\n"), dryRun ? "Would link Cursor skills" : "Cursor skill links");
    }
    notes.push(...linked.notes);
  }

  if (plan.cursorPlugins) {
    const copied = copyCursorLocalPlugins({ dryRun, home: plan.home ?? homedir() });
    if (copied.written.length) {
      p.note(copied.written.join("\n"), dryRun ? "Would copy Cursor plugins" : "Cursor local plugins");
    }
    notes.push(...copied.notes);
    if (!dryRun) recordInstall("global", { surfaces: ["~/.cursor/plugins/local"] }, { home: plan.home ?? homedir() });
  }

  if (!skillsFailed && shouldLinkCopilotUserSkills(scope, agentIds, plan.skills)) {
    const linked = linkCopilotUserSkills(plan.skills, { dryRun, home: plan.home ?? homedir() });
    if (linked.written.length) {
      p.note(linked.written.join("\n"), dryRun ? "Would link Copilot skills" : "Copilot skill links");
    }
    notes.push(...linked.notes);
    if (!dryRun && linked.written.length) {
      recordInstall("global", { surfaces: ["~/.copilot/skills"] }, { home: plan.home ?? homedir() });
    }
  }

  if (!dryRun && !skillsFailed) {
    recordInstall(manifestScope, { agents: agentIds, replaceAgents: plan.replaceAgents }, where);
    const receipt = [];
    if (plan.team.length) {
      receipt.push(`Project rules: ${plan.team.map((r) => r.name).join(", ")}`);
    }
    if (plan.personal.length) {
      receipt.push(`User-wide rules: ${plan.personal.map((r) => r.name).join(", ")}`);
    }
    if (plan.skills.length) receipt.push(`Skills: ${plan.skills.join(", ")}`);
    if (plan.cursorPlugins) {
      receipt.push("Cursor plugins copied to ~/.cursor/plugins/local — reload the window");
    }
    if (shouldLinkCopilotUserSkills(scope, agentIds, plan.skills)) {
      receipt.push("Copilot skills linked at ~/.copilot/skills → ~/.agents/skills — reload VS Code");
    }
    if (receipt.length) p.note(receipt.join("\n"), "Installed");
  }

  return {
    cancelled: false,
    ok: !skillsFailed,
    partial: skillsFailed,
    agents: agentIds,
    scope,
  };
}

/** Describe selected tools briefly for the wizard. */
export function describeSelectedTools(agentIds) {
  return agentIds.map((id) => {
    const c = getCapability(id);
    if (!c) return id;
    return `${c.label} (rules=${c.rulesConfidence}, skills=${c.skillsShId ? c.agentSkills : "n/a"})`;
  });
}

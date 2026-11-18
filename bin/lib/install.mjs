/**
 * Plan-first install orchestration for init / add / interactive / update / doctor --fix.
 */
import { homedir } from "node:os";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import { RETIRED_SKILLS } from "./pkg.mjs";
import { bundledSkillsFor } from "./catalog.mjs";
import {
  detectAgents,
  skillsCapableAgents,
  skillsUnsupportedAgents,
  getCapability,
} from "./agents.mjs";
import {
  installTeamRules,
  installUserRules,
  partitionRules,
  resolveRuleTargets,
  pruneStaleRuleArtifacts,
} from "./rules-install.mjs";
import { resolveSkillsShTargets } from "./skills-bridge.mjs";
import {
  installSkills,
  removeSkills,
  pruneDroppedAgentSkillLinks,
  resolveSkillDestinations,
  cleanLegacySkillsLock,
} from "./skills-install.mjs";
import { recordInstall, readManifest, projectManifestPath, globalManifestPath, guardFor } from "./manifest.mjs";
import { copyCursorLocalPlugins, listCursorLocalPlugins, pruneRetiredCursorPlugins } from "./cursor-native.mjs";
import { pruneDanglingSkillLinks } from "./verify.mjs";

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
  "Refusing project operation in your home directory. cd into a git repo, or pass --scope user. A leftover ~/node_modules/balakit also makes `npx balakit` run that old copy — use npx balakit@latest.";

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
 * the managed block, unless `replaceSelection` is set (guided re-init).
 *
 * @param {object} input
 * @param {boolean} [input.replaceAgents] `init`: the picked tools replace the recorded list (add/update union).
 * @param {boolean} [input.replaceSelection] `init` / `update`: replace rule & skill sets and prune dropped items.
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
  replaceSelection = false,
  cursorPlugins,
} = {}) {
  const installScope = scope === "user" ? "user" : "project";
  const userHome = home ?? homedir();
  const manifest = readManifest(
    installScope === "user" ? globalManifestPath(userHome) : projectManifestPath(cwd),
  );
  const { ids: agentIds, source: agentSource } = resolveAgents(agents, manifest.agents);
  let names = [...ruleNames];
  if (reconcile && !replaceSelection) names = [...new Set([...manifest.rules, ...names])];

  const selection = planSelection(names, skillNames, allRules);
  const userRules = installScope === "user" ? selection.selectedRules : selection.personal;
  const teamRules = installScope === "user" ? [] : selection.team;

  const ruleTargets = resolveRuleTargets({
    scope: installScope,
    agents: agentIds,
    cwd,
    home: userHome,
    surfaces: manifest.surfaces,
    pruneUnselected: replaceAgents || replaceSelection,
  });

  const hasKitPlugins =
    manifest.surfaces.includes("~/.cursor/plugins/local") ||
    listCursorLocalPlugins(userHome).some((n) => n.startsWith("balakit"));
  const copyPlugins = installScope === "user" && agentIds.includes("cursor") && (cursorPlugins ?? hasKitPlugins);

  const surfaces = [];
  const activeRules = [...teamRules, ...userRules];
  if (activeRules.length) {
    surfaces.push(...ruleTargets.blocks.map((b) => b.key));
    if (ruleTargets.cursor) {
      const mdcCount = ruleTargets.cursor.scopedOnly ? activeRules.filter((r) => !r.always).length : activeRules.length;
      if (mdcCount > 0) surfaces.push(`${ruleTargets.cursor.keyPrefix}/*.mdc`);
    }
  }
  if (selection.skills.length) {
    const prefix = installScope === "user" ? "~/" : "";
    const { linkDirs } = resolveSkillDestinations(agentIds, installScope);
    surfaces.push(`${prefix}.agents/skills`, ...linkDirs.map((d) => `${prefix}${d}`));
  }
  if (copyPlugins) surfaces.push("~/.cursor/plugins/local");

  return {
    ...selection,
    team: teamRules,
    personal: userRules,
    agentIds,
    agentSource,
    replaceAgents,
    replaceSelection,
    cursorPlugins: copyPlugins,
    ruleTargets,
    surfaces,
    ruleNames: names,
    scope: installScope,
    cwd,
    home: userHome,
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
    if (t.cursor) {
      const cursorRules = t.cursor.scopedOnly ? rules.filter((r) => !r.always) : rules;
      if (cursorRules.length) {
        const note = t.cursor.scopedOnly ? "scoped rules only; always-on rules read once from AGENTS.md" : `${cursorRules.length} file(s); files you changed are kept`;
        lines.push(`  ${t.cursor.keyPrefix}/<rule>.mdc  ← Cursor (${note})`);
      }
    }
    if (rules.some((r) => !r.always)) {
      if (t.blocks.length) lines.push(`  ${user ? "~/" : ""}.balakit/rules/<scoped rule>.md  ← on-demand scoped reference`);
      if (t.twins.claude) lines.push("  .claude/rules/<scoped rule>.md  ← Claude Code");
      if (t.twins.copilot) lines.push("  .github/instructions/<scoped rule>.instructions.md  ← GitHub Copilot");
    }
    if (t.unserved.length) lines.push(`  (no standing-rule file at this scope for ${t.unserved.map(label).join(", ")})`);
  }
  if (plan.skills.length) {
    const capable = skillsCapableAgents(plan.agentIds);
    const prefix = user ? "~/" : "";
    const { linkDirs } = resolveSkillDestinations(plan.agentIds, plan.scope);
    lines.push(`  ${prefix}.agents/skills/<skill>  ← canonical store for ${capable.map(label).join(", ") || "(no tool can take skills)"}`);
    for (const d of linkDirs) {
      lines.push(`  ${prefix}${d}/<skill>  → link to ${prefix}.agents/skills`);
    }
    const none = skillsUnsupportedAgents(plan.agentIds);
    if (none.length) lines.push(`  (no skills for ${none.map(label).join(", ")}: rules only)`);
  }
  if (plan.cursorPlugins) lines.push("  ~/.cursor/plugins/local/balakit-*  ← every Cursor plugin pack (--cursor-plugins)");
  if (!user && !plan.skills.length && !rules.length) lines.push("  (nothing)");
  if (dryRun) lines.unshift("[dry-run]");
  return lines;
}

/**
 * Sweep retired skills, rules, plugins, dangling links, and legacy lockfile
 * entries for one scope even when no new items are being installed.
 */
export function sweepRetiredScope(
  scope,
  {
    cwd = process.cwd(),
    home = homedir(),
    dryRun = false,
    force = false,
    activeRules = [],
    activeSkills = [],
    activeAgents,
    manifest: preUpgradeManifest,
    guard: preUpgradeGuard,
  } = {},
) {
  const installScope = scope === "user" ? "user" : "project";
  const manifestScope = installScope === "user" ? "global" : "project";
  const manifest =
    preUpgradeManifest ?? readManifest(installScope === "user" ? globalManifestPath(home) : projectManifestPath(cwd));
  const guard = preUpgradeGuard ?? guardFor(manifest, { force });
  const root = installScope === "user" ? home : cwd;
  const removed = [];
  const droppedFiles = [];

  const skillsToDrop = new Set(RETIRED_SKILLS.filter((s) => s !== "mental"));
  if (activeSkills.length) {
    for (const s of manifest.skills) {
      if (!activeSkills.includes(s)) skillsToDrop.add(s);
    }
  }
  if (skillsToDrop.size) {
    const res = removeSkills([...skillsToDrop], { scope: installScope, cwd, home, dryRun, guard });
    removed.push(...res.removed);
    droppedFiles.push(...res.droppedKeys);
  }

  if (activeAgents?.length) {
    const prunedLinks = pruneDroppedAgentSkillLinks(
      activeSkills.length ? activeSkills : manifest.skills,
      activeAgents,
      installScope,
      { cwd, home, dryRun, files: manifest.files },
    );
    removed.push(...prunedLinks.removed);
    droppedFiles.push(...prunedLinks.droppedKeys);
  }

  const targets = resolveRuleTargets({
    scope: installScope,
    agents: activeAgents ?? (manifest.agents.length ? manifest.agents : undefined),
    cwd,
    home,
    surfaces: manifest.surfaces,
    pruneUnselected: Boolean(activeAgents?.length),
  });
  const prunedRules = pruneStaleRuleArtifacts({
    scope: installScope,
    activeRules,
    targets,
    cwd,
    home,
    guard,
    dryRun,
  });
  removed.push(...prunedRules.removed);
  droppedFiles.push(...prunedRules.droppedFiles);

  if (!dryRun) {
    const dangling = pruneDanglingSkillLinks(null, installScope, { cwd, home });
    removed.push(...dangling);
    if (cleanLegacySkillsLock(root)) {
      removed.push(`${installScope === "user" ? "~/" : ""}skills-lock.json (balakit entries)`);
    }
    if (installScope === "user") {
      const retiredPlugins = pruneRetiredCursorPlugins({ home, dryRun });
      removed.push(...retiredPlugins);
    }
    if (droppedFiles.length && (manifest.rules.length || manifest.skills.length)) {
      recordInstall(manifestScope, { dropFiles: droppedFiles }, { cwd, home });
    }
  }

  return { removed: [...new Set(removed)], droppedFiles: [...new Set(droppedFiles)] };
}

/**
 * Execute an InstallPlan. No mutation before review/confirm.
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
  const userHome = plan.home ?? homedir();
  const where = { cwd: plan.cwd, home: userHome };
  const curManifest =
    plan.manifest ?? readManifest(scope === "user" ? globalManifestPath(userHome) : projectManifestPath(plan.cwd));
  const guard = guardFor(curManifest, { force });
  const pruneUnselected = Boolean(plan.replaceAgents || plan.replaceSelection);

  const accumulatedSurfaces = [];
  const droppedFiles = [];

  const writeRules = (rules, install, label) => {
    if (!rules.length) return;
    const s = p.spinner();
    s.start(dryRun ? `Resolving ${label} targets` : `Installing ${label}`);
    const r = install(rules);
    s.stop(dryRun ? `Would write ${r.written.length} file(s)` : `${label[0].toUpperCase()}${label.slice(1)} installed (${r.written.length} file(s))`);
    if (r.written.length) p.note(r.written.join("\n"), dryRun ? "Would write" : "Wrote");
    if (r.removed?.length) p.note(r.removed.join("\n"), dryRun ? "Would prune stale rule files" : "Pruned stale rule files");
    notes.push(...r.notes);
    accumulatedSurfaces.push(...r.surfaces);
    droppedFiles.push(...(r.droppedFiles ?? []));
    if (!dryRun) {
      recordInstall(
        manifestScope,
        {
          rules: rules.map((x) => x.name),
          replaceRules: Boolean(plan.replaceSelection),
          surfaces: r.surfaces,
          files: r.files,
          dropFiles: r.droppedFiles,
        },
        where,
      );
    }
  };

  const recorded = curManifest.surfaces ?? [];
  writeRules(
    plan.team,
    (rules) =>
      installTeamRules(rules, {
        dryRun,
        agents: agentIds,
        cwd: plan.cwd,
        guard,
        surfaces: recorded,
        pruneUnselected,
      }),
    "project rules",
  );
  writeRules(
    plan.personal,
    (rules) =>
      installUserRules(rules, {
        dryRun,
        agents: agentIds,
        home: userHome,
        guard,
        surfaces: recorded,
        pruneUnselected,
      }),
    "user-wide rules",
  );

  const runSkillBatch = (names) => {
    if (!names.length) return true;
    const noSkills = skillsUnsupportedAgents(agentIds);
    if (noSkills.length) {
      p.log.warn(`These tools cannot take skills (rules only): ${noSkills.join(", ")}.`);
    }
    const capable = skillsCapableAgents(agentIds);
    const { skillsShIds, skippedUnverified } = resolveSkillsShTargets(capable);
    if (skippedUnverified.length) {
      p.log.warn(`Skipped tools whose skill path is not verified: ${skippedUnverified.join(", ")}.`);
    }
    if (!skillsShIds.length) {
      p.log.error("None of the selected tools can receive skills. Skills were not installed.");
      return false;
    }
    if (!dryRun) {
      const pruned = pruneDanglingSkillLinks(names, scope, where);
      if (pruned.length) p.log.info(`Removed broken skill link(s) first: ${pruned.join(", ")}`);
    }
    const s = p.spinner();
    s.start(dryRun ? `Resolving ${names.length} skill destination(s)` : `Installing ${names.length} skill(s)`);
    const result = installSkills(names, {
      agentIds: capable,
      scope,
      cwd: plan.cwd,
      home: userHome,
      dryRun,
      guard,
    });
    if (!result.ok) {
      s.stop("Skill installation failed");
      p.log.error(`Skills did not install: ${result.reason}`);
      return false;
    }
    s.stop(
      dryRun
        ? `Would write/link ${result.written.length} skill path(s)`
        : `Skills installed (${names.length} skill(s), ${result.written.length} path(s))`,
    );
    notes.push(...result.notes);
    accumulatedSurfaces.push(...result.surfaces);
    if (!dryRun) {
      recordInstall(
        manifestScope,
        {
          skills: names,
          replaceSkills: Boolean(plan.replaceSelection),
          surfaces: result.surfaces,
          files: result.files,
        },
        where,
      );
    }
    return true;
  };

  if (!runSkillBatch(plan.skills)) skillsFailed = true;

  if (plan.cursorPlugins) {
    const copied = copyCursorLocalPlugins({ dryRun, home: userHome });
    if (copied.written.length) {
      p.note(copied.written.join("\n"), dryRun ? "Would copy Cursor plugins" : "Cursor local plugins");
    }
    notes.push(...copied.notes);
    accumulatedSurfaces.push("~/.cursor/plugins/local");
    if (!dryRun) recordInstall("global", { surfaces: ["~/.cursor/plugins/local"] }, { home: userHome });
  } else if (scope === "user" && !dryRun) {
    pruneRetiredCursorPlugins({ home: userHome });
  }

  if (!skillsFailed && (plan.replaceSelection || plan.replaceAgents)) {
    const swept = sweepRetiredScope(scope, {
      cwd: plan.cwd,
      home: userHome,
      dryRun,
      force,
      activeRules: [...plan.team, ...plan.personal],
      activeSkills: plan.skills,
      activeAgents: pruneUnselected ? agentIds : undefined,
      manifest: curManifest,
      guard,
    });
    if (swept.removed.length) {
      p.note(swept.removed.join("\n"), dryRun ? "Would prune retired/dropped artifacts" : "Pruned retired/dropped artifacts");
    }
    droppedFiles.push(...swept.droppedFiles);
  }

  if (notes.length) p.note([...new Set(notes)].join("\n\n"), "Heads-up");

  if (!dryRun && !skillsFailed) {
    recordInstall(
      manifestScope,
      {
        agents: agentIds,
        replaceAgents: plan.replaceAgents,
        ...(pruneUnselected ? { surfaces: [...new Set(accumulatedSurfaces)], replaceSurfaces: true } : {}),
        dropFiles: droppedFiles,
      },
      where,
    );
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
    if (scope === "user" && plan.skills.length && agentIds.includes("copilot")) {
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

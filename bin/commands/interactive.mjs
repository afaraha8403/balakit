/**
 * Guided setup: scope → tools → kit → (Cursor plugin packs) → review → apply.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION, TEAM_INIT_RULES, SKILL_BUNDLED_BY, defaultInitSkills } from "../lib/pkg.mjs";
import { loadRules, loadSkills, trunc } from "../lib/catalog.mjs";
import {
  buildInstallPlan,
  runInstallPlan,
  isHomeCwd,
  HOME_PROJECT_INIT,
  canPrompt,
  NO_TTY,
} from "../lib/install.mjs";
import { detectedAgents, AGENT_IDS, getCapability, DEFAULT_AGENT_IDS } from "../lib/agents.mjs";
import { readManifest, projectManifestPath, globalManifestPath } from "../lib/manifest.mjs";
import { cmdUpdate } from "./status.mjs";

/** What one tool receives, in plain words, for the tool picker. */
function toolHint(id, scope) {
  const c = getCapability(id);
  const rules =
    scope === "user"
      ? { "claude-code": "~/.claude/CLAUDE.md", codex: "~/.codex/AGENTS.md", opencode: "~/.config/opencode/AGENTS.md", cursor: "~/.cursor/rules" }[id] ?? "no user-wide rules file"
      : { "claude-code": "CLAUDE.md", cursor: "AGENTS.md + .cursor/rules" }[id] ?? (c.standing === "agents-md" ? "AGENTS.md" : "no rules file");
  const skills = c.skillsShId ? "skills" : "no skills";
  return `rules → ${rules}; ${skills}`;
}

/**
 * Stop with a cancel message when the user pressed Esc / Ctrl-C.
 * @returns {boolean} True when cancelled.
 */
function cancelled(value) {
  if (!p.isCancel(value)) return false;
  p.cancel("Cancelled. Nothing written.");
  return true;
}

/**
 * @param {{
 *   agents?: string[],
 *   dryRun?: boolean,
 *   yes?: boolean,
 *   scope?: "project"|"user",
 *   rulesOnly?: boolean,
 *   force?: boolean,
 *   cursorPlugins?: boolean,
 * }} opts
 */
export async function cmdInteractive(opts = {}) {
  const allRules = loadRules();
  const allSkills = loadSkills();

  p.intro(`${CMD} v${VERSION} — guided setup${opts.dryRun ? "  [dry-run]" : ""}`);
  if (!opts.yes && !canPrompt()) {
    p.log.error(NO_TTY);
    p.outro("Nothing written.");
    return 2;
  }

  const atHome = isHomeCwd();
  let scope = opts.scope;
  if (!scope && opts.yes) scope = "project";
  if (!scope) {
    const picked = await p.select({
      message: "Install for this repo, or for every project on this machine?",
      options: [
        ...(atHome ? [] : [{ value: "project", label: "This repo", hint: "files go in this folder; commit them for your team" }]),
        { value: "user", label: "This machine (all projects)", hint: "files go in your home folder; only you get them" },
      ],
    });
    if (cancelled(picked)) return 1;
    scope = picked;
  }
  if (scope !== "user" && atHome) {
    p.log.error(HOME_PROJECT_INIT);
    p.outro("Nothing written.");
    return 1;
  }

  const manifest = readManifest(scope === "user" ? globalManifestPath() : projectManifestPath());
  const installed = manifest.rules.length + manifest.skills.length > 0;

  let kit = opts.rulesOnly ? "rules" : opts.yes ? "recommended" : null;
  if (!kit) {
    const picked = await p.select({
      message: installed
        ? `Already installed here: ${manifest.rules.length} rule(s), ${manifest.skills.length} skill(s). What now?`
        : "What should be installed?",
      options: [
        ...(installed
          ? [{ value: "refresh", label: "Refresh what's installed", hint: "same rules, skills and tools; repairs anything missing" }]
          : []),
        {
          value: "recommended",
          label: "Recommended set",
          hint: `${TEAM_INIT_RULES.length} standing rules + ${defaultInitSkills(allSkills).length} engineering skills`,
        },
        { value: "rules", label: "Rules only", hint: TEAM_INIT_RULES.join(", ") },
        { value: "pick", label: "Let me pick rules and skills", hint: "starts with the recommended set ticked" },
      ],
    });
    if (cancelled(picked)) return 1;
    kit = picked;
  }
  if (kit === "refresh") {
    return cmdUpdate({ ...opts, scope, yes: false });
  }

  const detected = detectedAgents();
  const startTools = opts.agents?.length
    ? opts.agents
    : manifest.agents.length
      ? manifest.agents
      : detected.length
        ? detected
        : DEFAULT_AGENT_IDS;
  let agentIds = startTools;
  if (!opts.agents?.length && !opts.yes) {
    const confirmed = await p.multiselect({
      message: `Which tools do you use? ${
        manifest.agents.length || detected.length ? "" : "(none detected, so common ones are ticked) "
      }Space toggles, Enter confirms.`,
      options: AGENT_IDS.map((id) => {
        const c = getCapability(id);
        const tag = manifest.agents.includes(id) ? " · installed" : detected.includes(id) ? " · detected" : "";
        return { value: id, label: c.label, hint: `${toolHint(id, scope)}${tag}` };
      }),
      initialValues: startTools,
      required: true,
    });
    if (cancelled(confirmed)) return 1;
    agentIds = confirmed;
  }

  let ruleNames = TEAM_INIT_RULES.filter((n) => allRules.some((r) => r.name === n));
  let skillNames = kit === "rules" ? [] : defaultInitSkills(allSkills);
  if (kit === "pick") {
    const ticked = [
      ...new Set([...ruleNames, ...manifest.rules].map((n) => `rule:${n}`)),
      ...new Set([...skillNames, ...manifest.skills].map((n) => `skill:${n}`)),
    ];
    const picked = await p.groupMultiselect({
      message: "Pick what to install (space to toggle, enter to confirm)",
      options: {
        Rules: allRules.map((r) => ({ value: `rule:${r.name}`, label: r.name, hint: trunc(r.description, 64) })),
        Skills: allSkills.map((s) => ({
          value: `skill:${s.name}`,
          label: s.name,
          hint: SKILL_BUNDLED_BY[s.name]
            ? `auto-installs with the ${SKILL_BUNDLED_BY[s.name].join("/")} rule`
            : trunc(s.description, 64),
        })),
      },
      initialValues: ticked,
      required: true,
    });
    if (cancelled(picked)) return 1;
    ruleNames = picked.filter((v) => v.startsWith("rule:")).map((v) => v.slice(5));
    skillNames = picked.filter((v) => v.startsWith("skill:")).map((v) => v.slice(6));
  }

  let cursorPlugins = opts.cursorPlugins;
  if (cursorPlugins === undefined && scope === "user" && agentIds.includes("cursor") && !opts.yes) {
    const go = await p.confirm({
      message: "Also copy every balakit plugin pack into Cursor (marketing, SEO, media, …)?",
      initialValue: false,
    });
    if (cancelled(go)) return 1;
    cursorPlugins = go;
  }

  const plan = buildInstallPlan({
    ruleNames,
    skillNames,
    allRules,
    agents: agentIds,
    scope,
    replaceAgents: true,
    cursorPlugins,
  });
  if (!opts.agents?.length && !opts.yes) plan.agentSource = "picked";

  if (plan.bundled.length) {
    p.log.info(plan.bundled.map((s) => `${s} skill added automatically (bundled with its rule)`).join("\n"));
  }
  if (!plan.selectedRules.length && !plan.skills.length) {
    p.cancel("Nothing selected.");
    return 1;
  }

  const result = await runInstallPlan(plan, { dryRun: opts.dryRun, yes: opts.yes, force: opts.force });
  if (result?.cancelled) return result.noTty ? 2 : 1;
  if (!result?.ok) {
    p.outro("Finished with errors — see above (partial install).");
    return 1;
  }

  p.outro(
    opts.dryRun
      ? "Dry-run complete — nothing written."
      : `Done. Reload your editor, then run \`npx ${CMD} doctor\`.`,
  );
  return 0;
}

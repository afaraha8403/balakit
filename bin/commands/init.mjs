/**
 * `balakit init` — guided setup, or non-interactive with flags + -y.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION, TEAM_INIT_RULES, defaultInitSkills } from "../lib/pkg.mjs";
import { loadRules, loadSkills } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan, isHomeCwd, HOME_PROJECT_INIT } from "../lib/install.mjs";
import { cmdInteractive } from "./interactive.mjs";
import { cmdAdd } from "./add.mjs";

/**
 * @param {{
 *   agents?: string[],
 *   dryRun?: boolean,
 *   yes?: boolean,
 *   scope?: "project"|"user",
 *   rulesOnly?: boolean,
 *   force?: boolean,
 *   names?: string[],
 *   cursorPlugins?: boolean,
 * }} opts
 */
export async function cmdInit(opts = {}) {
  if (opts.scope !== "user" && isHomeCwd()) {
    p.intro(`${CMD} v${VERSION} — init (project)`);
    p.log.error(HOME_PROJECT_INIT);
    p.outro("Nothing written.");
    return 1;
  }
  if (opts.names?.length) {
    return cmdAdd({ ...opts, replaceAgents: Boolean(opts.agents?.length), label: "init" });
  }
  if (!opts.yes && !opts.dryRun) {
    return cmdInteractive(opts);
  }

  const allRules = loadRules();
  const allSkills = loadSkills();
  const kitLabel = opts.scope === "user" ? "user" : "project";

  p.intro(`${CMD} v${VERSION} — init (${kitLabel})${opts.dryRun ? "  [dry-run]" : ""}`);

  const ruleNames = TEAM_INIT_RULES.filter((n) => allRules.some((r) => r.name === n));
  const skillNames = defaultInitSkills(allSkills, { rulesOnly: opts.rulesOnly });

  const plan = buildInstallPlan({
    ruleNames,
    skillNames,
    allRules,
    agents: opts.agents,
    scope: opts.scope,
    replaceAgents: Boolean(opts.agents?.length),
    cursorPlugins: opts.cursorPlugins,
  });

  const result = await runInstallPlan(plan, {
    dryRun: opts.dryRun,
    yes: opts.yes,
    force: opts.force,
  });

  if (result?.cancelled) return result.noTty ? 2 : 1;
  if (!result?.ok) {
    p.outro("Finished with errors — see above (partial install).");
    return 1;
  }
  p.outro(
    opts.dryRun
      ? "Dry-run complete — nothing written."
      : `Done. Update anytime: npx ${CMD} update`,
  );
  return 0;
}

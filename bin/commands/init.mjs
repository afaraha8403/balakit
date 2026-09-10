/**
 * `balakit init` — guided setup, or non-interactive with flags + -y.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION, TEAM_INIT_RULES, defaultInitSkills } from "../lib/pkg.mjs";
import { loadRules, loadSkills } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan } from "../lib/install.mjs";
import { cmdInteractive } from "./interactive.mjs";

/**
 * @param {{
 *   agents?: string[],
 *   dryRun?: boolean,
 *   yes?: boolean,
 *   scope?: "project"|"user",
 *   rulesOnly?: boolean,
 * }} opts
 */
export async function cmdInit(opts = {}) {
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
  });

  const result = await runInstallPlan(plan, {
    dryRun: opts.dryRun,
    yes: opts.yes,
  });

  if (result?.cancelled) return 1;
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

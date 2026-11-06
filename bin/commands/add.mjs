/**
 * `balakit add <names...>` — add rules and/or skills by name.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION } from "../lib/pkg.mjs";
import { loadRules, loadSkills, classifyNames } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan } from "../lib/install.mjs";

/**
 * @param {{
 *   names: string[],
 *   agents?: string[],
 *   dryRun?: boolean,
 *   yes?: boolean,
 *   scope?: "project"|"user",
 *   force?: boolean,
 *   cursorPlugins?: boolean,
 *   replaceAgents?: boolean,
 *   label?: string,
 * }} opts
 */
export async function cmdAdd(opts) {
  const allRules = loadRules();
  const allSkills = loadSkills();
  if (!opts.names?.length) {
    console.error(`Usage: ${CMD} add <rule-or-skill>...`);
    return 1;
  }
  const { ruleNames, skillNames, unknown } = classifyNames(opts.names, allRules, allSkills);
  if (unknown.length) {
    console.error(`Unknown name(s): ${unknown.join(", ")} — see \`${CMD} list\``);
    return 1;
  }

  p.intro(`${CMD} v${VERSION} — ${opts.label ?? "add"}${opts.dryRun ? "  [dry-run]" : ""}`);

  const plan = buildInstallPlan({
    ruleNames,
    skillNames,
    allRules,
    agents: opts.agents,
    reconcile: true,
    scope: opts.scope,
    replaceAgents: opts.replaceAgents,
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
  p.outro(opts.dryRun ? "Dry-run complete." : `Done. Update: npx ${CMD} update`);
  return 0;
}

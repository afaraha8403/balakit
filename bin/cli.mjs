#!/usr/bin/env node
/**
 * balakit: installer for standing rules and named skills.
 *
 * Rules install AGENTS.md-first (project). Skills are delegated to skills.sh.
 */
import { VERSION, CMD } from "./lib/pkg.mjs";
import { isCliEntry } from "./lib/entry.mjs";
import { parseArgv, usage, commandHelp } from "./lib/args.mjs";
import { cmdInit } from "./commands/init.mjs";
import { cmdAdd } from "./commands/add.mjs";
import { cmdRemove } from "./commands/remove.mjs";
import { cmdList, cmdStatus, cmdUpdate, cmdDoctor } from "./commands/status.mjs";
import { cmdInteractive } from "./commands/interactive.mjs";

export { renderRulesBlock, renderRepoStandingDocs, mergeManaged, removeManaged, demote } from "./lib/render.mjs";
export { parseRule, skillDescription, bundledSkillsFor, loadRules, loadSkills } from "./lib/catalog.mjs";
export {
  skillsAddCommand,
  skillsRemoveCommand,
  resolveSkillsShTargets,
  SKILLS_SH_VERIFIED_IDS,
  SKILLS_CLI_VERSION,
} from "./lib/skills-bridge.mjs";
export { installTeamRules, installPersonalRules, installUserRules, partitionRules } from "./lib/rules-install.mjs";
export {
  detectAgents,
  AGENTS,
  formatCapabilityMatrix,
  getCapability,
  DEFAULT_AGENT_IDS,
} from "./lib/agents.mjs";
export {
  RULE_BUNDLED_SKILLS,
  PERSONAL_RULES,
  TEAM_INIT_RULES,
  TEAM_INIT_SKILLS,
  defaultInitSkills,
  RULE_ALIASES,
  canonicalizeRuleName,
  canonicalizeRuleNames,
  NAME,
  CMD,
  REPO,
  MANIFEST_SCHEMA,
  BEGIN,
  END,
} from "./lib/pkg.mjs";
export { parseArgv } from "./lib/args.mjs";
export {
  readManifest,
  recordInstall,
  recordRemove,
  projectManifestPath,
  globalManifestPath,
  migrateManifest,
} from "./lib/manifest.mjs";
export { buildInstallPlan, runInstallPlan, planSelection, isHomeCwd, HOME_PROJECT_INIT } from "./lib/install.mjs";
export { MENTAL_MOVED, MENTAL_REPO } from "./lib/mental-moved.mjs";

async function main() {
  let args;
  try {
    args = parseArgv(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    if (!String(e.message).includes("Mental has moved")) {
      console.error(`Run \`${CMD} --help\` for usage.`);
    }
    process.exit(1);
  }

  const common = {
    agents: args.agents,
    dryRun: args.dryRun,
    yes: args.yes,
    scope: args.scope,
    rulesOnly: args.rulesOnly,
    force: args.force,
    cursorPlugins: args.cursorPlugins,
  };

  // A prompt whose input closes (piped or detached stdin) leaves its promise
  // unresolved; Node then drains the loop and would exit 0 with nothing done.
  process.once("beforeExit", () => {
    console.error("Input closed before setup finished. Nothing more was written. Re-run with -y to skip prompts.");
    process.exit(2);
  });

  let code = 0;
  switch (args.command) {
    case "help":
      console.log(args.names[0] ? commandHelp(args.names[0]) : usage());
      break;
    case "version":
      console.log(VERSION);
      break;
    case "list":
      code = cmdList({ json: args.json });
      break;
    case "doctor":
      code = cmdDoctor({ json: args.json });
      break;
    case "status":
      code = cmdStatus({ json: args.json });
      break;
    case "init":
      code = await cmdInit({ ...common, names: args.names });
      break;
    case "add":
      code = await cmdAdd({ ...common, names: args.names });
      break;
    case "remove":
      code = await cmdRemove({ ...common, names: args.names });
      break;
    case "update":
      code = await cmdUpdate({ ...common, rulesOnly: undefined });
      break;
    case null:
      code = await cmdInteractive(common);
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      console.log("\n" + usage());
      code = 1;
  }
  process.exit(code);
}

if (isCliEntry(import.meta.url)) {
  main();
}

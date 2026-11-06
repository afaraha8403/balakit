/**
 * Shared CLI argument helpers and usage text.
 */
import { CMD, VERSION, TEAM_INIT_RULES, TEAM_INIT_SKILLS } from "./pkg.mjs";
import { loadRules, loadSkills, trunc } from "./catalog.mjs";
import { AGENTS, AGENT_IDS, formatCapabilityMatrix } from "./agents.mjs";
import { MENTAL_MOVED, MENTAL_REPO } from "./mental-moved.mjs";

export function usage() {
  const rules = loadRules();
  return `${CMD} v${VERSION}: standing rules and named skills for coding agents

Usage:
  npx ${CMD}                         Guided setup (plan → review → apply)
  npx ${CMD} init [names...]         Same guided setup; -y installs the defaults,
                                     or only the named rules/skills
  npx ${CMD} add <names...>          Add rules and/or skills by name
  npx ${CMD} remove <names...>       Remove owned kit pieces
  npx ${CMD} list                    Available rules, skills, capability matrix
  npx ${CMD} status                  What balakit owns (inventory)
  npx ${CMD} doctor                  Health: drift, plugins/local, Copilot ~/.copilot/skills, leftover Mental
  npx ${CMD} update                  Refresh installed kit pieces

Options:
  --scope project|user   Install to this repo (default) or this machine
  --agents <ids|all>     Skills targets (default: detect + confirm in wizard)
  --rules-only           Init: standing rules only (skip default skills)
  --force                Replace rule files you changed (keeps a .bak copy)
  --cursor-plugins       User scope + Cursor: also copy every plugin pack to
                         ~/.cursor/plugins/local (remove: delete those copies)
  --dry-run              Preview without writing
  -y, --yes              Skip confirms
  --json                 list / status / doctor: machine-readable output
  -v, --version          Print version
  -h, --help             Show this help (\`${CMD} help <command>\` for one command)

Init rules: ${TEAM_INIT_RULES.join(", ")}
Init skills: ${TEAM_INIT_SKILLS.join(", ")}

Mental continuity has moved to ${MENTAL_REPO}
(\`--personal\` and \`--mental-*\` flags print the new location.)

Skills are installed via skills.sh. Direct path:
  npx skills add afaraha8403/balakit

Available rules: ${rules.map((r) => r.name).join(", ")}
`;
}

const COMMON = `  --scope project|user   This repo (default) or every project on this machine
  --agents <ids|all>     Tools to install for, comma-separated (see \`${CMD} list\`)
  --dry-run              Show every file that would be written; write nothing
  -y, --yes              Accept the shown plan without asking`;

/** Per-command help, keyed by command. */
const COMMAND_HELP = {
  init: `Usage: ${CMD} init [names...] [options]

Without -y, a guided setup asks scope, tools, and what to install.
With -y, installs the recommended rules and engineering skills, or only the
named rules/skills, for the tools you pass (else the recorded or detected ones).

${COMMON}
  --rules-only           Rules without the default skills
  --cursor-plugins       User scope + Cursor: also copy every plugin pack
  --force                Replace rule files you changed (keeps a .bak copy)

Examples:
  ${CMD} init                              guided setup
  ${CMD} init -y --agents claude-code      recommended set, Claude Code only
  ${CMD} init base dissect -y              just these two`,
  add: `Usage: ${CMD} add <names...> [options]

Adds rules and/or skills. Existing ones stay. Tools default to the ones
recorded for this scope; --agents adds tools.

${COMMON}
  --force                Replace rule files you changed (keeps a .bak copy)

Example: ${CMD} add seo-ai-search seo-audit -y`,
  remove: `Usage: ${CMD} remove <names...> [options]
       ${CMD} remove --cursor-plugins

Removes rules/skills balakit installed. Rule files you changed are kept.

  --scope project|user   Which install to remove from (default: this repo)
  --dry-run              Show what would be removed
  -y, --yes              Do not ask
  --force                Also delete rule files you changed
  --cursor-plugins       Delete the plugin packs copied to ~/.cursor/plugins/local`,
  update: `Usage: ${CMD} update [options]

Reinstalls everything recorded, from this balakit version, for the recorded
tools. Also restores deleted skills and rule files. Without --scope, both the
repo and the machine install are refreshed.

${COMMON}
  --force                Replace rule files you changed (keeps a .bak copy)
  --cursor-plugins       Start (or keep) copying Cursor plugin packs`,
  status: `Usage: ${CMD} status [--json]

What balakit installed here and on this machine, with skill counts and the
tool capability matrix.`,
  doctor: `Usage: ${CMD} doctor [--json]

Checks every recorded file on disk: rule blocks, rule files (and whether you
changed them), skills, and skill links. Exit 1 when something is missing or
broken; warnings alone exit 0. Fix with \`${CMD} update\`.`,
  list: `Usage: ${CMD} list [--json]

Every rule, skill, and supported tool, with what each tool can receive.`,
};

/**
 * Help text for one command, or the general usage when unknown.
 * @param {string} [command]
 */
export function commandHelp(command) {
  return COMMAND_HELP[command] ?? usage();
}

/**
 * True when argv asked for Mental tooling that no longer ships here.
 * @param {ReturnType<typeof parseArgv>} args
 */
export function isMentalMovedRequest(args) {
  if (args.personal || args.withPersonal || args.liftIgnore) return true;
  if (args.mentalTooling || args.mentalDataPolicy) return true;
  if (args.names.includes("mental")) return true;
  return false;
}

/**
 * Nearest known command within two edits, for "did you mean" hints.
 * @param {string} word
 * @param {Iterable<string>} commands
 * @returns {string|null}
 */
export function closestCommand(word, commands) {
  const dist = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  };
  let best = null;
  let bestD = 3;
  for (const c of commands) {
    const n = dist(word.toLowerCase(), c);
    if (n < bestD) [best, bestD] = [c, n];
  }
  return best;
}

/**
 * Parse argv into a structured args object.
 * @throws {Error} On an unknown command, option, agent id, or `--scope` value.
 */
export function parseArgv(argv) {
  const args = {
    command: null,
    names: [],
    agents: undefined,
    dryRun: false,
    yes: false,
    scope: undefined,
    personal: false,
    withPersonal: false,
    mentalTooling: undefined,
    mentalDataPolicy: undefined,
    liftIgnore: false,
    rulesOnly: false,
    force: false,
    cursorPlugins: undefined,
    json: false,
    help: false,
  };
  const csv = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);
  const commands = new Set([
    "init",
    "add",
    "remove",
    "list",
    "status",
    "update",
    "doctor",
    "help",
  ]);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "-h" || a === "--help") {
      args.help = true;
    } else if (a === "--json") {
      args.json = true;
    } else if (a === "-v" || a === "--version") {
      args.command = "version";
    } else if (a === "--dry-run") {
      args.dryRun = true;
    } else if (a === "-y" || a === "--yes") {
      args.yes = true;
    } else if (a === "--personal") {
      args.personal = true;
    } else if (a === "--with-personal") {
      args.withPersonal = true;
    } else if (a === "--mental-tooling") {
      args.mentalTooling = next() ?? "";
    } else if (a === "--mental-data") {
      args.mentalDataPolicy = next() ?? "";
    } else if (a === "--lift-ignore") {
      args.liftIgnore = true;
    } else if (a === "--rules-only") {
      args.rulesOnly = true;
    } else if (a === "--force") {
      args.force = true;
    } else if (a === "--cursor-plugins") {
      args.cursorPlugins = true;
    } else if (a === "--no-cursor-plugins") {
      args.cursorPlugins = false;
    } else if (a === "--scope") {
      const v = next();
      if (v !== "project" && v !== "user") {
        throw new Error(`--scope must be project or user (got ${v ?? "(missing)"})`);
      }
      args.scope = v;
    } else if (a === "--agents") {
      const v = next();
      args.agents = v === "all" ? [...AGENT_IDS] : csv(v);
    } else if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    } else if (!args.command && commands.has(a)) {
      args.command = a;
    } else if (!args.command) {
      const guess = closestCommand(a, commands);
      throw new Error(
        `Unknown command: ${a}${guess ? ` — did you mean \`${CMD} ${guess}\`?` : ""}`,
      );
    } else {
      args.names.push(a);
    }
  }

  if (args.help) {
    if (args.command && args.command !== "help") args.names = [args.command];
    args.command = "help";
  }

  if (args.agents) {
    const bad = args.agents.find((id) => !AGENT_IDS.includes(id));
    if (bad) throw new Error(`Unknown agent: ${bad} — see list`);
  }

  if (isMentalMovedRequest(args)) {
    throw new Error(MENTAL_MOVED.trimEnd());
  }

  return args;
}

export function printList() {
  const allRules = loadRules();
  const allSkills = loadSkills();
  console.log(`Rules:\n${allRules.map((r) => `  ${r.name} — ${r.description}`).join("\n")}`);
  console.log(
    `\nSkills:\n${allSkills.map((s) => `  ${s.name} — ${trunc(s.description, 100)}`).join("\n")}`,
  );
  console.log("\nCapability matrix (* = detected on this machine):");
  console.log(`  ${formatCapabilityMatrix().join("\n  ")}`);
  console.log(
    `\nLegacy agent ids (skills.sh):\n${AGENTS.filter((a) => a.skillsShId)
      .map((a) => `  ${a.id} → ${a.skillsShId}`)
      .join("\n")}`,
  );
}

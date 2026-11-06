/**
 * `balakit remove <names...>` — remove owned kit pieces.
 * Never deletes `.mental/` journals (Mental data is owned by the Mental CLI).
 */
import * as p from "@clack/prompts";
import { join } from "node:path";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { CMD, VERSION, PERSONAL_RULES, PKG_ROOT } from "../lib/pkg.mjs";
import { loadRules, loadSkills, classifyNames } from "../lib/catalog.mjs";
import {
  removeTeamRules,
  removeUserRules,
  partitionRules,
} from "../lib/rules-install.mjs";
import { skillsRemoveArgv, formatSkillsArgv, shellCommand, runSkillsArgv } from "../lib/skills-bridge.mjs";
import { canPrompt, NO_TTY } from "../lib/install.mjs";
import {
  readManifest,
  recordRemove,
  projectManifestPath,
  globalManifestPath,
  isCorruptManifest,
  guardFor,
} from "../lib/manifest.mjs";
import { hasManagedBlock } from "../lib/render.mjs";
import { unlinkCursorProjectSkills, listCursorLocalPlugins } from "../lib/cursor-native.mjs";
import { unlinkCopilotUserSkills } from "../lib/copilot-native.mjs";

/**
 * @param {{ names: string[], dryRun?: boolean, yes?: boolean, scope?: "project"|"user", force?: boolean }} opts
 */
export async function cmdRemove(opts) {
  const allRules = loadRules();
  const allSkills = loadSkills();
  const scope = opts.scope === "user" ? "user" : "project";

  if (opts.cursorPlugins) return removeCursorPlugins(opts);
  if (!opts.names?.length) {
    console.error(`Usage: ${CMD} remove <rule-or-skill>...   or   ${CMD} remove --cursor-plugins`);
    return 1;
  }

  const { ruleNames, skillNames, unknown } = classifyNames(opts.names, allRules, allSkills);
  if (unknown.length) {
    console.error(`Unknown name(s): ${unknown.join(", ")} — see \`${CMD} list\``);
    return 1;
  }

  p.intro(`${CMD} v${VERSION} — remove (${scope})${opts.dryRun ? "  [dry-run]" : ""}`);

  const selected = allRules.filter((r) => ruleNames.includes(r.name));
  const { personal, team } = partitionRules(selected);
  const userRules = scope === "user" ? selected : personal;
  const projectRules = scope === "user" ? [] : team;

  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const cwd = process.cwd();

  const liveTeamBlock =
    hasManagedBlock(join(cwd, "AGENTS.md")) || hasManagedBlock(join(cwd, "CLAUDE.md"));

  const remainingTeam = allRules.filter(
    (r) =>
      proj.rules.includes(r.name) &&
      !ruleNames.includes(r.name) &&
      !PERSONAL_RULES.includes(r.name),
  );

  if (projectRules.length && remainingTeam.length === 0 && liveTeamBlock) {
    const manifestKnowsTeam = projectRules.every((r) => proj.rules.includes(r.name));
    if (isCorruptManifest(proj) || !proj.rules.length || !manifestKnowsTeam) {
      p.log.error(
        "Refusing to wipe AGENTS.md/CLAUDE.md managed blocks: manifest is missing, corrupt, or out of sync with live files.\n" +
          "Fix with `balakit status`, restore `.balakit/installed.json`, or remove the managed block markers by hand.",
      );
      p.outro("Aborted.");
      return 1;
    }
  }
  const remainingUser = allRules.filter(
    (r) => glob.rules.includes(r.name) && !ruleNames.includes(r.name),
  );

  const skillRoot = scope === "user" ? join(homedir(), ".agents", "skills") : join(cwd, ".agents", "skills");
  const owned = scope === "user" ? glob.skills : proj.skills;
  const notInstalled = skillNames.filter((n) => !owned.includes(n) && !existsSync(join(skillRoot, n)));
  if (notInstalled.length) {
    p.log.warn(`Not installed (${scope}), skipped: ${notInstalled.join(", ")}`);
    skillNames.splice(0, skillNames.length, ...skillNames.filter((n) => !notInstalled.includes(n)));
  }
  const notRuleOwned = ruleNames.filter((n) => !(scope === "user" ? glob : proj).rules.includes(n));
  if (notRuleOwned.length) {
    p.log.warn(`Rules not recorded as installed (${scope}): ${notRuleOwned.join(", ")} — removing their kit files if present.`);
  }

  const lines = [];
  lines.push(`Scope: ${scope}`);
  if (projectRules.length) lines.push(`Project rules: ${projectRules.map((r) => r.name).join(", ")}`);
  if (userRules.length) lines.push(`User-wide rules: ${userRules.map((r) => r.name).join(", ")}`);
  if (skillNames.length) lines.push(`Skills: ${skillNames.join(", ")}`);
  p.note(lines.join("\n") || "Nothing to remove", "Remove");

  if (!projectRules.length && !userRules.length && !skillNames.length) {
    p.outro("Nothing to remove.");
    return 0;
  }

  if (!opts.yes && !opts.dryRun) {
    if (!canPrompt()) {
      p.log.error(NO_TTY);
      return 2;
    }
    const go = await p.confirm({ message: "Remove now?" });
    if (p.isCancel(go) || !go) {
      p.cancel("Cancelled.");
      return 1;
    }
  }

  let failed = false;

  if (projectRules.length) {
    const r = removeTeamRules(projectRules, remainingTeam, { dryRun: opts.dryRun, guard: guardFor(proj, { force: opts.force }) });
    if (r.removed.length) p.note(r.removed.join("\n"), opts.dryRun ? "Would remove" : "Removed");
    if (r.written.length) p.note(r.written.join("\n"), opts.dryRun ? "Would rewrite" : "Rewrote");
    if (r.kept.length) p.note(`${r.kept.join("\n")}\n(you changed these, so they stay)`, "Kept");
    if (!opts.dryRun) recordRemove("project", { rules: projectRules.map((x) => x.name), files: ruleFileKeys(projectRules, "project") });
  }

  if (userRules.length) {
    const r = removeUserRules(userRules, remainingUser, { dryRun: opts.dryRun, guard: guardFor(glob, { force: opts.force }) });
    if (r.removed.length) p.note(r.removed.join("\n"), opts.dryRun ? "Would remove" : "Removed");
    if (r.written.length) p.note(r.written.join("\n"), opts.dryRun ? "Would rewrite" : "Rewrote");
    if (r.kept.length) p.note(`${r.kept.join("\n")}\n(you changed these, so they stay)`, "Kept");
    if (!opts.dryRun) recordRemove("global", { rules: userRules.map((x) => x.name), files: ruleFileKeys(userRules, "user") });
  }

  if (skillNames.length) {
    const skillScope = scope === "user" ? "global" : "project";
    const argv = skillsRemoveArgv(skillNames, skillScope);
    if (opts.dryRun) {
      p.log.step(`Would remove skills:\n${formatSkillsArgv(argv)}`);
    } else {
      p.log.step(`Removing ${skillNames.length} skill(s)`);
      const result = runSkillsArgv(argv);
      if (!result.ok) {
        p.log.error(`Skills were not removed: ${result.reason}. To retry by hand:`);
        p.log.message(shellCommand(argv));
        failed = true;
      } else {
        recordRemove(skillScope === "global" ? "global" : "project", { skills: skillNames });
        if (scope === "project") {
          const unlinked = unlinkCursorProjectSkills(skillNames, { dryRun: opts.dryRun });
          if (unlinked.length) p.note(unlinked.join("\n"), "Removed Cursor skill links");
        }
        if (scope === "user") {
          const unlinked = unlinkCopilotUserSkills(skillNames, { dryRun: opts.dryRun });
          if (unlinked.removed.length) p.note(unlinked.removed.join("\n"), "Removed Copilot skill links");
          if (unlinked.notes.length) p.note(unlinked.notes.join("\n"), "Copilot skill links");
        }
      }
    }
  }

  p.outro(opts.dryRun ? "Dry-run complete." : failed ? "Finished with errors." : "Done.");
  return failed ? 1 : 0;
}

/** Manifest file keys a rule may own, so removal drops their hashes. */
function ruleFileKeys(rules, scope) {
  if (scope === "user") return rules.map((r) => `~/.cursor/rules/${r.name}.mdc`);
  return rules.flatMap((r) => [
    `.cursor/rules/${r.name}.mdc`,
    `.claude/rules/${r.name}.md`,
    `.github/instructions/${r.name}.instructions.md`,
  ]);
}

/**
 * Delete the plugin packs this package copied into ~/.cursor/plugins/local.
 * Only folder names this package ships are touched.
 */
function removeCursorPlugins(opts) {
  const home = homedir();
  const shipped = new Set(packagedPluginNames());
  const present = listCursorLocalPlugins(home).filter((n) => shipped.has(n));
  p.intro(`${CMD} v${VERSION} — remove Cursor plugin copies${opts.dryRun ? "  [dry-run]" : ""}`);
  if (!present.length) {
    p.outro("No balakit plugin copies in ~/.cursor/plugins/local.");
    return 0;
  }
  for (const name of present) {
    if (!opts.dryRun) rmSync(join(home, ".cursor", "plugins", "local", name), { recursive: true, force: true });
  }
  if (!opts.dryRun) recordRemove("global", { files: ["~/.cursor/plugins/local"] });
  p.note(present.map((n) => `~/.cursor/plugins/local/${n}`).join("\n"), opts.dryRun ? "Would remove" : "Removed");
  p.outro("Done. Reload Cursor.");
  return 0;
}

function packagedPluginNames() {
  const dir = join(PKG_ROOT, "plugins");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
}

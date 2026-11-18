/**
 * `balakit list` / `balakit status` / `balakit update` / `balakit doctor [--fix]`.
 */
import * as p from "@clack/prompts";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { CMD, VERSION } from "../lib/pkg.mjs";
import { printList } from "../lib/args.mjs";
import {
  readManifest,
  projectManifestPath,
  globalManifestPath,
  isCorruptManifest,
  emptyManifest,
} from "../lib/manifest.mjs";
import { hasManagedBlock } from "../lib/render.mjs";
import { loadRules, loadSkills } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan, isHomeCwd, sweepRetiredScope } from "../lib/install.mjs";
import { verifyScope, findRetiredArtifacts } from "../lib/verify.mjs";
import { hasLegacySkillsLock } from "../lib/skills-install.mjs";
import { AGENTS, detectedAgents, formatCapabilityMatrix } from "../lib/agents.mjs";
import { MENTAL_REPO } from "../lib/mental-moved.mjs";
import { listCursorLocalPlugins } from "../lib/cursor-native.mjs";

function rawHasMental(file) {
  if (!existsSync(file)) return false;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    return [...(raw.rules ?? []), ...(raw.skills ?? [])].includes("mental");
  } catch {
    return false;
  }
}

/** `list`: catalog and tool matrix. */
export function cmdList({ json = false } = {}) {
  if (!json) {
    printList();
    return 0;
  }
  const detected = new Set(detectedAgents());
  console.log(
    JSON.stringify(
      {
        version: VERSION,
        rules: loadRules().map((r) => ({ name: r.name, description: r.description, alwaysApply: r.always, globs: r.globs || null })),
        skills: loadSkills().map((x) => ({ name: x.name, description: x.description })),
        tools: AGENTS.map((a) => ({
          id: a.id,
          label: a.label,
          skills: Boolean(a.skillsShId),
          standing: a.standing,
          detected: detected.has(a.id),
        })),
      },
      null,
      2,
    ),
  );
  return 0;
}

/**
 * Kit health data for both scopes: manifests vs disk, retired artifacts,
 * cross-scope duplicates, and Cursor plugin + CLI overlap.
 */
export function doctorReport({ cwd = process.cwd(), home = homedir() } = {}) {
  const atHome = isHomeCwd(cwd, home);
  const proj = atHome ? emptyManifest() : readManifest(projectManifestPath(cwd));
  const glob = readManifest(globalManifestPath(home));
  const reports = [
    ...(atHome ? [] : [verifyScope("project", { cwd, home })]),
    verifyScope("user", { cwd, home }),
  ];
  const issues = reports.flatMap((r) => r.findings.filter((f) => f.level === "issue").map((f) => f.text));
  const warnings = reports.flatMap((r) => r.findings.filter((f) => f.level === "warn").map((f) => f.text));
  const notes = [];
  const summary = [];

  for (const r of reports) {
    const m = r.manifest;
    if (!m.rules.length && !m.skills.length) continue;
    const total = r.skills.present.length + r.skills.missing.length;
    summary.push(
      `${r.scope === "user" ? "User" : "Project"}: ${m.rules.length} rule(s), skills ${r.skills.present.length}/${total} present, tools: ${m.agents.join(", ") || "(none recorded)"}`,
    );
  }

  if ((!atHome && rawHasMental(projectManifestPath(cwd))) || rawHasMental(globalManifestPath(home))) {
    notes.push(`Ledger still lists mental. Balakit no longer ships it. Run mental doctor — ${MENTAL_REPO}`);
  }

  if (!atHome) {
    const dupRules = proj.rules.filter((r) => glob.rules.includes(r));
    const dupSkills = proj.skills.filter((s) => glob.skills.includes(s));
    if (dupRules.length || dupSkills.length) {
      const parts = [
        dupRules.length ? `rules (${dupRules.join(", ")})` : null,
        dupSkills.length ? `skills (${dupSkills.join(", ")})` : null,
      ].filter(Boolean);
      warnings.push(
        `Duplicate kit items installed in BOTH user and project scope: ${parts.join("; ")}. Agents that merge global + repo instructions load them twice.`,
      );
    }
  }

  const plugins = listCursorLocalPlugins(home);
  const kitPlugins = plugins.filter((n) => n.startsWith("balakit"));
  if (kitPlugins.length && glob.agents.includes("cursor") && (glob.rules.length || glob.skills.length)) {
    warnings.push(
      `Cursor has both local plugin packs (~/.cursor/plugins/local: ${kitPlugins.join(", ")}) and user-scope CLI rules/skills. Remove one surface (\`npx ${CMD}@latest remove --cursor-plugins\`) to avoid duplicate loads.`,
    );
  }

  return { issues, warnings, notes, summary, reports, plugins };
}

/**
 * `doctor`: print kit health, or automatically repair when `--fix` is passed.
 * Exit 1 on any remaining issue; warnings alone exit 0.
 * @param {{ cwd?: string, home?: string, json?: boolean, fix?: boolean, force?: boolean, dryRun?: boolean, scope?: "project"|"user" }} [opts]
 */
export async function cmdDoctor({
  cwd = process.cwd(),
  home = homedir(),
  json = false,
  fix = false,
  force = false,
  dryRun = false,
  scope,
} = {}) {
  if (fix) {
    if (!json) console.log(`${CMD} v${VERSION} — doctor --fix${dryRun ? " [dry-run]" : ""}\n`);
    await cmdUpdate({ cwd, home, yes: true, force, dryRun, scope, quietIntro: json });
  }

  const d = doctorReport({ cwd, home });
  const code = d.issues.length ? 1 : 0;

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: code === 0,
          repaired: Boolean(fix && !dryRun),
          issues: d.issues,
          warnings: d.warnings,
          notes: d.notes,
          cursorPlugins: d.plugins,
          scopes: d.reports.map((r) => ({
            scope: r.scope,
            skills: r.skills,
            brokenLinks: r.brokenLinks,
            retiredOnDisk: r.retiredOnDisk,
            tools: r.manifest.agents,
          })),
        },
        null,
        2,
      ),
    );
    return code;
  }

  if (!fix) console.log(`${CMD} v${VERSION} — doctor\n`);
  for (const line of d.summary) console.log(line);
  if (d.plugins.length) console.log(`Cursor plugins/local: ${d.plugins.join(", ")}`);
  const section = (title, items, markSym) => {
    if (!items.length) return;
    console.log(`\n${title}:`);
    for (const i of items) console.log(`  ${markSym}${i}`);
  };
  section("Notes", d.notes, "");
  section("Warnings", d.warnings, "⚠ ");
  section("Issues", d.issues, "✖ ");
  if (code) {
    console.log(`\nFix: npx ${CMD}@latest doctor --fix   (Mental health: \`mental doctor\`, ${MENTAL_REPO})`);
    return code;
  }
  console.log(`\nKit looks healthy${d.warnings.length ? " (see warnings)" : ""}.`);
  console.log(`Mental health lives in ${MENTAL_REPO} (\`mental doctor\`).`);
  return 0;
}

function mark(path) {
  return existsSync(path) ? "✓" : "·";
}

function printSkillCounts(report, dir) {
  const { present, missing } = report.skills;
  const total = present.length + missing.length;
  if (!total) return;
  console.log(`  ${missing.length ? "✖" : "✓"} ${dir}: ${present.length}/${total} recorded skills present${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`);
  if (report.brokenLinks.length) console.log(`  ✖ broken links: ${report.brokenLinks.join(", ")}`);
}

export function cmdStatus({ json = false, cwd = process.cwd(), home = homedir() } = {}) {
  const atHome = isHomeCwd(cwd, home);
  if (json) {
    const scopeNames = atHome ? ["user"] : ["project", "user"];
    const scopes = scopeNames.map((scope) => {
      const r = verifyScope(scope, { cwd, home });
      const { _corrupt, ...manifest } = r.manifest;
      return {
        scope,
        corrupt: Boolean(_corrupt),
        manifest,
        skills: r.skills,
        brokenLinks: r.brokenLinks,
        retiredOnDisk: r.retiredOnDisk,
        findings: r.findings,
      };
    });
    console.log(JSON.stringify({ version: VERSION, scopes, detectedTools: detectedAgents() }, null, 2));
    return 0;
  }
  const proj = atHome ? emptyManifest() : readManifest(projectManifestPath(cwd));
  const glob = readManifest(globalManifestPath(home));

  console.log(`${CMD} v${VERSION} — status\n`);

  if (!atHome) {
    console.log("Project (.balakit/installed.json):");
    if (isCorruptManifest(proj)) {
      console.log("  ✖ CORRUPT — treated as empty; fix or delete the file");
    } else if (!proj.rules.length && !proj.skills.length) {
      console.log("  (nothing recorded)");
    } else {
      if (proj.rules.length) console.log(`  rules:  ${proj.rules.join(", ")}`);
      if (proj.skills.length) console.log(`  skills: ${proj.skills.join(", ")}`);
      if (proj.agents?.length) console.log(`  agents: ${proj.agents.join(", ")}`);
      if (proj.surfaces?.length) console.log(`  surfaces: ${proj.surfaces.join(", ")}`);
      if (proj.updatedAt) console.log(`  updated: ${proj.updatedAt} (kit ${proj.version || "?"})`);
    }

    const agentsMd = join(cwd, "AGENTS.md");
    const claudeMd = join(cwd, "CLAUDE.md");
    const liveAgents = hasManagedBlock(agentsMd);
    const liveClaude = hasManagedBlock(claudeMd);
    console.log("\nManaged blocks:");
    console.log(`  AGENTS.md  ${liveAgents ? "✓ balakit block" : "· none"}`);
    console.log(`  CLAUDE.md  ${liveClaude ? "✓ balakit block" : "· none"}`);

    const projReport = verifyScope("project", { cwd, home });
    console.log("\nProject files on disk:");
    console.log(`  ${mark(join(cwd, ".cursor", "rules"))} .cursor/rules`);
    printSkillCounts(projReport, ".agents/skills");
    console.log("");
  }

  console.log("User-wide (~/.balakit/installed.json):");
  if (isCorruptManifest(glob)) {
    console.log("  ✖ CORRUPT — treated as empty");
  } else if (!glob.rules.length && !glob.skills.length) {
    console.log("  (nothing recorded)");
  } else {
    if (glob.rules.length) console.log(`  rules:  ${glob.rules.join(", ")}`);
    if (glob.skills.length) console.log(`  skills: ${glob.skills.join(", ")}`);
    if (glob.agents?.length) console.log(`  agents: ${glob.agents.join(", ")}`);
    if (glob.surfaces?.length) console.log(`  surfaces: ${glob.surfaces.join(", ")}`);
    if (glob.updatedAt) console.log(`  updated: ${glob.updatedAt} (kit ${glob.version || "?"})`);
  }

  console.log("\nHome surfaces:");
  printSkillCounts(verifyScope("user", { cwd, home }), "~/.agents/skills");
  console.log(`  ${mark(join(home, ".cursor", "rules"))} ~/.cursor/rules`);
  console.log(`  ${mark(join(home, ".cursor", "skills"))} ~/.cursor/skills`);
  const localPlugins = listCursorLocalPlugins(home);
  console.log(
    `  ${localPlugins.length ? "✓" : "·"} ~/.cursor/plugins/local${localPlugins.length ? ` (${localPlugins.join(", ")})` : ""}`,
  );
  console.log(`  ${mark(join(home, ".claude", "CLAUDE.md"))} ~/.claude/CLAUDE.md`);
  console.log(`  ${mark(join(home, ".codex", "AGENTS.md"))} ~/.codex/AGENTS.md`);
  console.log(`  ${mark(join(home, ".config", "opencode", "AGENTS.md"))} ~/.config/opencode/AGENTS.md`);
  console.log(`  ${mark(join(home, ".copilot", "copilot-instructions.md"))} ~/.copilot/copilot-instructions.md`);
  console.log(`  ${mark(join(home, ".copilot", "skills"))} ~/.copilot/skills`);
  console.log(`  ${mark(join(home, ".gemini", "GEMINI.md"))} ~/.gemini/GEMINI.md`);

  if ((!atHome && rawHasMental(projectManifestPath(cwd))) || rawHasMental(globalManifestPath(home))) {
    console.log("\nMental:");
    console.log("  recorded in a manifest, but Balakit no longer ships it.");
    console.log("  See https://github.com/afaraha8403/mental — journals were not deleted.");
  }

  console.log("\nCapability matrix (* = detected):");
  console.log(`  ${formatCapabilityMatrix().join("\n  ")}`);
  return 0;
}

/**
 * Re-install everything recorded in manifests from this package, migrate
 * renamed rules/skills, and prune retired folders, broken links, and legacy
 * `skills-lock.json` machine paths.
 */
export async function cmdUpdate(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const home = opts.home ?? homedir();
  const atHome = isHomeCwd(cwd, home);
  const allRules = loadRules();
  const proj = atHome ? emptyManifest() : readManifest(projectManifestPath(cwd));
  const glob = readManifest(globalManifestPath(home));
  const forced = opts.scope === "user" ? "user" : opts.scope === "project" ? "project" : null;

  if (!opts.quietIntro) {
    p.intro(`${CMD} v${VERSION} — update${opts.dryRun ? "  [dry-run]" : ""}`);
  }

  if (forced === "project" && atHome) {
    p.log.error("Cannot run --scope project from your home directory. Pass --scope user, or cd into a repo.");
    if (!opts.quietIntro) p.outro("Aborted.");
    return 1;
  }

  const jobs = [];
  const sweptOnly = [];
  for (const [scope, m] of [
    ...(atHome ? [] : [["project", proj]]),
    ["user", glob],
  ]) {
    if (forced && forced !== scope) continue;
    const ruleNames = m.rules.filter((n) => n !== "mental");
    const skillNames = [...new Set(m.skills.filter((s) => s !== "mental"))];
    if (ruleNames.length || skillNames.length) {
      jobs.push({ scope, ruleNames, skillNames, agents: opts.agents ?? (m.agents.length ? m.agents : undefined) });
    } else if (
      findRetiredArtifacts(scope, { cwd, home }).length ||
      hasLegacySkillsLock(scope, { cwd, home })
    ) {
      const swept = sweepRetiredScope(scope, { cwd, home, dryRun: opts.dryRun, force: opts.force });
      sweptOnly.push(...swept.removed);
    }
  }

  if (!jobs.length && !sweptOnly.length) {
    if (!opts.quietIntro) {
      p.log.warn(`Nothing recorded in manifests. Run \`npx ${CMD}@latest init\` or \`add\` first.`);
      p.outro("Nothing to update.");
    }
    return 0;
  }

  if (sweptOnly.length && !opts.quietIntro) {
    p.note(sweptOnly.join("\n"), opts.dryRun ? "Would prune retired artifacts" : "Pruned retired artifacts");
  }

  let failed = false;
  for (const job of jobs) {
    const plan = buildInstallPlan({
      ruleNames: job.ruleNames,
      skillNames: job.skillNames,
      allRules,
      agents: job.agents,
      cwd,
      home,
      reconcile: true,
      replaceSelection: true,
      replaceAgents: Boolean(opts.agents?.length),
      scope: job.scope,
      cursorPlugins: opts.cursorPlugins,
    });
    const result = await runInstallPlan(plan, {
      dryRun: opts.dryRun,
      yes: opts.yes,
      force: opts.force,
      review: !opts.quietIntro,
    });
    if (result?.cancelled) return result.noTty ? 2 : 1;
    if (!result?.ok) failed = true;
  }

  if (!opts.quietIntro) {
    p.outro(opts.dryRun ? "Dry-run complete." : failed ? "Finished with errors — see above." : "Updated.");
  }
  return failed ? 1 : 0;
}

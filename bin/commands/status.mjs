/**
 * `balakit list` / `balakit status` / `balakit update` / `balakit doctor`.
 */
import * as p from "@clack/prompts";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { CMD, VERSION } from "../lib/pkg.mjs";
import { printList } from "../lib/args.mjs";
import {
  readManifest,
  projectManifestPath,
  globalManifestPath,
  isCorruptManifest,
} from "../lib/manifest.mjs";
import { hasManagedBlock } from "../lib/render.mjs";
import { loadRules, loadSkills } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan } from "../lib/install.mjs";
import { verifyScope } from "../lib/verify.mjs";
import { AGENTS, detectedAgents, formatCapabilityMatrix } from "../lib/agents.mjs";
import { MENTAL_REPO } from "../lib/mental-moved.mjs";
import { listCursorLocalPlugins } from "../lib/cursor-native.mjs";
import { missingCopilotUserSkills } from "../lib/copilot-native.mjs";

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
 * Kit health data for both scopes: manifests vs disk, Cursor plugins/local,
 * and the Copilot user-skill dest.
 * @returns {{ issues: string[], warnings: string[], notes: string[], summary: string[], reports: import("../lib/verify.mjs").ScopeReport[], plugins: string[] }}
 */
export function doctorReport({ cwd = process.cwd(), home = homedir() } = {}) {
  const proj = readManifest(projectManifestPath(cwd));
  const glob = readManifest(globalManifestPath(home));
  const reports = [verifyScope("project", { cwd, home }), verifyScope("user", { cwd, home })];
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

  if ([proj.rules, glob.rules, proj.skills, glob.skills].some((l) => l.includes("mental"))) {
    notes.push(`Ledger still lists mental. Balakit no longer ships it. Run mental doctor — ${MENTAL_REPO}`);
  }

  if ((glob.agents || []).includes("copilot") && (glob.skills || []).length) {
    const missing = missingCopilotUserSkills(glob.skills, { home });
    if (missing.length) {
      issues.push(
        `User manifest lists skills and agent copilot, but ~/.copilot/skills is missing: ${missing.join(", ")}. Rerun \`npx ${CMD} update --scope user\`.`,
      );
    }
  }

  return { issues, warnings, notes, summary, reports, plugins: listCursorLocalPlugins(home) };
}

/**
 * `doctor`: print kit health. Exit 1 on any issue; warnings alone exit 0.
 * @param {{ cwd?: string, home?: string, json?: boolean }} [opts]
 */
export function cmdDoctor({ cwd = process.cwd(), home = homedir(), json = false } = {}) {
  const d = doctorReport({ cwd, home });
  const code = d.issues.length ? 1 : 0;

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: code === 0,
          issues: d.issues,
          warnings: d.warnings,
          notes: d.notes,
          cursorPlugins: d.plugins,
          scopes: d.reports.map((r) => ({ scope: r.scope, skills: r.skills, brokenLinks: r.brokenLinks, tools: r.manifest.agents })),
        },
        null,
        2,
      ),
    );
    return code;
  }

  console.log(`${CMD} v${VERSION} — doctor\n`);
  for (const line of d.summary) console.log(line);
  if (d.plugins.length) console.log(`Cursor plugins/local: ${d.plugins.join(", ")}`);
  const section = (title, items, mark) => {
    if (!items.length) return;
    console.log(`\n${title}:`);
    for (const i of items) console.log(`  ${mark}${i}`);
  };
  section("Notes", d.notes, "");
  section("Warnings", d.warnings, "⚠ ");
  section("Issues", d.issues, "✖ ");
  if (code) {
    console.log(`\nFix: npx ${CMD} update   (Mental health: \`mental doctor\`, ${MENTAL_REPO})`);
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

export function cmdStatus({ json = false } = {}) {
  if (json) {
    const scopes = ["project", "user"].map((scope) => {
      const r = verifyScope(scope);
      const { _corrupt, ...manifest } = r.manifest;
      return { scope, corrupt: Boolean(_corrupt), manifest, skills: r.skills, brokenLinks: r.brokenLinks, findings: r.findings };
    });
    console.log(JSON.stringify({ version: VERSION, scopes, detectedTools: detectedAgents() }, null, 2));
    return 0;
  }
  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const cwd = process.cwd();
  const home = homedir();

  console.log(`${CMD} v${VERSION} — status\n`);

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

  const teamRules = proj.rules.filter((n) => n !== "mental");
  if ((liveAgents || liveClaude) && !teamRules.length && !proj.rules.length) {
    console.log("  ⚠ drift: live managed block but empty project manifest");
  }
  if (teamRules.length && !liveAgents && !liveClaude) {
    console.log("  ⚠ drift: project manifest lists rules but no managed block");
  }

  console.log("\nUser-wide (~/.balakit/installed.json):");
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
  console.log(`  ${mark(join(home, ".copilot", "skills"))} ~/.copilot/skills`);

  if (proj.rules.includes("mental") || glob.rules.includes("mental") || proj.skills.includes("mental") || glob.skills.includes("mental")) {
    console.log("\nMental:");
    console.log("  recorded in a manifest, but Balakit no longer ships it.");
    console.log("  See https://github.com/afaraha8403/mental — journals were not deleted.");
  }

  console.log("\nCapability matrix (* = detected):");
  console.log(`  ${formatCapabilityMatrix().join("\n  ")}`);
  return 0;
}

/**
 * Re-install everything recorded in manifests from this package (except
 * Mental — moved out). Reinstalling, rather than asking skills.sh to update
 * in place, also restores skills that were deleted and relinks tool folders.
 * @param {{ dryRun?: boolean, yes?: boolean, agents?: string[], scope?: "project"|"user", force?: boolean, cursorPlugins?: boolean }} opts
 */
export async function cmdUpdate(opts = {}) {
  const allRules = loadRules();
  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const forced = opts.scope === "user" ? "user" : opts.scope === "project" ? "project" : null;

  p.intro(`${CMD} v${VERSION} — update${opts.dryRun ? "  [dry-run]" : ""}`);

  const jobs = [];
  for (const [scope, m] of [["project", proj], ["user", glob]]) {
    if (forced && forced !== scope) continue;
    const ruleNames = m.rules.filter((n) => n !== "mental");
    const skillNames = [...new Set(m.skills.filter((s) => s !== "mental"))];
    if (ruleNames.length || skillNames.length) {
      jobs.push({ scope, ruleNames, skillNames, agents: opts.agents ?? (m.agents.length ? m.agents : undefined) });
    }
  }

  if (!jobs.length) {
    p.log.warn(`Nothing recorded in manifests. Run \`${CMD} init\` or \`${CMD} add\` first.`);
    p.outro("Nothing to update.");
    return 0;
  }

  let failed = false;
  for (const job of jobs) {
    const plan = buildInstallPlan({
      ruleNames: job.ruleNames,
      skillNames: job.skillNames,
      allRules,
      agents: job.agents,
      reconcile: true,
      scope: job.scope,
      cursorPlugins: opts.cursorPlugins,
    });
    const result = await runInstallPlan(plan, { dryRun: opts.dryRun, yes: opts.yes, force: opts.force });
    if (result?.cancelled) return result.noTty ? 2 : 1;
    if (!result?.ok) failed = true;
  }

  p.outro(opts.dryRun ? "Dry-run complete." : failed ? "Finished with errors — see above." : "Updated.");
  return failed ? 1 : 0;
}

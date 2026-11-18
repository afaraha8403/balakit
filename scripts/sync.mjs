#!/usr/bin/env node
/**
 * Cross-platform repository sync (`npm run sync`).
 *
 * Source of truth: `skills/` and `rules/`.
 * Regenerates:
 *   1. `.agents/skills/`, `.cursor/skills/`, `.claude/skills/` (clean replace; deletions propagate)
 *   2. `CLAUDE.md` + `AGENTS.md` (3 always-on rules + 1-line conditional pointers)
 *   3. Single-injection scoped rule mirrors:
 *      - `.cursor/rules/<scoped>.mdc` (only glob-scoped `.mdc`; always-on lives once in `AGENTS.md`)
 *      - `.claude/rules/<scoped>.md`
 *      - `.github/instructions/<scoped>.instructions.md`
 *      - `.balakit/rules/<scoped>.md` (on-demand reference docs pointed to by `AGENTS.md` / `CLAUDE.md`)
 *   4. `plugins/*` and marketplace manifests (`buildPlugins()`)
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadRules } from "../bin/lib/catalog.mjs";
import { renderClaudeRule, renderCopilotInstructions } from "../bin/lib/rule-adapters.mjs";
import { renderScopedRuleDoc } from "../bin/lib/rules-install.mjs";
import { buildAgentRules } from "./build-agent-rules.mjs";
import { buildPlugins } from "./build-plugins.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKILL_MIRROR_ROOTS = [".agents", ".cursor", ".claude"];

/**
 * Synchronize all generated repository mirrors, standing docs, scoped rules, and plugins.
 * @param {string} [root]
 */
export function syncRepo(root = ROOT) {
  const skillsSrc = join(root, "skills");
  const skillNames = readdirSync(skillsSrc, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(skillsSrc, d.name, "SKILL.md")))
    .map((d) => d.name)
    .sort();

  for (const mirror of SKILL_MIRROR_ROOTS) {
    const destRoot = join(root, mirror, "skills");
    rmSync(destRoot, { recursive: true, force: true });
    mkdirSync(destRoot, { recursive: true });
    for (const name of skillNames) {
      cpSync(join(skillsSrc, name), join(destRoot, name), { recursive: true });
    }
  }

  // Drop legacy inert folder if present.
  rmSync(join(root, ".agents", "rules"), { recursive: true, force: true });

  const rules = loadRules();
  const scoped = rules.filter((r) => !r.always);

  // Cleanly rewrite single-injection scoped rule directories so retired / always-on files never linger.
  const cursorRulesDir = join(root, ".cursor", "rules");
  const claudeRulesDir = join(root, ".claude", "rules");
  const copilotInstrDir = join(root, ".github", "instructions");
  const balakitRulesDir = join(root, ".balakit", "rules");

  for (const dir of [cursorRulesDir, claudeRulesDir, copilotInstrDir, balakitRulesDir]) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }

  for (const rule of scoped) {
    writeFileSync(join(cursorRulesDir, `${rule.name}.mdc`), rule.raw);
    writeFileSync(join(claudeRulesDir, `${rule.name}.md`), renderClaudeRule(rule));
    writeFileSync(
      join(copilotInstrDir, `${rule.name}.instructions.md`),
      renderCopilotInstructions(rule),
    );
    writeFileSync(join(balakitRulesDir, `${rule.name}.md`), renderScopedRuleDoc(rule));
  }

  const ruleRes = buildAgentRules(root);
  const pluginRes = buildPlugins();

  return {
    skillCount: skillNames.length,
    ruleCount: ruleRes.ruleCount,
    alwaysRuleCount: ruleRes.alwaysCount,
    scopedRuleCount: ruleRes.scopedCount,
    pluginCount: pluginRes.pluginCount,
  };
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const res = syncRepo(ROOT);
  console.log(
    `Synced ${res.skillCount} skills -> ${SKILL_MIRROR_ROOTS.map((m) => `${m}/skills`).join(", ")}; ` +
      `${res.ruleCount} rules (${res.alwaysRuleCount} always-on in AGENTS.md/CLAUDE.md, ` +
      `${res.scopedRuleCount} scoped in .cursor/.claude/.github/.balakit); ` +
      `${res.pluginCount} plugins.`,
  );
}

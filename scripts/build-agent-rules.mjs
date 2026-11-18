#!/usr/bin/env node
/**
 * Generate root CLAUDE.md and AGENTS.md from the source-of-truth rules/*.mdc.
 *
 * Shares render logic with the consumer installer (`bin/lib/render.mjs`).
 * Invoked by `scripts/sync.mjs` (`npm run sync`) — edit `rules/`, not this output.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadRules } from "../bin/lib/catalog.mjs";
import { renderRepoStandingDocs } from "../bin/lib/render.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Render and write root CLAUDE.md and AGENTS.md.
 * @param {string} [root]
 * @returns {{ ruleCount: number, alwaysCount: number, scopedCount: number }}
 */
export function buildAgentRules(root = ROOT) {
  const rules = loadRules();
  const always = rules.filter((r) => r.always);
  const scoped = rules.filter((r) => !r.always);

  writeFileSync(join(root, "CLAUDE.md"), renderRepoStandingDocs(rules, "Claude Code"));
  writeFileSync(
    join(root, "AGENTS.md"),
    renderRepoStandingDocs(rules, "OpenCode, Codex, Cursor, and GitHub Copilot"),
  );

  return { ruleCount: rules.length, alwaysCount: always.length, scopedCount: scoped.length };
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const { ruleCount, alwaysCount, scopedCount } = buildAgentRules(ROOT);
  console.log(
    `Generated CLAUDE.md + AGENTS.md from ${ruleCount} rules ` +
      `(${alwaysCount} always-on, ${scopedCount} conditional).`,
  );
}


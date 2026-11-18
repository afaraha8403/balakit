// Tests for AGENTS.md-first rule install / remove and skills command builder.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  installTeamRules,
  installPersonalRules,
  removeTeamRules,
  removePersonalRules,
  partitionRules,
} from "../bin/lib/rules-install.mjs";
import { mergeManaged, removeManaged, hasManagedBlock, renderRulesBlock } from "../bin/lib/render.mjs";
import { skillsAddCommand, skillsRemoveCommand } from "../bin/lib/skills-bridge.mjs";
import { BEGIN, END, PERSONAL_RULES } from "../bin/lib/pkg.mjs";
import { loadRules } from "../bin/lib/catalog.mjs";
import {
  recordInstall,
  readManifest,
  projectManifestPath,
  recordRemove,
} from "../bin/lib/manifest.mjs";

let cwd;
let home;
let prevCwd;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "balakit-rules-"));
  home = mkdtempSync(join(tmpdir(), "balakit-home-"));
  prevCwd = process.cwd();
  process.chdir(cwd);
});

afterEach(() => {
  process.chdir(prevCwd);
  rmSync(cwd, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

const sampleAlways = {
  name: "base",
  always: true,
  globs: "",
  description: "meta",
  body: "# Base\n\nDo the right thing.",
  raw: "---\nalwaysApply: true\n---\n# Base\n\nDo the right thing.\n",
};

const sampleScoped = {
  name: "seo-ai-search",
  always: false,
  globs: "**/*.{astro,ts}",
  description: "SEO",
  body: "# SEO\n\nShip meta tags.",
  raw: "---\nglobs: \"**/*.{astro,ts}\"\nalwaysApply: false\n---\n# SEO\n\nShip meta tags.\n",
};

const sampleNotes = {
  name: "notes",
  always: true,
  globs: "",
  description: "dummy personal",
  body: "# Notes\n\nKeep notes.",
  raw: "---\nalwaysApply: true\n---\n# Notes\n\nKeep notes.\n",
};

test("partitionRules puts all catalog rules on the team side", () => {
  const { personal, team } = partitionRules([sampleAlways, sampleScoped]);
  assert.deepEqual(personal, []);
  assert.deepEqual(
    team.map((r) => r.name),
    ["base", "seo-ai-search"],
  );
  assert.equal(PERSONAL_RULES.length, 0);
});

test("installTeamRules writes AGENTS.md + CLAUDE.md managed blocks", () => {
  const { written } = installTeamRules([sampleAlways], { cwd });
  assert.ok(written.some((w) => w.includes("AGENTS.md") || w === "AGENTS.md"));
  assert.ok(hasManagedBlock(join(cwd, "AGENTS.md")));
  assert.ok(hasManagedBlock(join(cwd, "CLAUDE.md")));
  const body = readFileSync(join(cwd, "AGENTS.md"), "utf8");
  assert.match(body, /Do the right thing/);
  assert.ok(body.includes(BEGIN));
  assert.ok(body.includes(END));
});

test("installTeamRules writes scoped rules to .cursor/rules/*.mdc", () => {
  installTeamRules([sampleAlways, sampleScoped], { cwd });
  const mdc = join(cwd, ".cursor", "rules", "seo-ai-search.mdc");
  assert.ok(existsSync(mdc));
  assert.match(readFileSync(mdc, "utf8"), /Ship meta tags/);
});

test("mergeManaged is idempotent and preserves surrounding content", () => {
  const file = join(cwd, "AGENTS.md");
  writeFileSync(file, "# Mine\n\nKeep me.\n");
  mergeManaged(file, "first");
  mergeManaged(file, "second");
  const cur = readFileSync(file, "utf8");
  assert.match(cur, /Keep me/);
  assert.match(cur, /second/);
  assert.doesNotMatch(cur, /first/);
  const begins = cur.split(BEGIN).length - 1;
  assert.equal(begins, 1);
});

test("removeManaged strips block; delete file when empty", () => {
  const file = join(cwd, "AGENTS.md");
  mergeManaged(file, "only balakit");
  assert.equal(removeManaged(file), true);
  assert.equal(existsSync(file), false);
});

test("removeTeamRules rewrites remaining rules", () => {
  const { files } = installTeamRules([sampleAlways, sampleScoped], { cwd });
  removeTeamRules([sampleScoped], [sampleAlways], { cwd, guard: { files, legacy: false, force: false } });
  assert.equal(existsSync(join(cwd, ".cursor", "rules", "seo-ai-search.mdc")), false);
  assert.equal(existsSync(join(cwd, ".balakit", "rules", "seo-ai-search.md")), false);
  assert.ok(existsSync(join(cwd, ".cursor", "rules", "base.mdc")));
  assert.match(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /Do the right thing/);
  assert.doesNotMatch(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /seo-ai-search/);
});

test("single-injection Cursor: cursor-only omits AGENTS.md; cursor+codex writes AGENTS.md + scoped .mdc only", () => {
  const cursorOnly = mkdtempSync(join(tmpdir(), "balakit-cursor-only-"));
  const multi = mkdtempSync(join(tmpdir(), "balakit-cursor-multi-"));
  try {
    installTeamRules([sampleAlways, sampleScoped], { cwd: cursorOnly, agents: ["cursor"] });
    assert.equal(existsSync(join(cursorOnly, "AGENTS.md")), false);
    assert.ok(existsSync(join(cursorOnly, ".cursor", "rules", "base.mdc")));
    assert.ok(existsSync(join(cursorOnly, ".cursor", "rules", "seo-ai-search.mdc")));

    // First seed base.mdc in multi, then switch to cursor+codex so redundant base.mdc is pruned!
    const seed = installTeamRules([sampleAlways, sampleScoped], { cwd: multi, agents: ["cursor"] });
    assert.ok(existsSync(join(multi, ".cursor", "rules", "base.mdc")));
    installTeamRules([sampleAlways, sampleScoped], {
      cwd: multi,
      agents: ["cursor", "codex"],
      guard: { files: seed.files, legacy: false, force: false },
    });
    assert.ok(hasManagedBlock(join(multi, "AGENTS.md")));
    assert.equal(existsSync(join(multi, ".cursor", "rules", "base.mdc")), false);
    assert.ok(existsSync(join(multi, ".cursor", "rules", "seo-ai-search.mdc")));
    assert.ok(existsSync(join(multi, ".balakit", "rules", "seo-ai-search.md")));
  } finally {
    rmSync(cursorOnly, { recursive: true, force: true });
    rmSync(multi, { recursive: true, force: true });
  }
});

test("installTeamRules writes legacy all-targets always-on .mdc when agents is undefined", () => {
  installTeamRules([sampleAlways], { cwd });
  const mdc = join(cwd, ".cursor", "rules", "base.mdc");
  assert.ok(existsSync(mdc));
  assert.match(readFileSync(mdc, "utf8"), /Do the right thing/);
});

test("installTeamRules writes Claude and Copilot twins with brace-safe glob splitting", async () => {
  const { renderClaudeRule, renderCopilotInstructions, globList } = await import(
    "../bin/lib/rule-adapters.mjs"
  );
  const multiGlob = {
    ...sampleScoped,
    globs: "src/**/*.{astro,tsx}, **/robots.{txt,ts}",
  };
  assert.deepEqual(globList(multiGlob.globs), ["src/**/*.{astro,tsx}", "**/robots.{txt,ts}"]);
  const first = installTeamRules([multiGlob], { cwd, agents: ["claude-code", "copilot"] });
  const claude = join(cwd, ".claude", "rules", "seo-ai-search.md");
  const copilot = join(cwd, ".github", "instructions", "seo-ai-search.instructions.md");
  assert.ok(existsSync(claude));
  assert.ok(existsSync(copilot));
  assert.match(readFileSync(claude, "utf8"), /"src\/\*\*\/\*\.{astro,tsx}"/);
  assert.match(readFileSync(claude, "utf8"), /"\*\*\/robots\.{txt,ts}"/);
  assert.match(readFileSync(copilot, "utf8"), /applyTo:/);
  const preview = installTeamRules([sampleScoped], {
    cwd,
    agents: ["claude-code"],
    dryRun: true,
    guard: { files: first.files, legacy: false, force: false },
  });
  assert.ok(preview.written.some((w) => w.endsWith("seo-ai-search.md")));
  assert.match(renderClaudeRule(sampleScoped), /paths:/);
  assert.match(renderCopilotInstructions(sampleScoped), /applyTo:/);
});

test("demote leaves # comments inside fenced code blocks untouched", () => {
  const ruleWithCode = {
    name: "base",
    always: true,
    globs: "",
    description: "meta",
    body: "# Heading\n\n```bash\n# shell comment\necho hi\n```\n\n## Subheading",
    raw: "",
  };
  const md = renderRulesBlock([ruleWithCode], { consumer: true });
  assert.match(md, /^## Heading$/m);
  assert.match(md, /^### Subheading$/m);
  assert.match(md, /^# shell comment$/m);
  assert.doesNotMatch(md, /^## shell comment$/m);
});

test("installPersonalRules writes OpenCode, Copilot, and Gemini user standing blocks", () => {
  installPersonalRules([sampleNotes], { home });
  assert.ok(hasManagedBlock(join(home, ".config", "opencode", "AGENTS.md")));
  assert.ok(hasManagedBlock(join(home, ".copilot", "copilot-instructions.md")));
  assert.ok(hasManagedBlock(join(home, ".gemini", "GEMINI.md")));
});

test("installPersonalRules writes user-level targets", () => {
  const { written } = installPersonalRules([sampleNotes], { home });
  assert.ok(written.some((w) => w.includes(".claude")));
  assert.ok(existsSync(join(home, ".cursor", "rules", "notes.mdc")));
  assert.ok(hasManagedBlock(join(home, ".claude", "CLAUDE.md")));
  assert.ok(hasManagedBlock(join(home, ".codex", "AGENTS.md")));
});

test("removePersonalRules clears global dummy files", () => {
  const { files } = installPersonalRules([sampleNotes], { home });
  removePersonalRules([sampleNotes], [], { home, guard: { files, legacy: false, force: false } });
  assert.equal(existsSync(join(home, ".cursor", "rules", "notes.mdc")), false);
  assert.equal(hasManagedBlock(join(home, ".claude", "CLAUDE.md")), false);
});

test("skillsAddCommand includes -g for global and skill flags", () => {
  const cmd = skillsAddCommand(["dissect"], ["cursor", "claude-code"], "global");
  assert.match(cmd, /^balakit-skills@native add /);
  assert.match(cmd, /-s dissect/);
  assert.match(cmd, /-a cursor/);
  assert.match(cmd, /-a claude-code/);
  assert.match(cmd, /-g/);
});

test("installTeamRules keeps a rule file the user changed unless forced", () => {
  const first = installTeamRules([sampleAlways], { cwd });
  const mdc = join(cwd, ".cursor", "rules", "base.mdc");
  writeFileSync(mdc, "my own rule\n");
  const guard = { files: first.files, legacy: false, force: false };
  const again = installTeamRules([sampleAlways], { cwd, guard });
  assert.ok(again.kept.some((k) => k.endsWith("base.mdc")), again.kept.join(","));
  assert.equal(readFileSync(mdc, "utf8"), "my own rule\n");
  installTeamRules([sampleAlways], { cwd, guard: { ...guard, force: true } });
  assert.equal(readFileSync(`${mdc}.bak`, "utf8"), "my own rule\n");
  assert.match(readFileSync(mdc, "utf8"), /Do the right thing/);
});

test("skillsRemoveCommand builds remove invocation", () => {
  const cmd = skillsRemoveCommand(["dissect"], "global");
  assert.match(cmd, /^balakit-skills@native remove /);
  assert.match(cmd, /dissect/);
  assert.match(cmd, /-g/);
});

test("manifest recordInstall / recordRemove round-trip", () => {
  recordInstall("project", { rules: ["base"], skills: ["dissect"] }, { cwd });
  const m = readManifest(projectManifestPath(cwd));
  assert.deepEqual(m.rules, ["base"]);
  assert.deepEqual(m.skills, ["dissect"]);
  recordRemove("project", { rules: ["base"] }, { cwd });
  const m2 = readManifest(projectManifestPath(cwd));
  assert.deepEqual(m2.rules, []);
  assert.deepEqual(m2.skills, ["dissect"]);
});

test("renderRulesBlock includes always-on body", () => {
  const md = renderRulesBlock([sampleAlways], { consumer: true });
  assert.match(md, /Do the right thing/);
  assert.match(md, /Opinionated Rules/);
});

test("loadRules finds packaged rules and excludes mental", () => {
  const rules = loadRules();
  assert.ok(rules.some((r) => r.name === "base"));
  assert.ok(!rules.some((r) => r.name === "mental"));
});

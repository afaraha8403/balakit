// Integration tests for the documentation-writer 80% ASD-STE100 linter ( prose rules + markdown exclusions + CLI ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCRIPT = join(ROOT, "skills/documentation-writer/scripts/lint-ste.mjs");

test("lintSte passes clean 80% STE technical markdown with domain nouns, hedges, and code blocks", async () => {
  const { lintSte } = await import(SCRIPT);
  const doc = [
    "---",
    "title: ensure-frontmatter-is-ignored",
    "---",
    "# Session Token Validator",
    "",
    "The validator checks session cookies on every request. Replicas may drop stale sockets during leader election while preserving idempotency and backpressure.",
    "",
    "1. Run `ensureSession();` before you open the admin route.",
    "2. Check the exit status when a node is missing from the quorum.",
    "",
    "```js",
    "// ensure semicolons; progressive is running; leverage seamless",
    "const x = ensure(); is_running();",
    "```",
  ].join("\n");

  const report = lintSte(doc);
  assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
  assert.equal(report.issueCount, 0);
});

test("lintSte flags semicolons, unapproved words, nominalizations, phrasal verbs, buzzwords, progressive tense, and length caps", async () => {
  const { lintSte } = await import(SCRIPT);
  const bad = [
    "The operator is running checks to ensure the cluster works; prior to restart we dive into logs.",
    "",
    "We perform an analysis of every packet to leverage a seamless tapestry of nodes.",
    "",
    "1. Spin up the local worker node right now and verify every single downstream database replica state transition across all availability zones immediately.",
  ].join("\n");

  const report = lintSte(bad);
  assert.equal(report.ok, false);
  const rules = new Set(report.issues.map((i) => i.rule));
  for (const expected of [
    "PROGRESSIVE_TENSE",
    "UNAPPROVED_WORD",
    "SEMICOLON",
    "PHRASAL_VERB",
    "NOMINALIZATION",
    "AI_BUZZWORD",
    "SENTENCE_TOO_LONG",
  ]) {
    assert.ok(rules.has(expected), `expected rule ${expected}, got ${[...rules].join(", ")}`);
  }
});

test("lintSte flags paragraphs over 6 sentences", async () => {
  const { lintSte } = await import(SCRIPT);
  const sevenSentences =
    "One short fact. Two short facts. Three short facts. Four short facts. Five short facts. Six short facts. Seven short facts.";
  const report = lintSte(sevenSentences);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.rule === "PARAGRAPH_TOO_LONG"));
});

test("CLI lints files and stdin with exit codes and --json output", () => {
  const dir = mkdtempSync(join(tmpdir(), "ste-lint-"));
  try {
    const cleanFile = join(dir, "clean.md");
    writeFileSync(cleanFile, "# Guide\n\n1. Start the server.\n2. Make sure that port 3000 responds.\n");

    const okRun = spawnSync(process.execPath, [SCRIPT, cleanFile, "--json"], { encoding: "utf8" });
    assert.equal(okRun.status, 0, okRun.stderr);
    const parsedOk = JSON.parse(okRun.stdout);
    assert.equal(parsedOk.ok, true);

    const badRun = spawnSync(process.execPath, [SCRIPT, "-", "--json"], {
      input: "Ensure that you utilize this seamless tool; it is running fast.\n",
      encoding: "utf8",
    });
    assert.equal(badRun.status, 1);
    const parsedBad = JSON.parse(badRun.stdout);
    assert.equal(parsedBad.ok, false);
    assert.ok(parsedBad.issueCount >= 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("standing rules and skills carry 80% STE, hedge preservation, and comprehension ladder contracts", () => {
  const base = readFileSync(join(ROOT, "rules/base.mdc"), "utf8");
  assert.match(base, /80% ASD-STE100|80% STE/);
  assert.match(base, /modality|hedge/i);
  assert.match(base, /synonym/i);
  assert.match(base, /Mermaid/);

  const docSkill = readFileSync(join(ROOT, "skills/documentation-writer/SKILL.md"), "utf8");
  assert.match(docSkill, /lint-ste\.mjs/);

  const explainer = readFileSync(
    join(ROOT, "skills/subsystem-walkthrough/references/explainer-prompt.md"),
    "utf8",
  );
  assert.match(explainer, /sequenceDiagram|stateDiagram-v2/);
  assert.match(explainer, /Invariant/i);
});

// Cross-skill quality, hygiene, and Native Question UI invariants.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKILLS_DIR = join(ROOT, "skills");

const SKILL_NAMES = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, "SKILL.md")))
  .map((d) => d.name)
  .sort();

const INTERACTIVE_SKILLS = [
  "authoring-skills-and-rules",
  "deep-deliberation",
  "dissect",
  "execute",
  "inception",
  "release-deploy",
  "trl",
];

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

test("catalog ships 22 consolidated skills with matching frontmatter names and <500-line bodies", () => {
  assert.equal(SKILL_NAMES.length, 22);
  for (const name of SKILL_NAMES) {
    const md = readFileSync(join(SKILLS_DIR, name, "SKILL.md"), "utf8");
    const lines = md.split(/\r?\n/);
    assert.ok(lines.length < 500, `${name}/SKILL.md has ${lines.length} lines (keep <500)`);
    assert.match(md, new RegExp(`^name:\\s*${name}\\s*$`, "m"), `${name} frontmatter name mismatch`);
    assert.match(md, /^user-invocable:\s*true\s*$/m, `${name} must set user-invocable: true`);
    assert.doesNotMatch(md, /^when_to_use:/m, `${name} still has dead when_to_use frontmatter`);
    assert.doesNotMatch(md, /^invocation-type:/m, `${name} still has dead invocation-type frontmatter`);
  }
});

test("skills contain zero personal paths or private client brand leaks", () => {
  for (const file of walkFiles(SKILLS_DIR)) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /terrabath|Terra Bath|yappi\.ai|Yappi|Users\/ali/i, `Leak in ${file}`);
  }
  assert.equal(existsSync(join(SKILLS_DIR, "release-deploy", "projects")), false);
});

test("interactive skills invoke native Question UI tools and never embed pseudo-YAML prompt:/options: fences", () => {
  for (const name of INTERACTIVE_SKILLS) {
    const md = readFileSync(join(SKILLS_DIR, name, "SKILL.md"), "utf8");
    assert.match(
      md,
      /AskUserQuestion|AskQuestion|structured question tool/,
      `${name}/SKILL.md must instruct calling the host's native structured question tool`,
    );
    assert.doesNotMatch(
      md,
      /```(?:yaml|text)?\s*\nprompt:/,
      `${name}/SKILL.md still embeds a pseudo-YAML prompt:/options: fence`,
    );
  }

  const templates = readFileSync(
    join(SKILLS_DIR, "deep-deliberation", "references", "output_templates.md"),
    "utf8",
  );
  assert.doesNotMatch(templates, /^prompt:/m, "output_templates.md must not embed raw prompt: YAML");
});

test("base.mdc defines the cross-harness Native Question UI contract and checkpoint carve-out", () => {
  const base = readFileSync(join(ROOT, "rules", "base.mdc"), "utf8");
  for (const toolName of [
    "AskUserQuestion",
    "AskQuestion",
    "question",
    "request_user_input",
    "vscode_askQuestions",
    "ask_user",
  ]) {
    assert.match(base, new RegExp(toolName), `base.mdc missing ${toolName}`);
  }
  assert.match(base, /total options ≤4/);
  assert.match(base, /Unless an active skill or playbook defines an explicit interactive checkpoint/);
});

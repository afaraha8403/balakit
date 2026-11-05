// TRL skill contract: the panel stays blind and the overall score is the lowest row.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, "skills/trl", rel), "utf8");

/** Text inside ```text fences: what actually gets sent to an assessor. */
function promptBlocks(md) {
  return [...md.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
}

test("assessor prompts never carry the target, sealed score, or ledger", () => {
  const sent = promptBlocks(read("references/assessor-prompts.md"));
  assert.match(sent, /TRL_VERDICT/);
  assert.match(sent, /Never open `\.balakit\/`/);
  assert.doesNotMatch(sent, /\[[^\]]*target[^\]]*\]/i);
  assert.doesNotMatch(sent, /sealed|cycle \d|prior verdict|earlier verdict/i);
  assert.doesNotMatch(sent, /\.balakit\/trl/);
});

test("three lenses, each with its own prompt", () => {
  const md = read("references/assessor-prompts.md");
  for (const lens of ["cold", "audit", "skeptic"]) {
    assert.match(md, new RegExp(`LENS: ${lens}`));
  }
  assert.doesNotMatch(md.split("## Lens: cold")[1].split("## Lens: audit")[0], /DOSSIER/);
});

test("overall TRL is the minimum row and the panel beats the builder", () => {
  const body = read("SKILL.md");
  assert.match(body, /Overall = minimum row/);
  assert.match(body, /Never\s+average/);
  assert.match(body, /The panel level stands, whether it is above or below the builder's/);
  assert.match(body, /even under `--circuit`/);
});

test("every level 1-9 is defined with a provenance floor", () => {
  const scale = read("references/scale.md");
  for (let n = 1; n <= 9; n++) assert.match(scale, new RegExp(`^\\| ${n} \\|`, "m"));
  assert.match(scale, /TRL 9 · staged/);
  assert.match(scale, /TRL 9 · field/);
});

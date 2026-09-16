// Roster picker contract: Current default, same-family slots, slug shield.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

for (const skill of ["execute", "opinion"]) {
  test(`${skill} picker defaults to Current and allows same-family slots`, () => {
    const body = read(`skills/${skill}/SKILL.md`);
    assert.match(body, /Current model for all workers \(Recommended\)/);
    assert.match(body, /I'll assign each worker/);
    assert.match(body, /Same family may occupy more than one slot/);
    assert.doesNotMatch(body, /Do not pass `inherit` as a worker/);
    assert.doesNotMatch(body, /Do not spawn two workers from the same model family/);
  });

  test(`${skill} hosts.md keeps spawn ids out of the picker`, () => {
    const hosts = read(`skills/${skill}/references/hosts.md`);
    assert.match(hosts, /slug shield/i);
    assert.match(hosts, /Display label/);
    assert.match(hosts, /fam-openai/);
    assert.doesNotMatch(hosts, /gpt-5\.6-sol-high/);
    assert.doesNotMatch(hosts, /cursor-grok/);
    assert.doesNotMatch(hosts, /gemini-3\.7-flash-high/);
  });

  test(`${skill} worker prompt uses display names, not spawn ids`, () => {
    const prompt = read(`skills/${skill}/references/worker-prompt.md`);
    assert.match(prompt, /display name/);
    assert.doesNotMatch(prompt, /exact spawn name/);
  });
}

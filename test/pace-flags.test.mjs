// Pace skills advertise --brake and keep --circuit as a parse alias.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACE = ["dissect", "deep-deliberation", "inception"];

test("pace skills advertise --brake and keep --circuit as an alias", () => {
  for (const name of PACE) {
    const body = readFileSync(join(ROOT, "skills", name, "SKILL.md"), "utf8");
    assert.match(body, /`--brake`/, `${name} must advertise --brake`);
    assert.match(
      body,
      /`--circuit` \(alias of `--brake`\)/,
      `${name} must accept --circuit as alias of --brake`,
    );
    assert.match(
      body,
      new RegExp(`/${name} --brake `),
      `${name} footer must show /${name} --brake`,
    );
    assert.doesNotMatch(
      body,
      new RegExp(`/${name} --circuit `),
      `${name} must not advertise /${name} --circuit`,
    );
  }
});

test("docs advertise --brake and mention --circuit only as an alias", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  const skills = readFileSync(join(ROOT, "docs", "skills.md"), "utf8");
  assert.match(readme, /\/inception --brake /);
  assert.doesNotMatch(readme, /\/inception --circuit /);
  assert.match(skills, /`--brake`/);
  assert.match(skills, /`--circuit` is an alias of `--brake`/);
  // TRL keeps its own --circuit flag. That table is not the shared pace alias.
  const paceDocs = skills.replace(/### `trl`[\s\S]*?(?=\n## )/g, "");
  assert.doesNotMatch(paceDocs, /\| `--circuit` \|/);
});

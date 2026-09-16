// Copilot user-scope skill links (~/.copilot/skills → ~/.agents/skills).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  lstatSync,
  readlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  shouldLinkCopilotUserSkills,
  linkCopilotUserSkills,
  unlinkCopilotUserSkills,
  missingCopilotUserSkills,
} from "../bin/lib/copilot-native.mjs";

let home;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "balakit-copilot-home-"));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

function seedAgentSkill(name) {
  const dir = join(home, ".agents", "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `# ${name}\n`);
  return dir;
}

test("shouldLinkCopilotUserSkills is user-scope + copilot + non-empty skills", () => {
  assert.equal(shouldLinkCopilotUserSkills("user", ["copilot"], ["dissect"]), true);
  assert.equal(shouldLinkCopilotUserSkills("project", ["copilot"], ["dissect"]), false);
  assert.equal(shouldLinkCopilotUserSkills("user", ["cursor"], ["dissect"]), false);
  assert.equal(shouldLinkCopilotUserSkills("user", ["copilot"], []), false);
});

test("linkCopilotUserSkills symlinks ~/.copilot/skills to ~/.agents/skills", () => {
  seedAgentSkill("dissect");
  const { written, notes } = linkCopilotUserSkills(["dissect"], { home });
  const link = join(home, ".copilot", "skills", "dissect");
  const destDir = join(home, ".copilot", "skills");
  const target = join(home, ".agents", "skills", "dissect");
  assert.ok(written.some((w) => w.includes("dissect")));
  assert.equal(notes.length, 0);
  assert.ok(lstatSync(link).isSymbolicLink());
  assert.equal(readlinkSync(link), relative(destDir, target));
  assert.ok(existsSync(join(link, "SKILL.md")));

  const removed = unlinkCopilotUserSkills(["dissect"], { home });
  assert.ok(removed.removed.length);
  assert.equal(existsSync(link), false);
});

test("linkCopilotUserSkills skips missing skill trees", () => {
  const { notes, written } = linkCopilotUserSkills(["nope"], { home });
  assert.ok(notes.some((n) => /not present/.test(n)));
  assert.equal(written.length, 0);
  assert.equal(existsSync(join(home, ".copilot", "skills", "nope")), false);
});

test("linkCopilotUserSkills does not clobber a foreign directory", () => {
  seedAgentSkill("dissect");
  const dest = join(home, ".copilot", "skills", "dissect");
  mkdirSync(dest, { recursive: true });
  writeFileSync(join(dest, "mine.md"), "user dest\n");
  const { notes } = linkCopilotUserSkills(["dissect"], { home });
  assert.ok(notes.some((n) => /not a kit symlink/.test(n)));
  assert.equal(lstatSync(dest).isSymbolicLink(), false);
  assert.ok(existsSync(join(dest, "mine.md")));
  const unlinked = unlinkCopilotUserSkills(["dissect"], { home });
  assert.equal(unlinked.removed.length, 0);
  assert.ok(existsSync(join(dest, "mine.md")));
});

test("linkCopilotUserSkills is a no-op when the symlink is already correct", () => {
  seedAgentSkill("dissect");
  linkCopilotUserSkills(["dissect"], { home });
  const again = linkCopilotUserSkills(["dissect"], { home });
  const link = join(home, ".copilot", "skills", "dissect");
  assert.ok(again.written.some((w) => w.includes("dissect")));
  assert.ok(lstatSync(link).isSymbolicLink());
});

test("missingCopilotUserSkills lists names with no dest", () => {
  seedAgentSkill("dissect");
  assert.deepEqual(missingCopilotUserSkills(["dissect"], { home }), ["dissect"]);
  linkCopilotUserSkills(["dissect"], { home });
  assert.deepEqual(missingCopilotUserSkills(["dissect"], { home }), []);
});

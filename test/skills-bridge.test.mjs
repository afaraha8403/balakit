// Verified native skill installer + skills.sh allowlist + target resolution.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  lstatSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AGENTS } from "../bin/lib/agents.mjs";
import {
  SKILLS_SH_VERIFIED_IDS,
  SKILLS_CLI_VERSION,
  resolveSkillsShTargets,
  skillsAddCommand,
  smokeSkillsShAgents,
} from "../bin/lib/skills-bridge.mjs";
import {
  installSkills,
  removeSkills,
  pruneDroppedAgentSkillLinks,
  cleanLegacySkillsLock,
} from "../bin/lib/skills-install.mjs";

test("every registry skillsShId is on the verified allowlist", () => {
  assert.equal(SKILLS_CLI_VERSION, "native");
  const missing = [];
  for (const a of AGENTS) {
    if (!a.skillsShId) continue;
    if (!SKILLS_SH_VERIFIED_IDS.includes(a.skillsShId)) {
      missing.push(`${a.id}→${a.skillsShId}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `Add new skills.sh ids to SKILLS_SH_VERIFIED_IDS: ${missing.join(", ")}`,
  );
});

test("amazon-q maps to verified kiro-cli", () => {
  const { skillsShIds, skippedUnverified } = resolveSkillsShTargets(["amazon-q"]);
  assert.deepEqual(skillsShIds, ["kiro-cli"]);
  assert.deepEqual(skippedUnverified, []);
});

test("resolveSkillsShTargets skips agents with no skillsShId", () => {
  const { skillsShIds, skippedUnsupported } = resolveSkillsShTargets(["aider", "cursor"]);
  assert.deepEqual(skillsShIds, ["cursor"]);
  assert.ok(skippedUnsupported.includes("aider"));
});

test("skillsAddCommand uses native engine and only emits verified -a ids", () => {
  const cmd = skillsAddCommand(["dissect"], ["cursor", "amazon-q", "aider"], "project");
  assert.match(cmd, /^balakit-skills@native add /);
  assert.match(cmd, /-a cursor/);
  assert.match(cmd, /-a kiro-cli/);
  assert.doesNotMatch(cmd, /-a aider/);
  assert.doesNotMatch(cmd, /-a amazon-q/);
});

test("smoke: native skill installer accepts every verified agent id offline", () => {
  const r = smokeSkillsShAgents(SKILLS_SH_VERIFIED_IDS);
  assert.equal(r.ok, true, `Rejected agent id(s).\nstatus=${r.status}\n${r.stderr}`);
});

test("installSkills protects locally edited skill trees, backs up on --force, and prunes dropped agent links", () => {
  const cwd = mkdtempSync(join(tmpdir(), "balakit-native-skills-"));
  const home = mkdtempSync(join(tmpdir(), "balakit-native-home-"));
  try {
    // Seed a legacy skills-lock.json pointing at balakit and a foreign skill folder.
    writeFileSync(
      join(cwd, "skills-lock.json"),
      JSON.stringify({ skills: { dissect: { source: "/tmp/node_modules/balakit" } } }),
    );
    mkdirSync(join(cwd, ".claude", "skills", "verify-app"), { recursive: true });
    writeFileSync(join(cwd, ".claude", "skills", "verify-app", "custom.md"), "user folder\n");

    const first = installSkills(["dissect", "verify-app"], {
      agentIds: ["cursor", "claude-code", "copilot"],
      scope: "project",
      cwd,
      home,
    });
    assert.equal(first.ok, true);
    assert.ok(existsSync(join(cwd, ".agents", "skills", "dissect", "SKILL.md")));
    assert.ok(lstatSync(join(cwd, ".cursor", "skills", "dissect")).isSymbolicLink());
    assert.ok(lstatSync(join(cwd, ".claude", "skills", "dissect")).isSymbolicLink());
    // Legacy skills-lock.json balakit entry was cleaned automatically on install.
    assert.equal(existsSync(join(cwd, "skills-lock.json")), false);
    // Foreign non-symlink folder in .claude/skills/verify-app must not be clobbered without --force.
    assert.equal(lstatSync(join(cwd, ".claude", "skills", "verify-app")).isSymbolicLink(), false);
    assert.ok(existsSync(join(cwd, ".claude", "skills", "verify-app", "custom.md")));

    // Edit canonical dissect/SKILL.md and verify re-install keeps user edit until --force.
    const dissectMd = join(cwd, ".agents", "skills", "dissect", "SKILL.md");
    writeFileSync(dissectMd, "# user edited dissect\n");
    const second = installSkills(["dissect"], {
      agentIds: ["cursor"],
      scope: "project",
      cwd,
      home,
      guard: { files: first.files, legacy: false, force: false },
    });
    assert.ok(second.kept.some((k) => k.includes("dissect")));
    assert.equal(readFileSync(dissectMd, "utf8"), "# user edited dissect\n");

    // --force backs up to dissect.bak and restores packaged SKILL.md.
    const forced = installSkills(["dissect"], {
      agentIds: ["cursor"],
      scope: "project",
      cwd,
      home,
      guard: { files: first.files, legacy: false, force: true },
    });
    assert.equal(forced.kept.length, 0);
    assert.equal(readFileSync(join(cwd, ".agents", "skills", "dissect.bak", "SKILL.md"), "utf8"), "# user edited dissect\n");
    assert.match(readFileSync(dissectMd, "utf8"), /name: dissect/);

    // Prune dropped agents (claude-code dropped when switching to cursor only).
    const pruned = pruneDroppedAgentSkillLinks(["dissect"], ["cursor"], "project", {
      cwd,
      home,
      files: forced.files,
    });
    assert.ok(pruned.removed.some((p) => p.includes(".claude/skills/dissect")));
    assert.equal(existsSync(join(cwd, ".claude", "skills", "dissect")), false);

    // Seed another legacy balakit skills-lock.json and clean explicitly.
    writeFileSync(
      join(cwd, "skills-lock.json"),
      JSON.stringify({ skills: { dissect: { source: "/tmp/node_modules/balakit" } } }),
    );
    assert.equal(cleanLegacySkillsLock(cwd), true);
    assert.equal(existsSync(join(cwd, "skills-lock.json")), false);

    // Remove skill cleanly.
    const rem = removeSkills(["dissect"], {
      scope: "project",
      cwd,
      home,
      guard: { files: forced.files, legacy: false, force: false },
    });
    assert.equal(rem.ok, true);
    assert.equal(existsSync(join(cwd, ".agents", "skills", "dissect")), false);
    assert.equal(existsSync(join(cwd, ".cursor", "skills", "dissect")), false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

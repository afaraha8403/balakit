// End-to-end: spawn the real CLI against an isolated cwd + HOME.
// Catches the consumer bugs: no always-on .mdc, no user-home writes,
// skills never got -g, plugins never copied to ~/.cursor/plugins/local,
// and .cursor/skills never linked after a project skill install.
//
// Skills go through the real bundled skills CLI with this package as a local
// source, so these runs are offline and exercise the same path users get.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, lstatSync, readlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

let cwd;
let home;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "balakit-e2e-proj-"));
  home = mkdtempSync(join(tmpdir(), "balakit-e2e-home-"));
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

function run(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      CI: "1",
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
  });
}

function out(r) {
  return `${r.stdout || ""}\n${r.stderr || ""}`;
}

test("e2e: cursor-only project init writes .cursor/rules/*.mdc without duplicate AGENTS.md", () => {
  const r = run(["init", "-y", "--scope", "project", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));

  assert.equal(existsSync(join(cwd, "AGENTS.md")), false, "Cursor-only avoids duplicate AGENTS.md");
  assert.equal(existsSync(join(cwd, "CLAUDE.md")), false, "Claude Code was not picked");
  for (const name of ["base", "testing", "comments", "changelog"]) {
    assert.ok(existsSync(join(cwd, ".cursor", "rules", `${name}.mdc`)), name);
  }
  assert.equal(existsSync(join(cwd, ".cursor", "rules", "release.mdc")), false, "release folded into base");

  const manifest = JSON.parse(readFileSync(join(cwd, ".balakit", "installed.json"), "utf8"));
  assert.equal(manifest.schema, 4);
  assert.ok(manifest.rules.includes("base"));
  assert.ok(manifest.rules.includes("testing"));
  assert.ok(manifest.skills.includes("dissect"));
  assert.ok(manifest.skills.includes("verify-app"));
  assert.ok(existsSync(join(cwd, ".agents", "skills", "dissect", "SKILL.md")));
  assert.ok(existsSync(join(cwd, ".cursor", "skills", "dissect", "SKILL.md")));

  assert.equal(existsSync(join(home, ".cursor", "plugins", "local")), false);
  assert.equal(existsSync(join(home, ".cursor", "rules", "base.mdc")), false);
  assert.equal(existsSync(join(cwd, ".github", "instructions")), false);
});

test("e2e: user init writes only the picked tools' home files; plugin packs are opt-in", () => {
  const r = run(["init", "-y", "--scope", "user", "--agents", "cursor,opencode"]);
  assert.equal(r.status, 0, out(r));

  assert.ok(existsSync(join(home, ".cursor", "rules", "base.mdc")));
  assert.ok(existsSync(join(home, ".config", "opencode", "AGENTS.md")));
  assert.equal(existsSync(join(home, ".claude")), false, "Claude Code was not picked");
  assert.equal(existsSync(join(home, ".codex")), false, "Codex was not picked");
  assert.ok(existsSync(join(home, ".balakit", "installed.json")));
  assert.equal(existsSync(join(home, ".cursor", "plugins", "local")), false);

  const withPlugins = run(["update", "-y", "--scope", "user", "--cursor-plugins"]);
  assert.equal(withPlugins.status, 0, out(withPlugins));
  assert.ok(existsSync(join(home, ".cursor", "plugins", "local", "balakit-core")));
  assert.ok(existsSync(join(home, ".cursor", "plugins", "local", "balakit-seo-skills")));
  const again = run(["update", "-y", "--scope", "user"]);
  assert.match(out(again), /Cursor local plugins/, "an opted-in copy stays maintained");
  const rm = run(["remove", "--cursor-plugins", "-y"]);
  assert.equal(rm.status, 0, out(rm));
  assert.equal(existsSync(join(home, ".cursor", "plugins", "local", "balakit-core")), false);
  assert.ok(existsSync(join(home, ".agents", "skills", "dissect", "SKILL.md")));

  assert.equal(existsSync(join(cwd, "AGENTS.md")), false);
  assert.equal(existsSync(join(cwd, ".balakit", "installed.json")), false);
});

test("e2e: add seo-ai-search with cursor+claude-code+copilot prunes redundant always-on .mdc and writes scoped twins", () => {
  assert.equal(run(["init", "-y", "--scope", "project", "--agents", "cursor"]).status, 0);
  assert.ok(existsSync(join(cwd, ".cursor", "rules", "base.mdc")));
  const r = run([
    "add",
    "seo-ai-search",
    "-y",
    "--agents",
    "cursor,claude-code,copilot",
  ]);
  assert.equal(r.status, 0, out(r));

  // Copilot activates AGENTS.md, so redundant always-on .cursor/rules/base.mdc is pruned (single injection)!
  assert.equal(existsSync(join(cwd, ".cursor", "rules", "base.mdc")), false);
  assert.ok(existsSync(join(cwd, ".cursor", "rules", "changelog.mdc")));
  assert.ok(existsSync(join(cwd, ".cursor", "rules", "seo-ai-search.mdc")));
  const claude = join(cwd, ".claude", "rules", "seo-ai-search.md");
  const copilot = join(cwd, ".github", "instructions", "seo-ai-search.instructions.md");
  assert.ok(existsSync(claude));
  assert.ok(existsSync(copilot));
  assert.match(readFileSync(claude, "utf8"), /^paths:/m);
  assert.match(readFileSync(copilot, "utf8"), /applyTo:/);
  assert.match(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /\.balakit\/rules\/seo-ai-search\.md/);
  assert.ok(existsSync(join(cwd, ".balakit", "rules", "seo-ai-search.md")));
});

test("e2e: project skill add installs from the package then links .cursor/skills", () => {
  const r = run(["add", "dissect", "-y", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));

  const agentsSkill = join(cwd, ".agents", "skills", "dissect", "SKILL.md");
  const cursorSkill = join(cwd, ".cursor", "skills", "dissect");
  assert.ok(existsSync(agentsSkill), "skills CLI should land in .agents/skills");
  assert.ok(existsSync(join(cursorSkill, "SKILL.md")), "CLI should link or copy .cursor/skills/dissect");
  const manifest = JSON.parse(readFileSync(join(cwd, ".balakit", "installed.json"), "utf8"));
  assert.ok(manifest.skills.includes("dissect"));
  assert.equal(existsSync(join(home, ".cursor", "plugins", "local")), false);
});

test("e2e: user skill add targets user scope (dry-run) and installs user-wide", () => {
  const preview = run(["add", "dissect", "--dry-run", "--scope", "user", "--agents", "cursor"]);
  assert.equal(preview.status, 0, out(preview));
  assert.match(out(preview), /~\/\.agents\/skills/);
  const projectPreview = run(["add", "dissect", "--dry-run", "--agents", "cursor"]);
  assert.equal(projectPreview.status, 0, out(projectPreview));
  assert.doesNotMatch(out(projectPreview), /~\/\.agents\/skills/);

  const r = run(["add", "dissect", "-y", "--scope", "user", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));
  assert.ok(existsSync(join(home, ".agents", "skills", "dissect", "SKILL.md")));
  assert.equal(existsSync(join(home, ".cursor", "plugins", "local")), false);
  const glob = JSON.parse(readFileSync(join(home, ".balakit", "installed.json"), "utf8"));
  assert.ok(glob.skills.includes("dissect"));
  assert.equal(existsSync(join(home, ".copilot", "skills", "dissect")), false);
});

test("e2e: status shows project and home surfaces; remove one rule keeps the rest", () => {
  assert.equal(run(["init", "-y", "--scope", "project", "--agents", "cursor,codex"]).status, 0);
  const status = run(["status"]);
  assert.equal(status.status, 0, out(status));
  assert.match(out(status), /\.cursor\/rules/);
  assert.match(out(status), /base/);

  const rm = run(["remove", "testing", "-y", "--scope", "project"]);
  assert.equal(rm.status, 0, out(rm));
  assert.equal(existsSync(join(cwd, ".cursor", "rules", "testing.mdc")), false);
  assert.ok(existsSync(join(cwd, ".cursor", "rules", "changelog.mdc")));
  assert.match(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /Meta-Principle/);
  assert.doesNotMatch(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /Every test must earn its place/);
});

test("e2e: --rules-only init skips default skills; doctor is kit health", () => {
  const r = run(["init", "-y", "--rules-only", "--scope", "project", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));
  const manifest = JSON.parse(readFileSync(join(cwd, ".balakit", "installed.json"), "utf8"));
  assert.ok(manifest.rules.includes("base"));
  assert.equal((manifest.skills || []).includes("dissect"), false);
  assert.equal(existsSync(join(cwd, ".agents", "skills", "dissect")), false);

  const doctor = run(["doctor"]);
  assert.equal(doctor.status, 0, out(doctor));
  assert.doesNotMatch(out(doctor), /Mental has moved out of Balakit/);
  assert.match(out(doctor), /Kit looks healthy/);
});

test("e2e: --personal still exits as Mental-moved", () => {
  const r = run(["init", "--personal"]);
  assert.notEqual(r.status, 0);
  assert.match(out(r), /Mental has moved/);
});

test("e2e: user skill add with copilot links ~/.copilot/skills; remove drops the link", () => {
  const r = run(["add", "dissect", "-y", "--scope", "user", "--agents", "copilot"]);
  assert.equal(r.status, 0, out(r));

  const agentsSkill = join(home, ".agents", "skills", "dissect");
  const copilotSkill = join(home, ".copilot", "skills", "dissect");
  assert.ok(existsSync(join(agentsSkill, "SKILL.md")), "skills CLI should land in ~/.agents/skills");
  assert.ok(lstatSync(copilotSkill).isSymbolicLink(), "CLI should symlink ~/.copilot/skills/dissect");
  assert.equal(
    readlinkSync(copilotSkill),
    relative(join(home, ".copilot", "skills"), agentsSkill),
  );

  const glob = JSON.parse(readFileSync(join(home, ".balakit", "installed.json"), "utf8"));
  assert.ok(glob.skills.includes("dissect"));
  assert.ok(glob.agents.includes("copilot"));
  assert.ok(glob.surfaces.includes("~/.copilot/skills"));

  const doctorOk = run(["doctor"]);
  assert.equal(doctorOk.status, 0, out(doctorOk));
  assert.match(out(doctorOk), /Kit looks healthy/);

  rmSync(join(home, ".copilot", "skills"), { recursive: true, force: true });
  const doctorFail = run(["doctor"]);
  assert.equal(doctorFail.status, 1, out(doctorFail));
  assert.match(out(doctorFail), /missing or unlinked in ~\/\.agents\/skills: dissect/);
  assert.match(out(doctorFail), /balakit@latest doctor --fix/);

  const healed = run(["update", "-y", "--scope", "user"]);
  assert.equal(healed.status, 0, out(healed));
  assert.ok(lstatSync(copilotSkill).isSymbolicLink(), "update should restore Copilot skill links");

  const rm = run(["remove", "dissect", "-y", "--scope", "user"]);
  assert.equal(rm.status, 0, out(rm));
  assert.equal(existsSync(copilotSkill), false);
});


test("e2e: a prompt with no terminal exits 2 and writes nothing", () => {
  const r = run(["add", "base"]);
  assert.equal(r.status, 2, out(r));
  assert.match(out(r), /no interactive terminal/);
  assert.equal(existsSync(join(cwd, "AGENTS.md")), false);
  const wizard = run([]);
  assert.equal(wizard.status, 2, out(wizard));
});

test("e2e: a mistyped command errors instead of opening the wizard", () => {
  const r = run(["stauts"]);
  assert.equal(r.status, 1, out(r));
  assert.match(out(r), /Unknown command: stauts — did you mean `balakit status`\?/);
  assert.doesNotMatch(out(r), /guided setup/);
});

test("e2e: init keeps a Cursor rule the user wrote; --force replaces it with a .bak", () => {
  const mdc = join(cwd, ".cursor", "rules", "base.mdc");
  mkdirSync(join(cwd, ".cursor", "rules"), { recursive: true });
  writeFileSync(mdc, "team rule\n");
  const r = run(["init", "-y", "--rules-only", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));
  assert.equal(readFileSync(mdc, "utf8"), "team rule\n");
  assert.match(out(r), /Kept 1 file\(s\) you changed/);

  const forced = run(["update", "-y", "--force"]);
  assert.equal(forced.status, 0, out(forced));
  assert.equal(readFileSync(`${mdc}.bak`, "utf8"), "team rule\n");
  assert.match(readFileSync(mdc, "utf8"), /alwaysApply: true/);
});

test("e2e: doctor catches a deleted skill and rule file; doctor --fix repairs both", () => {
  assert.equal(run(["init", "-y", "--agents", "cursor,claude-code"]).status, 0);
  assert.equal(run(["doctor"]).status, 0);

  rmSync(join(cwd, ".agents", "skills", "dissect"), { recursive: true, force: true });
  rmSync(join(cwd, ".cursor", "rules", "testing.mdc"));
  const sick = run(["doctor"]);
  assert.equal(sick.status, 1, out(sick));
  assert.match(out(sick), /missing or unlinked in \.agents\/skills: dissect/);
  assert.match(out(sick), /Missing \.cursor\/rules\/testing\.mdc/);
  assert.match(out(sick), /Broken skill link\(s\): .*\.claude\/skills\/dissect/);

  const fixed = run(["doctor", "--fix"]);
  assert.equal(fixed.status, 0, out(fixed));
  assert.ok(existsSync(join(cwd, ".agents", "skills", "dissect", "SKILL.md")));
  assert.ok(existsSync(join(cwd, ".cursor", "rules", "testing.mdc")));
  const healthy = run(["doctor"]);
  assert.equal(healthy.status, 0, out(healthy));
});

test("e2e: doctor warns (exit 0) when the managed block was edited by hand", () => {
  assert.equal(run(["init", "-y", "--rules-only", "--agents", "codex"]).status, 0);
  const file = join(cwd, "AGENTS.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("Meta-Principle", "Meta Principle (edited)"));
  const r = run(["doctor"]);
  assert.equal(r.status, 0, out(r));
  assert.match(out(r), /AGENTS\.md block differs from this balakit version/);
});

test("e2e: schema v3 upgrade sweeps retired skills, rules, plugins, and legacy skills-lock.json", () => {
  // Simulate a pre-upgrade v1.21.0 schema-3 project + user Cursor plugin install.
  mkdirSync(join(cwd, ".balakit"), { recursive: true });
  mkdirSync(join(cwd, ".cursor", "rules"), { recursive: true });
  writeFileSync(join(cwd, ".cursor", "rules", "release.mdc"), "legacy release rule\n");
  writeFileSync(join(cwd, ".cursor", "rules", "base.mdc"), "legacy base rule\n");
  for (const oldSkill of ["nlm-skill", "opinion", "unmatched-workflow", "generating-app-verify"]) {
    mkdirSync(join(cwd, ".agents", "skills", oldSkill), { recursive: true });
    writeFileSync(join(cwd, ".agents", "skills", oldSkill, "SKILL.md"), `# ${oldSkill}\n`);
    mkdirSync(join(cwd, ".cursor", "skills", oldSkill), { recursive: true });
    writeFileSync(join(cwd, ".cursor", "skills", oldSkill, "SKILL.md"), `# ${oldSkill}\n`);
  }
  writeFileSync(
    join(cwd, "skills-lock.json"),
    JSON.stringify({ skills: { opinion: { source: "/tmp/balakit" } } }),
  );
  writeFileSync(
    join(cwd, ".balakit", "installed.json"),
    JSON.stringify({
      schema: 3,
      version: "1.21.0",
      rules: ["base", "release", "changelog"],
      skills: ["nlm-skill", "opinion", "unmatched-workflow", "generating-app-verify"],
      agents: ["cursor", "codex"],
      surfaces: ["AGENTS.md", ".cursor/rules/*.mdc"],
      files: {},
    }),
  );

  // Also seed retired balakit-nlm in ~/.cursor/plugins/local
  mkdirSync(join(home, ".balakit"), { recursive: true });
  mkdirSync(join(home, ".cursor", "plugins", "local", "balakit-nlm"), { recursive: true });
  writeFileSync(
    join(home, ".balakit", "installed.json"),
    JSON.stringify({
      schema: 3,
      version: "1.21.0",
      rules: ["base"],
      skills: ["nlm-skill"],
      agents: ["cursor"],
      surfaces: ["~/.cursor/rules/*.mdc", "~/.cursor/plugins/local"],
      files: {},
    }),
  );

  // Doctor detects schema v3 + retired artifacts before repair.
  const before = run(["doctor"]);
  assert.equal(before.status, 1, out(before));

  // doctor --fix migrates both scopes cleanly!
  const fix = run(["doctor", "--fix"]);
  assert.equal(fix.status, 0, out(fix));

  // Verify retired artifacts are 100% gone and new canonical ones exist!
  assert.equal(existsSync(join(cwd, "skills-lock.json")), false);
  assert.equal(existsSync(join(cwd, ".cursor", "rules", "release.mdc")), false);
  // Because codex+cursor wrote AGENTS.md, redundant base.mdc was also pruned!
  assert.equal(existsSync(join(cwd, ".cursor", "rules", "base.mdc")), false);
  assert.ok(existsSync(join(cwd, ".cursor", "rules", "changelog.mdc")));
  for (const oldSkill of ["nlm-skill", "opinion", "unmatched-workflow", "generating-app-verify"]) {
    assert.equal(existsSync(join(cwd, ".agents", "skills", oldSkill)), false, oldSkill);
    assert.equal(existsSync(join(cwd, ".cursor", "skills", oldSkill)), false, oldSkill);
  }
  for (const newSkill of ["notebooklm", "execute", "kit-workflows", "verify-app"]) {
    assert.ok(existsSync(join(cwd, ".agents", "skills", newSkill, "SKILL.md")), newSkill);
    assert.ok(existsSync(join(cwd, ".cursor", "skills", newSkill, "SKILL.md")), newSkill);
  }
  assert.equal(existsSync(join(home, ".cursor", "plugins", "local", "balakit-nlm")), false);
  assert.ok(existsSync(join(home, ".cursor", "plugins", "local", "balakit-notebooklm")));

  const projManifest = JSON.parse(readFileSync(join(cwd, ".balakit", "installed.json"), "utf8"));
  assert.equal(projManifest.schema, 4);
  assert.deepEqual(projManifest.rules, ["base", "changelog"]);
  assert.deepEqual(projManifest.skills, ["execute", "kit-workflows", "notebooklm", "verify-app"]);

  // Doctor is now 100% green (with dual-scope overlap warning exit 0).
  const after = run(["doctor"]);
  assert.equal(after.status, 0, out(after));
  assert.match(out(after), /Duplicate kit items installed in BOTH user and project scope: rules \(base\)/);
});

test("e2e: a failed skills run does not remember the failed tools", () => {
  const r = run(["add", "dissect", "-y", "--agents", "aider"]);
  assert.equal(r.status, 1, out(r));
  assert.match(out(r), /None of the selected tools can receive skills/);
  const file = join(cwd, ".balakit", "installed.json");
  if (existsSync(file)) {
    const m = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(m.agents.includes("aider"), false);
  }
});

test("e2e: update with no --scope refreshes the user scope too", () => {
  assert.equal(run(["add", "dissect", "-y", "--scope", "user", "--agents", "claude-code"]).status, 0);
  const skill = join(home, ".claude", "skills", "dissect");
  assert.ok(existsSync(join(skill, "SKILL.md")));
  rmSync(skill, { recursive: true, force: true });
  const sick = run(["doctor"]);
  assert.equal(sick.status, 1, out(sick));
  const r = run(["update", "-y"]);
  assert.equal(r.status, 0, out(r));
  assert.ok(existsSync(join(skill, "SKILL.md")));
});

test("e2e: --agents claude-code writes CLAUDE.md only — no AGENTS.md or .cursor", () => {
  const r = run(["init", "-y", "--rules-only", "--agents", "claude-code"]);
  assert.equal(r.status, 0, out(r));
  assert.ok(existsSync(join(cwd, "CLAUDE.md")));
  assert.equal(existsSync(join(cwd, "AGENTS.md")), false);
  assert.equal(existsSync(join(cwd, ".cursor")), false);
});

test("e2e: later runs use the recorded tools, not whatever is detected", () => {
  assert.equal(run(["init", "-y", "--rules-only", "--agents", "claude-code"]).status, 0);
  mkdirSync(join(cwd, ".cursor"));
  const r = run(["add", "testing", "-y"]);
  assert.equal(r.status, 0, out(r));
  assert.match(out(r), /Tools: Claude Code\s+\(as recorded last time\)/);
  assert.equal(existsSync(join(cwd, ".cursor", "rules")), false);
});

test("e2e: init with names installs only those", () => {
  const r = run(["init", "base", "dissect", "-y", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));
  const m = JSON.parse(readFileSync(join(cwd, ".balakit", "installed.json"), "utf8"));
  assert.deepEqual(m.rules, ["base"]);
  assert.deepEqual(m.skills, ["dissect"]);
});

test("e2e: a bare .github folder does not count as Copilot", () => {
  mkdirSync(join(cwd, ".github", "workflows"), { recursive: true });
  const r = run(["list"]);
  assert.doesNotMatch(out(r), /^\s*\* copilot/m);
});

test("e2e: help <command> and <command> --help print that command's help", () => {
  for (const args of [["help", "init"], ["init", "--help"]]) {
    const r = run(args);
    assert.equal(r.status, 0, out(r));
    assert.match(r.stdout, /^Usage: balakit init \[names\.\.\.\]/);
  }
});

test("e2e: doctor, status and list --json are parseable and match disk", () => {
  assert.equal(run(["init", "-y", "--agents", "claude-code"]).status, 0);
  rmSync(join(cwd, ".claude", "skills", "dissect"), { recursive: true, force: true });
  const d = run(["doctor", "--json"]);
  assert.equal(d.status, 1);
  const doc = JSON.parse(d.stdout);
  assert.equal(doc.ok, false);
  assert.ok(doc.scopes.find((x) => x.scope === "project").skills.missing.includes("dissect") || doc.issues.some((i) => i.includes("dissect")));

  const st = JSON.parse(run(["status", "--json"]).stdout);
  assert.deepEqual(st.scopes.find((x) => x.scope === "project").manifest.agents, ["claude-code"]);
  const ls = JSON.parse(run(["list", "--json"]).stdout);
  assert.ok(ls.skills.some((x) => x.name === "trl"));
  assert.ok(ls.tools.some((x) => x.id === "copilot" && x.skills));
});

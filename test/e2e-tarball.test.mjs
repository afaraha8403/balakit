/**
 * Full-stack E2E tests against the packed npm tarball (`npm pack`).
 *
 * Proves that an external consumer installing the published tarball (without
 * repo-only files such as `plugins/` or `scripts/`) can run every CLI flow
 * end-to-end across all 6 primary AI harnesses.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const ALL_SIX_HARNESSES = "cursor,claude-code,codex,opencode,copilot,gemini-cli";

let packRoot;
let packedCli;

before(() => {
  packRoot = mkdtempSync(join(tmpdir(), "balakit-e2e-pack-"));
  const isWin = process.platform === "win32";
  const packed = spawnSync(
    isWin ? "npm.cmd" : "npm",
    ["pack", "--pack-destination", packRoot, "--quiet"],
    {
      cwd: ROOT,
      encoding: "utf8",
      shell: isWin,
    },
  );
  assert.equal(packed.status, 0, `npm pack failed:\n${packed.stderr}\n${packed.stdout}`);
  const tgzName = packed.stdout.trim().split(/\r?\n/).pop();
  assert.ok(tgzName?.endsWith(".tgz"), `Unexpected npm pack output: ${packed.stdout}`);

  const untar = spawnSync("tar", ["-xzf", tgzName], {
    cwd: packRoot,
    encoding: "utf8",
  });
  assert.equal(untar.status, 0, `tar extract failed:\n${untar.stderr}`);
  packedCli = join(packRoot, "package", "bin", "cli.mjs");
  assert.ok(existsSync(packedCli), "Packed tarball must contain package/bin/cli.mjs");
  // Verify tarball stays slim and omits repo-only generated plugins/ tree.
  assert.equal(existsSync(join(packRoot, "package", "plugins")), false);
  // Link runtime dependencies offline so CI needs no network during tests.
  symlinkSync(join(ROOT, "node_modules"), join(packRoot, "package", "node_modules"), "junction");
});

after(() => {
  if (packRoot) rmSync(packRoot, { recursive: true, force: true });
});

function runPacked(args, { cwd, home }) {
  return spawnSync(process.execPath, [packedCli, ...args], {
    cwd,
    env: { ...process.env, HOME: home, USERPROFILE: home, NO_COLOR: "1", CI: "1" },
    encoding: "utf8",
  });
}

function out(r) {
  return `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
}

test("e2e tarball: fresh user-scope install across all 6 harnesses + --cursor-plugins from slim package", () => {
  const cwd = mkdtempSync(join(tmpdir(), "balakit-e2e-repo-"));
  const home = mkdtempSync(join(tmpdir(), "balakit-e2e-home-"));
  try {
    const res = runPacked(
      ["init", "-y", "--scope", "user", "--agents", ALL_SIX_HARNESSES, "--cursor-plugins"],
      { cwd, home },
    );
    assert.equal(res.status, 0, out(res));

    // Every user-scope standing instruction target exists for all 6 harnesses.
    for (const rel of [
      ".claude/CLAUDE.md",
      ".codex/AGENTS.md",
      ".config/opencode/AGENTS.md",
      ".copilot/copilot-instructions.md",
      ".gemini/GEMINI.md",
      ".cursor/rules/base.mdc",
      ".cursor/rules/testing.mdc",
      ".cursor/rules/comments.mdc",
      ".cursor/rules/changelog.mdc",
      ".balakit/rules/changelog.md",
    ]) {
      assert.ok(existsSync(join(home, rel)), `Missing user rule artifact: ~/${rel}`);
    }

    // Canonical ~/.agents/skills + symlinks in all 6 per-harness user skill directories.
    assert.ok(existsSync(join(home, ".agents", "skills", "inception", "SKILL.md")));
    for (const linkDir of [
      ".cursor/skills",
      ".claude/skills",
      ".codex/skills",
      ".config/opencode/skills",
      ".copilot/skills",
      ".gemini/skills",
    ]) {
      const link = join(home, linkDir, "inception");
      assert.ok(lstatSync(link).isSymbolicLink(), `Expected symlink at ~/${linkDir}/inception`);
      assert.ok(existsSync(join(link, "SKILL.md")));
    }

    // --cursor-plugins materialized all 7 plugin packs directly from packaged rules/ + skills/!
    for (const pack of [
      "balakit-core",
      "balakit-seo",
      "balakit-engineering",
      "balakit-seo-skills",
      "balakit-marketing",
      "balakit-media",
      "balakit-notebooklm",
    ]) {
      assert.ok(
        existsSync(join(home, ".cursor", "plugins", "local", pack, ".cursor-plugin", "plugin.json")),
        `Missing materialized Cursor plugin: ${pack}`,
      );
    }

    const doc = runPacked(["doctor", "--json"], { cwd, home });
    assert.equal(doc.status, 0, out(doc));
    const report = JSON.parse(doc.stdout);
    assert.equal(report.ok, true);
    assert.deepEqual(report.issues, []);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test("e2e tarball: real-world v1.21.0 schema-3 global manifest upgrades cleanly to v4 across 6 harnesses", () => {
  const cwd = mkdtempSync(join(tmpdir(), "balakit-e2e-upg-repo-"));
  const home = mkdtempSync(join(tmpdir(), "balakit-e2e-upg-home-"));
  try {
    // Mirror an actual v1.21.0 user-scope install: rule hashes present, skill hashes absent,
    // retired rule (`release`), retired skills (`opinion`, `unmatched-workflow`,
    // `generating-app-verify`, `refreshing-app-verify`, `nlm-skill`), and retired plugin (`balakit-nlm`).
    mkdirSync(join(home, ".balakit"), { recursive: true });
    mkdirSync(join(home, ".cursor", "rules"), { recursive: true });
    mkdirSync(join(home, ".cursor", "plugins", "local", "balakit-nlm"), { recursive: true });
    const legacyBase = "legacy base\n";
    const legacyRelease = "legacy release\n";
    writeFileSync(join(home, ".cursor", "rules", "base.mdc"), legacyBase);
    writeFileSync(join(home, ".cursor", "rules", "release.mdc"), legacyRelease);

    const retiredSkills = [
      "generating-app-verify",
      "refreshing-app-verify",
      "opinion",
      "unmatched-workflow",
      "nlm-skill",
    ];
    for (const s of [...retiredSkills, "dissect", "mental"]) {
      mkdirSync(join(home, ".agents", "skills", s), { recursive: true });
      writeFileSync(join(home, ".agents", "skills", s, "SKILL.md"), `# old ${s}\n`);
    }
    writeFileSync(join(home, ".cursor", "rules", "mental.mdc"), "standalone mental cli rule\n");

    // Seed non-empty rule file hashes (exact shape of v1.21.0 installed.json).
    const sha = (txt) => createHash("sha256").update(txt).digest("hex");
    writeFileSync(
      join(home, ".balakit", "installed.json"),
      JSON.stringify(
        {
          schema: 3,
          rules: ["base", "changelog", "comments", "release", "testing"],
          skills: ["dissect", ...retiredSkills],
          agents: ["claude-code", "codex", "copilot", "cursor", "gemini-cli", "opencode"],
          surfaces: [
            "~/.claude/CLAUDE.md",
            "~/.codex/AGENTS.md",
            "~/.config/opencode/AGENTS.md",
            "~/.copilot/skills",
            "~/.cursor/plugins/local",
            "~/.cursor/rules/base.mdc",
            "~/.cursor/rules/release.mdc",
          ],
          files: {
            "~/.cursor/rules/base.mdc": sha(legacyBase),
            "~/.cursor/rules/release.mdc": sha(legacyRelease),
          },
          mentalTooling: null,
          mentalDataPolicy: null,
          version: "1.21.0",
        },
        null,
        2,
      ),
    );

    const up = runPacked(["update", "-y", "--scope", "user", "--force"], { cwd, home });
    assert.equal(up.status, 0, out(up));

    // Retired rule, retired skills, and retired Cursor plugin are swept.
    assert.equal(existsSync(join(home, ".cursor", "rules", "release.mdc")), false);
    assert.equal(existsSync(join(home, ".cursor", "plugins", "local", "balakit-nlm")), false);
    for (const s of retiredSkills) {
      assert.equal(existsSync(join(home, ".agents", "skills", s)), false, `Ghost skill remained: ${s}`);
    }

    // Consolidated replacements + upgraded dissect + new Copilot/Gemini standing files are live!
    for (const s of ["dissect", "verify-app", "execute", "kit-workflows", "notebooklm"]) {
      const md = readFileSync(join(home, ".agents", "skills", s, "SKILL.md"), "utf8");
      assert.match(md, new RegExp(`^name:\\s*${s}\\s*$`, "m"));
      assert.ok(lstatSync(join(home, ".copilot", "skills", s)).isSymbolicLink());
      assert.ok(lstatSync(join(home, ".gemini", "skills", s)).isSymbolicLink());
    }
    assert.ok(existsSync(join(home, ".copilot", "copilot-instructions.md")));
    assert.ok(existsSync(join(home, ".gemini", "GEMINI.md")));
    assert.ok(existsSync(join(home, ".cursor", "plugins", "local", "balakit-notebooklm")));

    const manifest = JSON.parse(readFileSync(join(home, ".balakit", "installed.json"), "utf8"));
    assert.equal(manifest.schema, 4);
    assert.deepEqual(manifest.rules, ["base", "changelog", "comments", "testing"]);
    assert.deepEqual(manifest.skills, ["dissect", "execute", "kit-workflows", "notebooklm", "verify-app"]);

    // Standalone @balacode/mental skill and rule coexist untouched with zero false-positive doctor errors.
    assert.ok(existsSync(join(home, ".agents", "skills", "mental", "SKILL.md")));
    assert.ok(existsSync(join(home, ".cursor", "rules", "mental.mdc")));

    const doc = runPacked(["doctor"], { cwd, home });
    assert.equal(doc.status, 0, out(doc));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test("e2e tarball: project lifecycle — multi-harness init, add scoped rule, shrink --agents, edit-guard, remove", () => {
  const cwd = mkdtempSync(join(tmpdir(), "balakit-e2e-proj-"));
  const home = mkdtempSync(join(tmpdir(), "balakit-e2e-proj-home-"));
  try {
    assert.equal(
      runPacked(["init", "-y", "--agents", "cursor,claude-code,copilot,codex"], { cwd, home }).status,
      0,
    );
    assert.equal(runPacked(["add", "seo-ai-search", "-y"], { cwd, home }).status, 0);

    // Single-injection: AGENTS.md + CLAUDE.md hold always-on rules; .cursor/rules has ONLY scoped .mdc!
    assert.ok(existsSync(join(cwd, "AGENTS.md")));
    assert.ok(existsSync(join(cwd, "CLAUDE.md")));
    assert.equal(existsSync(join(cwd, ".cursor", "rules", "base.mdc")), false);
    assert.ok(existsSync(join(cwd, ".cursor", "rules", "changelog.mdc")));
    assert.ok(existsSync(join(cwd, ".cursor", "rules", "seo-ai-search.mdc")));
    assert.ok(existsSync(join(cwd, ".claude", "rules", "seo-ai-search.md")));
    assert.ok(existsSync(join(cwd, ".github", "instructions", "seo-ai-search.instructions.md")));
    assert.ok(existsSync(join(cwd, ".balakit", "rules", "seo-ai-search.md")));

    // Shrink --agents to cursor only -> CLAUDE.md, AGENTS.md, .claude/skills, .github/instructions pruned,
    // and Cursor switches cleanly to standalone .cursor/rules/base.mdc!
    const shrunk = runPacked(["init", "-y", "--agents", "cursor"], { cwd, home });
    assert.equal(shrunk.status, 0, out(shrunk));
    assert.equal(existsSync(join(cwd, "AGENTS.md")), false);
    assert.equal(existsSync(join(cwd, "CLAUDE.md")), false);
    assert.equal(existsSync(join(cwd, ".claude", "skills", "dissect")), false);
    assert.equal(existsSync(join(cwd, ".github", "instructions", "seo-ai-search.instructions.md")), false);
    assert.ok(existsSync(join(cwd, ".cursor", "rules", "base.mdc")));
    assert.ok(lstatSync(join(cwd, ".cursor", "skills", "dissect")).isSymbolicLink());

    // User customizes .agents/skills/dissect/SKILL.md -> update keeps it; update --force saves .bak!
    const skillFile = join(cwd, ".agents", "skills", "dissect", "SKILL.md");
    writeFileSync(skillFile, "# custom team dissect\n");
    assert.equal(runPacked(["update", "-y"], { cwd, home }).status, 0);
    assert.equal(readFileSync(skillFile, "utf8"), "# custom team dissect\n");

    assert.equal(runPacked(["update", "-y", "--force"], { cwd, home }).status, 0);
    assert.equal(
      readFileSync(join(cwd, ".agents", "skills", "dissect.bak", "SKILL.md"), "utf8"),
      "# custom team dissect\n",
    );
    assert.match(readFileSync(skillFile, "utf8"), /^name:\s*dissect\s*$/m);

    assert.equal(runPacked(["doctor"], { cwd, home }).status, 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

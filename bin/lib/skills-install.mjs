/**
 * Native zero-dependency skill installer, symlink manager, edit-guard, and
 * legacy `skills-lock.json` / orphan-skill garbage collector.
 *
 * Replaces the runtime `skills` npm subprocess so installs work on Node >=18,
 * never leak machine-local `~/.npm/_npx/...` paths into consumer repos, and
 * preserve user-edited skills unless `--force` is passed.
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { SKILLS_DIR, NAME, RETIRED_SKILLS } from "./pkg.mjs";
import { getCapability } from "./agents.mjs";

/**
 * Verified per-agent skill destinations (relative to `cwd` for project scope,
 * or `home` for user scope). Shared `.agents/skills` is always populated first
 * as the canonical store; agent-specific folders symlink to it (with recursive
 * copy fallback when the OS refuses symlinks).
 */
export const AGENT_SKILL_PATHS = Object.freeze({
  amp: { project: ".agents/skills", user: ".config/agents/skills" },
  "claude-code": { project: ".claude/skills", user: ".claude/skills" },
  cline: { project: ".agents/skills", user: ".agents/skills" },
  codex: { project: ".agents/skills", user: ".codex/skills" },
  continue: { project: ".continue/skills", user: ".continue/skills" },
  cursor: { project: ".cursor/skills", user: ".cursor/skills" },
  "gemini-cli": { project: ".agents/skills", user: ".gemini/skills" },
  "github-copilot": { project: ".agents/skills", user: ".copilot/skills" },
  junie: { project: ".junie/skills", user: ".junie/skills" },
  kilo: { project: ".agents/skills", user: ".kilo/skills" },
  "kiro-cli": { project: ".kiro/skills", user: ".kiro/skills" },
  opencode: { project: ".agents/skills", user: ".config/opencode/skills" },
  pi: { project: ".pi/skills", user: ".pi/agent/skills" },
  roo: { project: ".roo/skills", user: ".roo/skills" },
  windsurf: { project: ".windsurf/skills", user: ".codeium/windsurf/skills" },
  zed: { project: ".agents/skills", user: ".agents/skills" },
});

/** Verified target ids supported by the native installer. */
export const VERIFIED_SKILL_TARGET_IDS = Object.freeze(Object.keys(AGENT_SKILL_PATHS));

/** All unique per-scope link directories outside canonical `.agents/skills`. */
export const ALL_SKILL_LINK_DIRS = Object.freeze({
  project: [...new Set(Object.values(AGENT_SKILL_PATHS).map((x) => x.project).filter((d) => d !== ".agents/skills"))],
  user: [...new Set(Object.values(AGENT_SKILL_PATHS).map((x) => x.user).filter((d) => d !== ".agents/skills"))],
});

function isSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * True when `p` is a 0-byte regular file.
 * Failed skill links on Windows land as empty files. They are not skill trees.
 * @param {string} p
 */
function isEmptyFile(p) {
  try {
    const st = lstatSync(p);
    return st.isFile() && st.size === 0;
  } catch {
    return false;
  }
}

/**
 * True when `p` is a symbolic link whose target no longer exists.
 * @param {string} p
 */
export function isDanglingSymlink(p) {
  if (!isSymlink(p)) return false;
  try {
    statSync(p);
    return false;
  } catch {
    return true;
  }
}

/**
 * Compute a deterministic SHA-256 over every file in a skill directory so
 * local user edits under `.agents/skills/<name>` are detected on upgrade.
 * @param {string} dir
 * @returns {string}
 */
export function hashSkillTree(dir) {
  if (!existsSync(dir)) return "";
  const h = createHash("sha256");
  const walk = (cur, prefix) => {
    const entries = readdirSync(cur, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const abs = join(cur, entry.name);
      if (entry.isDirectory()) {
        h.update(`D:${relPath}\n`);
        walk(abs, relPath);
      } else if (entry.isFile()) {
        h.update(`F:${relPath}\n`);
        h.update(readFileSync(abs));
        h.update("\n");
      }
    }
  };
  walk(dir, "");
  return h.digest("hex");
}

/** Alias used by verify.mjs for directory hash checks. */
export const treeSha256 = hashSkillTree;

/**
 * Return all unique per-agent skill link directories for `scope`.
 * @param {"project"|"user"} scope
 */
export function allSkillLinkDirs(scope) {
  return ALL_SKILL_LINK_DIRS[scope === "user" ? "user" : "project"];
}

/**
 * List expected agent skill links that are missing or dangling for the active
 * `agentIds` in `scope`.
 * @param {string[]} skillNames
 * @param {string[]} agentIds
 * @param {"project"|"user"} scope
 * @param {{ cwd?: string, home?: string }} [where]
 */
export function missingSkillLinksForAgents(
  skillNames,
  agentIds,
  scope,
  { cwd = process.cwd(), home = homedir() } = {},
) {
  if (!skillNames?.length || !agentIds?.length) return [];
  const installScope = scope === "user" ? "user" : "project";
  const root = installScope === "user" ? home : cwd;
  const prefix = installScope === "user" ? "~/" : "";
  const { linkDirs } = resolveSkillDestinations(agentIds, installScope);
  const missing = [];
  for (const relDir of linkDirs) {
    for (const name of skillNames) {
      if (!existsSync(join(root, relDir, name, "SKILL.md"))) {
        missing.push(`${prefix}${relDir}/${name}`);
      }
    }
  }
  return missing;
}

/**
 * Non-mutating check: true when `<root>/skills-lock.json` still holds legacy
 * machine-local `balakit` entries.
 * @param {"project"|"user"} scope
 * @param {{ cwd?: string, home?: string }} [where]
 */
export function hasLegacySkillsLock(scope, { cwd = process.cwd(), home = homedir() } = {}) {
  const root = scope === "user" ? home : cwd;
  const lockPath = join(root, "skills-lock.json");
  if (!existsSync(lockPath)) return false;
  try {
    const raw = JSON.parse(readFileSync(lockPath, "utf8"));
    if (!raw || typeof raw !== "object" || typeof raw.skills !== "object") return false;
    return Object.entries(raw.skills).some(([k, v]) => {
      const src = String(v?.source ?? "");
      const type = String(v?.sourceType ?? "");
      return src.includes(NAME) || (type === "local" && existsSync(join(SKILLS_DIR, k, "SKILL.md")));
    });
  } catch {
    return false;
  }
}
/**
 * Manifest file key used to record the tree hash of an installed skill.
 * @param {"project"|"user"} scope
 * @param {string} name
 */
export function skillHashKey(scope, name) {
  return `${scope === "user" ? "~/" : ""}.agents/skills/${name}`;
}

/**
 * Resolve agent ids to unique verified skill target ids + link directories.
 * @param {string[]} agentIds
 * @param {"project"|"user"} scope
 */
export function resolveSkillDestinations(agentIds, scope) {
  const targetIds = [];
  const skippedUnverified = [];
  const skippedUnsupported = [];
  const linkDirs = new Set();

  for (const id of agentIds) {
    const cap = getCapability(id);
    const sid = cap?.skillsShId;
    if (!sid) {
      skippedUnsupported.push(id);
      continue;
    }
    const spec = AGENT_SKILL_PATHS[sid];
    if (!spec) {
      skippedUnverified.push(`${id}→${sid}`);
      continue;
    }
    if (!targetIds.includes(sid)) targetIds.push(sid);
    const dir = spec[scope === "user" ? "user" : "project"];
    if (dir && dir !== ".agents/skills") linkDirs.add(dir);
  }

  return {
    targetIds,
    linkDirs: [...linkDirs].sort(),
    skippedUnverified,
    skippedUnsupported,
  };
}

/**
 * True when `linkPath` is a symlink pointing into `.agents/skills/<name>` (or
 * a dangling symlink), so replacing/removing it will never destroy a foreign
 * real directory the user created directly in `.cursor/skills` or `~/.copilot/skills`.
 */
function isKitSkillLink(linkPath, canonicalDir, { recordedCopyHash } = {}) {
  if (isSymlink(linkPath)) {
    if (isDanglingSymlink(linkPath)) return true;
    try {
      const target = resolve(dirname(linkPath), readlinkSync(linkPath));
      return target === resolve(canonicalDir) || target.includes(`${join(".agents", "skills")}`);
    } catch {
      return false;
    }
  }
  if (recordedCopyHash && existsSync(linkPath)) {
    return hashSkillTree(linkPath) === recordedCopyHash;
  }
  return false;
}

/**
 * Install packaged skills into canonical `<root>/.agents/skills/<name>` and
 * link each selected agent's skill directory to it.
 *
 * @param {string[]} skillNames
 * @param {object} opts
 * @param {string[]} opts.agentIds
 * @param {"project"|"user"} [opts.scope]
 * @param {string} [opts.cwd]
 * @param {string} [opts.home]
 * @param {boolean} [opts.dryRun]
 * @param {{ files: Record<string, string>, legacy: boolean, force: boolean }} [opts.guard]
 * @param {string} [opts.srcRoot]
 */
export function installSkills(
  skillNames,
  {
    agentIds = [],
    scope = "project",
    cwd = process.cwd(),
    home = homedir(),
    dryRun = false,
    guard = { files: {}, legacy: false, force: false },
    srcRoot = SKILLS_DIR,
  } = {},
) {
  const installScope = scope === "user" ? "user" : "project";
  const root = installScope === "user" ? home : cwd;
  const prefix = installScope === "user" ? "~/" : "";
  const { targetIds, linkDirs, skippedUnverified, skippedUnsupported } = resolveSkillDestinations(
    agentIds,
    installScope,
  );

  if (!skillNames.length) {
    return { ok: true, written: [], kept: [], notes: [], files: {}, surfaces: [], skippedUnverified, skippedUnsupported };
  }
  if (!targetIds.length) {
    return {
      ok: false,
      reason: "None of the selected tools can receive skills. Skills were not installed.",
      written: [],
      kept: [],
      notes: [],
      files: {},
      surfaces: [],
      skippedUnverified,
      skippedUnsupported,
    };
  }

  const canonicalRoot = join(root, ".agents", "skills");
  const written = [];
  const kept = [];
  const notes = [];
  const files = {};
  const surfaces = [`${prefix}.agents/skills`];

  for (const name of skillNames) {
    const src = join(srcRoot, name);
    if (!existsSync(join(src, "SKILL.md"))) {
      return {
        ok: false,
        reason: `Packaged skill not found: ${name}`,
        written,
        kept,
        notes,
        files,
        surfaces,
        skippedUnverified,
        skippedUnsupported,
      };
    }

    const dest = join(canonicalRoot, name);
    const key = skillHashKey(installScope, name);
    const nextHash = hashSkillTree(src);
    const recordedHash = guard.files[key];

    let canWriteCanonical = true;
    if (existsSync(dest)) {
      const curHash = hashSkillTree(dest);
      if (curHash === nextHash) {
        files[key] = nextHash;
        written.push(key);
        canWriteCanonical = false;
      } else {
        const owned = recordedHash
          ? curHash === recordedHash
          : Boolean(guard.legacy || guard.legacySkills || isSymlink(dest));
        if (!owned && !guard.force) {
          kept.push(key);
          if (recordedHash) files[key] = recordedHash;
          canWriteCanonical = false;
        } else if (!owned && guard.force && !dryRun) {
          rmSync(`${dest}.bak`, { recursive: true, force: true });
          cpSync(dest, `${dest}.bak`, { recursive: true });
          written.push(`${key} (your copy saved as ${key}.bak)`);
        }
      }
    }

    if (canWriteCanonical) {
      if (!dryRun) {
        mkdirSync(canonicalRoot, { recursive: true });
        rmSync(dest, { recursive: true, force: true });
        cpSync(src, dest, { recursive: true });
      }
      files[key] = nextHash;
      if (!written.some((w) => w.startsWith(key))) written.push(key);
    }

    for (const relDir of linkDirs) {
      const destDir = join(root, relDir);
      const link = join(destDir, name);
      const linkKey = `${prefix}${relDir}/${name}`;
      const relTarget = relative(destDir, dest);
      surfaces.push(`${prefix}${relDir}`);

      if (existsSync(link) || isSymlink(link)) {
        if (isSymlink(link) && !isDanglingSymlink(link) && readlinkSync(link) === relTarget) {
          written.push(linkKey);
          continue;
        }
        const copyHash = guard.files[linkKey];
        if (!isKitSkillLink(link, dest, { recordedCopyHash: copyHash }) && !guard.force && !isEmptyFile(link)) {
          notes.push(`Skipped skill link for ${name}: ${linkKey} exists and is not a kit symlink.`);
          continue;
        }
      }

      if (dryRun) {
        written.push(linkKey);
        continue;
      }

      mkdirSync(destDir, { recursive: true });
      if (existsSync(link) || isSymlink(link)) {
        rmSync(link, { recursive: true, force: true });
      }
      try {
        symlinkSync(relTarget, link, "junction");
        written.push(linkKey);
      } catch {
        try {
          cpSync(dest, link, { recursive: true });
          files[linkKey] = hashSkillTree(link);
          written.push(linkKey);
          notes.push(`Copied ${name} into ${prefix}${relDir} (symlink unavailable).`);
        } catch (err) {
          notes.push(`Failed skill link for ${name} at ${linkKey}: ${err.message}`);
        }
      }
    }
  }

  if (kept.length) {
    notes.push(
      `Kept ${kept.length} skill folder(s) you customized: ${kept.join(", ")}. Re-run with --force to replace them; your copy is saved as .bak.`,
    );
  }

  if (!dryRun) {
    const cleanedLock = cleanLegacySkillsLock(root);
    if (cleanedLock) notes.push(`Cleaned legacy ${prefix}skills-lock.json machine-local path entries.`);
  }

  return {
    ok: true,
    written,
    kept,
    notes,
    files,
    surfaces: [...new Set(surfaces)],
    skippedUnverified,
    skippedUnsupported,
  };
}

/**
 * Remove installed skills from canonical `.agents/skills` and every agent link
 * directory, respecting local user customizations unless `--force` is set.
 *
 * @param {string[]} skillNames
 * @param {object} [opts]
 * @param {"project"|"user"} [opts.scope]
 * @param {string} [opts.cwd]
 * @param {string} [opts.home]
 * @param {boolean} [opts.dryRun]
 * @param {{ files: Record<string, string>, legacy: boolean, force: boolean }} [opts.guard]
 */
export function removeSkills(
  skillNames,
  {
    scope = "project",
    cwd = process.cwd(),
    home = homedir(),
    dryRun = false,
    guard = { files: {}, legacy: true, force: false },
  } = {},
) {
  const installScope = scope === "user" ? "user" : "project";
  const root = installScope === "user" ? home : cwd;
  const prefix = installScope === "user" ? "~/" : "";
  const removed = [];
  const kept = [];
  const notes = [];
  const droppedKeys = [];

  for (const name of skillNames) {
    const canonical = join(root, ".agents", "skills", name);
    const key = skillHashKey(installScope, name);

    const isRetired = RETIRED_SKILLS.includes(name);

    for (const relDir of ALL_SKILL_LINK_DIRS[installScope]) {
      const link = join(root, relDir, name);
      const linkKey = `${prefix}${relDir}/${name}`;
      if (!existsSync(link) && !isSymlink(link)) continue;
      if (
        isKitSkillLink(link, canonical, { recordedCopyHash: guard.files[linkKey] }) ||
        (isRetired && (existsSync(join(link, "SKILL.md")) || isEmptyFile(link))) ||
        guard.force
      ) {
        if (!dryRun) rmSync(link, { recursive: true, force: true });
        removed.push(linkKey);
        droppedKeys.push(linkKey);
      } else {
        notes.push(`Left ${linkKey} in place (not a kit symlink).`);
      }
    }

    if (existsSync(canonical) || isSymlink(canonical)) {
      const recorded = guard.files[key];
      const owned =
        guard.force ||
        isSymlink(canonical) ||
        (recorded
          ? hashSkillTree(canonical) === recorded
          : Boolean(guard.legacy || guard.legacySkills || isRetired || existsSync(join(SKILLS_DIR, name, "SKILL.md"))));
      if (owned) {
        if (!dryRun) rmSync(canonical, { recursive: true, force: true });
        removed.push(key);
        droppedKeys.push(key);
      } else {
        kept.push(key);
      }
    } else {
      droppedKeys.push(key);
    }
  }

  if (!dryRun) cleanLegacySkillsLock(root, skillNames);
  return { ok: true, removed, kept, notes, droppedKeys };
}

/**
 * Remove links in agent skill directories that are no longer selected when a
 * user shrinks `--agents` on `init`, while keeping canonical `.agents/skills`.
 * @param {string[]} activeSkillNames
 * @param {string[]} activeAgentIds
 * @param {"project"|"user"} scope
 * @param {{ cwd?: string, home?: string, dryRun?: boolean, files?: Record<string, string> }} [opts]
 */
export function pruneDroppedAgentSkillLinks(
  activeSkillNames,
  activeAgentIds,
  scope,
  { cwd = process.cwd(), home = homedir(), dryRun = false, files = {} } = {},
) {
  const installScope = scope === "user" ? "user" : "project";
  const root = installScope === "user" ? home : cwd;
  const prefix = installScope === "user" ? "~/" : "";
  const { linkDirs } = resolveSkillDestinations(activeAgentIds, installScope);
  const keepDirs = new Set(linkDirs);
  const removed = [];
  const droppedKeys = [];

  for (const relDir of ALL_SKILL_LINK_DIRS[installScope]) {
    if (keepDirs.has(relDir)) continue;
    for (const name of activeSkillNames) {
      const canonical = join(root, ".agents", "skills", name);
      const link = join(root, relDir, name);
      const linkKey = `${prefix}${relDir}/${name}`;
      if (!existsSync(link) && !isSymlink(link)) continue;
      if (isKitSkillLink(link, canonical, { recordedCopyHash: files[linkKey] })) {
        if (!dryRun) rmSync(link, { recursive: true, force: true });
        removed.push(linkKey);
        droppedKeys.push(linkKey);
      }
    }
  }
  return { removed, droppedKeys };
}

/**
 * Clean machine-local `balakit` entries written by legacy `skills@1.5.25` out
 * of `<root>/skills-lock.json`. Preserves third-party lockfile entries; deletes
 * `skills-lock.json` when no entries remain.
 * @param {string} root
 * @param {string[]} [extraNames]
 * @returns {boolean} True when the lockfile was modified or removed.
 */
export function cleanLegacySkillsLock(root, extraNames = []) {
  const lockPath = join(root, "skills-lock.json");
  if (!existsSync(lockPath)) return false;
  try {
    const raw = JSON.parse(readFileSync(lockPath, "utf8"));
    if (!raw || typeof raw !== "object" || typeof raw.skills !== "object") return false;
    const dropNames = new Set(extraNames);
    let changed = false;
    for (const [k, v] of Object.entries(raw.skills)) {
      const src = String(v?.source ?? "");
      const type = String(v?.sourceType ?? "");
      const isLocalBalakit =
        dropNames.has(k) ||
        src.includes(NAME) ||
        (type === "local" && existsSync(join(SKILLS_DIR, k, "SKILL.md")));
      if (isLocalBalakit) {
        delete raw.skills[k];
        changed = true;
      }
    }
    if (!changed) return false;
    if (Object.keys(raw.skills).length === 0) {
      unlinkSync(lockPath);
    } else {
      writeFileSync(lockPath, JSON.stringify(raw, null, 2) + "\n");
    }
    return true;
  } catch {
    return false;
  }
}

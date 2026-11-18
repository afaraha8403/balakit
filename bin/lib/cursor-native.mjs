/**
 * Cursor-native skill links and user-local plugin copies.
 *
 * skills.sh Cursor project target is `.agents/skills`. Cursor also loads
 * `.cursor/skills`, so we symlink after a project install.
 * User-scope plugins land in `~/.cursor/plugins/local/` as copies (npx cache
 * is ephemeral; a symlink from the npm store would break).
 */
import {
  mkdirSync,
  symlinkSync,
  lstatSync,
  rmSync,
  cpSync,
  existsSync,
  readdirSync,
  readlinkSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { homedir } from "node:os";
import { PKG_ROOT, RULES_DIR, SKILLS_DIR, VERSION, REPO, RETIRED_PLUGINS } from "./pkg.mjs";
import { PLUGINS, MARKETPLACE_OWNER } from "./plugins-spec.mjs";
import { rel } from "./render.mjs";

const DEFAULT_PLUGINS_SRC = join(PKG_ROOT, "plugins");

/**
 * Symlink `.cursor/skills/<name>` → `.agents/skills/<name>`.
 * Leaves an existing non-symlink directory intact unless `force` is true (never
 * silently clobbers a user-created folder).
 * Falls back to a copy when the platform refuses symlinks.
 * @param {string[]} skillNames
 * @returns {{ written: string[], notes: string[] }}
 */
export function linkCursorProjectSkills(
  skillNames,
  { cwd = process.cwd(), dryRun = false, force = false } = {},
) {
  const written = [];
  const notes = [];
  if (!skillNames?.length) return { written, notes };

  const destDir = join(cwd, ".cursor", "skills");
  if (!dryRun) mkdirSync(destDir, { recursive: true });

  for (const name of skillNames) {
    const target = join(cwd, ".agents", "skills", name);
    const link = join(destDir, name);
    if (!existsSync(target)) {
      notes.push(`Skipped Cursor skill link for ${name}: ${rel(target)} not present.`);
      continue;
    }
    const relTarget = relative(destDir, target);
    if (existsSync(link) || isSymlink(link)) {
      const st = lstatSync(link);
      if (st.isSymbolicLink() && readlinkSync(link) === relTarget) {
        written.push(rel(link));
        continue;
      }
      if (!st.isSymbolicLink() && !force) {
        notes.push(
          `Skipped Cursor skill link for ${name}: .cursor/skills/${name} exists and is not a kit symlink (pass --force to replace).`,
        );
        continue;
      }
    }
    if (dryRun) {
      written.push(rel(link));
      continue;
    }
    try {
      if (existsSync(link) || isSymlink(link)) {
        rmSync(link, { recursive: true, force: true });
      }
      symlinkSync(relTarget, link);
      written.push(rel(link));
    } catch {
      rmSync(link, { recursive: true, force: true });
      cpSync(target, link, { recursive: true });
      written.push(rel(link));
      notes.push(`Copied ${name} into .cursor/skills (symlink unavailable).`);
    }
  }
  return { written, notes };
}

function isSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Materialize one plugin directly from packaged `rules/` and `skills/` when
 * `plugins/` was omitted from the npm tarball.
 */
function materializeCursorPlugin(dest, plugin) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(join(dest, ".cursor-plugin"), { recursive: true });
  for (const rule of plugin.rules) {
    const src = join(RULES_DIR, `${rule}.mdc`);
    if (!existsSync(src)) continue;
    mkdirSync(join(dest, "rules"), { recursive: true });
    cpSync(src, join(dest, "rules", `${rule}.mdc`));
  }
  for (const skill of plugin.skills) {
    const src = join(SKILLS_DIR, skill);
    if (!existsSync(src)) continue;
    mkdirSync(join(dest, "skills"), { recursive: true });
    cpSync(src, join(dest, "skills", skill), { recursive: true });
  }
  writeFileSync(
    join(dest, ".cursor-plugin", "plugin.json"),
    `${JSON.stringify(
      {
        name: plugin.name,
        version: VERSION,
        description: plugin.description,
        author: { ...MARKETPLACE_OWNER, url: "https://balacode.io" },
        homepage: `https://github.com/${REPO}#readme`,
        repository: `https://github.com/${REPO}`,
        license: "MIT",
        keywords: plugin.keywords,
      },
      null,
      2,
    )}\n`,
  );
}

/**
 * Remove retired `balakit-*` folders under `~/.cursor/plugins/local`.
 * @returns {string[]}
 */
export function pruneRetiredCursorPlugins({ home = homedir(), dryRun = false } = {}) {
  const destRoot = join(home, ".cursor", "plugins", "local");
  if (!existsSync(destRoot)) return [];
  const removed = [];
  for (const name of RETIRED_PLUGINS) {
    const target = join(destRoot, name);
    if (!existsSync(target)) continue;
    if (!dryRun) rmSync(target, { recursive: true, force: true });
    removed.push(target);
  }
  return removed;
}

/**
 * Copy bundled domain plugins into Cursor's local plugin folder, and prune
 * retired kit plugin names (`balakit-nlm`, etc.).
 * @returns {{ written: string[], removed: string[], notes: string[] }}
 */
export function copyCursorLocalPlugins({
  home = homedir(),
  dryRun = false,
  srcRoot = DEFAULT_PLUGINS_SRC,
} = {}) {
  const written = [];
  const notes = [];
  const removed = pruneRetiredCursorPlugins({ home, dryRun });
  const destRoot = join(home, ".cursor", "plugins", "local");

  if (existsSync(srcRoot)) {
    const names = readdirSync(srcRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    if (!dryRun) mkdirSync(destRoot, { recursive: true });
    for (const name of names) {
      const src = join(srcRoot, name);
      if (!existsSync(src)) continue;
      const dest = join(destRoot, name);
      if (!dryRun) {
        rmSync(dest, { recursive: true, force: true });
        cpSync(src, dest, { recursive: true });
      }
      written.push(dest);
    }
    if (names.length) {
      notes.push(
        "Cursor plugins copied to ~/.cursor/plugins/local/. Reload the window, then check Customize. Customize → User Rules is account UI and is not written by this CLI.",
      );
    }
    return { written, removed, notes };
  }

  if (srcRoot !== DEFAULT_PLUGINS_SRC) {
    notes.push("No plugins/ in this package — skipped Cursor local plugins.");
    return { written, removed, notes };
  }

  if (!dryRun) mkdirSync(destRoot, { recursive: true });
  for (const plugin of PLUGINS) {
    const dest = join(destRoot, plugin.name);
    if (!dryRun) materializeCursorPlugin(dest, plugin);
    written.push(dest);
  }
  if (PLUGINS.length) {
    notes.push(
      "Cursor plugins copied to ~/.cursor/plugins/local/. Reload the window, then check Customize. Customize → User Rules is account UI and is not written by this CLI.",
    );
  }
  return { written, removed, notes };
}

/**
 * Known kit plugin names (current + retired), for safe cleanup.
 */
export function knownKitPluginNames() {
  return [...new Set([...PLUGINS.map((p) => p.name), ...RETIRED_PLUGINS])];
}

/**
 * List plugin ids currently copied under ~/.cursor/plugins/local.
 * @param {string} [home]
 */
export function listCursorLocalPlugins(home = homedir()) {
  const destRoot = join(home, ".cursor", "plugins", "local");
  if (!existsSync(destRoot)) return [];
  return readdirSync(destRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/**
 * Remove a Cursor project skill link (or copy) for the given names.
 * @param {string[]} skillNames
 */
export function unlinkCursorProjectSkills(skillNames, { cwd = process.cwd(), dryRun = false } = {}) {
  const removed = [];
  for (const name of skillNames) {
    const link = join(cwd, ".cursor", "skills", name);
    if (!existsSync(link) && !isSymlink(link)) continue;
    if (!dryRun) rmSync(link, { recursive: true, force: true });
    removed.push(rel(link));
  }
  return removed;
}

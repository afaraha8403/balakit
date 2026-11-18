/**
 * Shared rule rendering — used by the consumer installer and repo sync.
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, relative } from "node:path";
import { BEGIN, END, NAME, CMD, REPO } from "./pkg.mjs";

/**
 * Demote every Markdown heading one level outside fenced code blocks so rule
 * bodies nest cleanly under an H1 without corrupting code examples or comments.
 * @param {string} md
 */
export function demote(md) {
  let fence = null;
  return md
    .split("\n")
    .map((line) => {
      const open = line.match(/^\s*(`{3,}|~{3,})/);
      if (open) {
        const ch = open[1][0];
        const len = open[1].length;
        if (!fence) {
          fence = { ch, len };
        } else if (fence.ch === ch && len >= fence.len && /^\s*[`~]+\s*$/.test(line)) {
          fence = null;
        }
        return line;
      }
      if (fence) return line;
      return line.replace(/^(#{1,5}) /, "#$1 ");
    })
    .join("\n");
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Path relative to cwd when under the project; otherwise absolute. */
export const rel = (f) => {
  const r = relative(process.cwd(), f);
  return !r || r.startsWith("..") ? f : r;
};

/**
 * Render selected rules into a Markdown block for AGENTS.md / CLAUDE.md /
 * user-level instruction files.
 *
 * Always-on rules are inlined. Scoped (glob) rules get a compact conditional
 * pointer instead of dumping their full body into every turn's standing prompt.
 *
 * @param {Array<{name: string, always: boolean, globs: string, body: string, description: string}>} rules
 * @param {{ consumer?: boolean, scopedPointer?: (rule: { name: string }) => string }} [opts]
 */
export function renderRulesBlock(rules, { consumer = true, scopedPointer } = {}) {
  const always = rules.filter((r) => r.always);
  const scoped = rules.filter((r) => !r.always);

  const parts = [
    `# Opinionated Rules`,
    "",
    `Installed from \`${REPO}\` via \`npx ${CMD}@latest\`. Re-run \`npx ${CMD}@latest update\` to refresh.`,
    "",
  ];

  for (const r of always) {
    parts.push(`<!-- from rules/${r.name}.mdc -->`, demote(r.body), "");
  }

  if (scoped.length) {
    parts.push("## Conditional rules", "", "Apply these only when working on matching files:", "");
    for (const r of scoped) {
      const globs = r.globs ? ` (globs: \`${r.globs}\`)` : "";
      const target = scopedPointer
        ? scopedPointer(r)
        : consumer
          ? `.balakit/rules/${r.name}.md`
          : `rules/${r.name}.mdc`;
      parts.push(`- **${r.name}**${globs} — ${r.description} → see \`${target}\``);
    }
    parts.push("");
  }

  return parts.join("\n").trim();
}

/**
 * Render standing-context files for this repo's own sync (CLAUDE.md / AGENTS.md).
 * Inlines always-on rules; indexes scoped rules as pointers to `rules/*.mdc`.
 * @param {Array} rules Full catalog.
 * @param {string} agentLabel Human label for the generated header.
 */
export function renderRepoStandingDocs(rules, agentLabel) {
  const always = rules.filter((r) => r.always);
  const scoped = rules.filter((r) => !r.always);
  const out = [
    "<!-- GENERATED FILE — do not edit by hand.",
    "     Source of truth: rules/*.mdc · Regenerate: npm run sync (or ./sync.sh) -->",
    "",
    "# Project Rules",
    "",
    `Standing rules for ${agentLabel}, generated from this repository's \`rules/*.mdc\`. ` +
      "Edit the source rules, then run `npm run sync` to regenerate this file.",
    "",
  ];
  for (const r of always) {
    out.push(`<!-- from rules/${r.name}.mdc -->`, demote(r.body), "");
  }
  if (scoped.length) {
    out.push("## Conditional rules", "", "Apply these only when working on matching files:", "");
    for (const r of scoped) {
      const globs = r.globs ? ` (globs: \`${r.globs}\`)` : "";
      out.push(`- **${r.name}**${globs} — ${r.description} → see \`rules/${r.name}.mdc\``);
    }
    out.push("");
  }
  return out.join("\n");
}

/** Insert or replace our managed block in a file, preserving all other content. */
export function mergeManaged(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const block = `${BEGIN}\n${content}\n${END}`;
  let cur = "";
  try {
    cur = readFileSync(file, "utf8");
  } catch {}
  if (cur.includes(BEGIN) && cur.includes(END)) {
    const re = new RegExp(`${esc(BEGIN)}[\\s\\S]*?${esc(END)}`);
    writeFileSync(file, cur.replace(re, block));
  } else {
    writeFileSync(file, (cur.trim() ? cur.replace(/\s*$/, "") + "\n\n" : "") + block + "\n");
  }
}

/**
 * Remove our managed block from a file. Deletes the file if only whitespace remains.
 * @returns {boolean} True if a block was removed (or file deleted).
 */
export function removeManaged(file) {
  if (!existsSync(file)) return false;
  let cur = readFileSync(file, "utf8");
  if (!cur.includes(BEGIN) || !cur.includes(END)) return false;
  const re = new RegExp(`\\n*${esc(BEGIN)}[\\s\\S]*?${esc(END)}\\n*`);
  cur = cur.replace(re, "\n").trim();
  if (!cur) {
    unlinkSync(file);
  } else {
    writeFileSync(file, cur + "\n");
  }
  return true;
}

/** True when a file contains our managed block. */
export function hasManagedBlock(file) {
  if (!existsSync(file)) return false;
  const cur = readFileSync(file, "utf8");
  return cur.includes(BEGIN) && cur.includes(END);
}

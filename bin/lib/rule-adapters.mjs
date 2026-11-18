/**
 * Project-scoped twins of Cursor `.mdc` rules for Claude Code and Copilot.
 * Source remains `rules/<name>.mdc`; adapters are generated at install time.
 */

/**
 * Split a Cursor `globs` frontmatter value into individual patterns without
 * splitting commas inside `{astro,ts,tsx}` brace expansions.
 * @param {string} globs
 * @returns {string[]}
 */
export function globList(globs) {
  const raw = String(globs ?? "").trim().replace(/^["']|["']$/g, "");
  const out = [];
  let cur = "";
  let depth = 0;
  for (const ch of raw) {
    if (ch === "{") depth++;
    else if (ch === "}" && depth > 0) depth--;
    if (ch === "," && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Claude Code path-scoped rule (`.md` + `paths:`).
 * @param {{ name: string, globs: string, body: string, description: string }} rule
 */
export function renderClaudeRule(rule) {
  const paths = globList(rule.globs);
  const pathsYaml = paths.length
    ? paths.map((p) => `  - "${p}"`).join("\n")
    : "  - \"**/*\"";
  return `---\ndescription: ${rule.description || rule.name}\npaths:\n${pathsYaml}\n---\n\n${rule.body.trim()}\n`;
}

/**
 * Copilot path-specific instructions (`applyTo`).
 * @param {{ name: string, globs: string, body: string, description: string }} rule
 */
export function renderCopilotInstructions(rule) {
  const paths = globList(rule.globs);
  const applyTo = paths.length ? paths.join(",") : "**";
  return `---\ndescription: ${rule.description || rule.name}\napplyTo: "${applyTo}"\n---\n\n${rule.body.trim()}\n`;
}

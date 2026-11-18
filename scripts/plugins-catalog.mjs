/**
 * Domain plugin catalog for Agent Plugins / Cursor Plugins packaging.
 *
 * Source of truth remains `skills/` and `rules/`. `build-plugins.mjs` materializes
 * each entry under `plugins/<name>/`. Edit this catalog when adding a skill or rule.
 *
 * Format:
 * - `cursor` — ships rules (and optional skills); Cursor Plugin via `.cursor-plugin/plugin.json`
 * - `agent` — skills-only; portable Agent Plugins `plugin.json` plus Cursor marketplace twin
 */

/** @typedef {"cursor" | "agent"} PluginFormat */

/**
 * @typedef {object} PluginDef
 * @property {string} name Plugin id (kebab-case, Agent Plugins name constraints).
 * @property {string} description Short purpose for marketplace / manifests.
 * @property {string[]} keywords Discovery tags.
 * @property {PluginFormat} format Packaging format.
 * @property {string[]} rules Rule basenames (without `.mdc`) copied into `rules/`.
 * @property {string[]} skills Skill directory names copied into `skills/`.
 */

export {
  PLUGINS,
  MARKETPLACE_NAME,
  MARKETPLACE_OWNER,
} from "../bin/lib/plugins-spec.mjs";


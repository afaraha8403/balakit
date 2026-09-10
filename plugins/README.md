# balakit plugins

Domain plugins generated from repository `skills/` and `rules/`.
Each plugin installs separately (Cursor marketplace or Agent Plugins clients).

| Plugin | Format | Rules | Skills |
| --- | --- | --- | --- |
| `balakit-core` | Cursor Plugin | base, testing, comments, changelog, release | — |
| `balakit-seo` | Cursor Plugin | seo-ai-search | — |
| `balakit-seo-skills` | Agent Plugins + Cursor | — | everything-seo, seo-audit |
| `balakit-marketing` | Agent Plugins + Cursor | — | marketing-psychology, startup-marketing-brain |
| `balakit-media` | Agent Plugins + Cursor | — | media-gen |
| `balakit-nlm` | Agent Plugins + Cursor | — | nlm-skill |
| `balakit-engineering` | Agent Plugins + Cursor | — | authoring-skills-and-rules, blinded-eval, cloakbrowser-fallback, deep-deliberation, design-rationale, dissect, documentation-writer, generating-app-verify, kit-workflows, proving-change-safety, refreshing-app-verify, release-deploy, subsystem-walkthrough, unmatched-workflow |

Regenerate: `node scripts/build-plugins.mjs` (also run by `./sync.sh`).

Three layers (do not `/add-plugin` the repo root):

1. **Portable Agent Plugins 1.0.0** — skill plugins have root `plugin.json` + `skills/`.
2. **Vendor shims** — `.cursor-plugin/`, `.claude-plugin/`, `.codex-plugin/` (ChatGPT / Codex share `.codex-plugin/`).
3. **CLI fallback** — `npx balakit init` (standing rules) + `npx balakit add` / skills.sh when the client has no plugin loader.

`balakit-core` and `balakit-seo` are Cursor rules plugins only (not Agent Plugins v1).
The `balakit` CLI still writes AGENTS.md / CLAUDE.md / `.cursor/rules`.

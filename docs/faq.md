# FAQ

Short answers for install and loading problems. Commands: [CLI](cli.md). What each skill does: [Skills](skills.md).

## Project or user?

This repository only: `--scope project` (default). Every project on this PC: `--scope user`. User scope also copies Cursor plugins to `~/.cursor/plugins/local/`.

## Why didn’t skills show up after `init`?

Default `init` installs engineering skills plus standing rules. `--rules-only` skips skills. Marketing, SEO, media, NotebookLM, and `cloakbrowser-fallback` still need `npx balakit add …` or a native plugin.

Reload the agent window after a skill or plugin install. Cursor does not pick up `~/.cursor/plugins/local/` until reload.

## Does native plugin install replace the CLI?

No. Plugins load skills (and Cursor plugins can load rules). `balakit init` still writes the `AGENTS.md` / `CLAUDE.md` / `.mdc` standing kit. Skip extra `balakit add` when this client already loaded the skill plugins you want.

## Claude Code ignored root `plugin.json`

Expected. Claude Code loads `.claude-plugin/plugin.json`. Use `/plugin marketplace add afaraha8403/balakit`, then `/plugin install <name>@balakit`. Do not `/add-plugin` the repo root.

## ChatGPT or Codex: which one?

Same OpenAI plugins. ChatGPT is the Plugins tab (web/desktop). Codex CLI is `codex plugin …` / `/plugins`. OpenAI’s IDE extension does not load plugins. Cursor / VS Code Copilot is a different client.

## OpenCode (or Cline, Windsurf, …) has no plugin install

Skip native plugins. `npx balakit init` installs standing rules and engineering skills via skills.sh. Add more with `npx balakit add … --agents opencode`.

## Cursor: Customize → User Rules is empty

That UI is Cursor account settings, not files. The CLI writes `~/.cursor/rules/*.mdc` and `~/.cursor/plugins/local/`. Reload the window.

## Can I mix agents?

Yes. `--agents cursor,claude-code,opencode` (or `all`). Only verified skills.sh ids are passed as `-a`. See the id table in [CLI](cli.md#agent-ids).

## `doctor` printed a Mental URL

`--personal`, `--mental-*`, or a name list containing `mental` is rejected on purpose. Continuity moved to [Mental](https://github.com/afaraha8403/mental). Kit health is still `npx balakit doctor`. Mental health is `mental doctor`.

## Skills installed but the agent never uses them

Ask by name (`/inception`, "use kit-workflows", "dissect the billing service"). Several skills are **manual** (`disable-model-invocation: true`): `inception`, `opinion`, `execute`, `blinded-eval`, `generating-app-verify`, `refreshing-app-verify`, `unmatched-workflow`, `deep-deliberation`, `cloakbrowser-fallback`. The agent will not auto-start those.

## I used `npx skills add` and `balakit status` looks empty

Direct skills.sh does not write `.balakit/installed.json`. Use `npx balakit add` when you want the manifest and the managed `AGENTS.md` block to stay aligned.

## SEO rules did not appear after `init`

Default init does not include `seo-ai-search`. Run `npx balakit add seo-ai-search`. The Cursor plugin is `balakit-seo`.

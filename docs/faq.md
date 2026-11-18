# FAQ

Short answers for install and loading problems. Commands: [CLI](cli.md). What each skill does: [Skills](skills.md).

## Why did `npx balakit` print an old version?

npm `latest` is current (see [npmjs.com/package/balakit](https://www.npmjs.com/package/balakit)). `npx balakit` without `@latest` uses, in order: `./node_modules/balakit`, then a global `balakit` on PATH, then a cached download. A leftover `~/package.json` that depends on `balakit@^1.13.0` makes every `npx` from `$HOME` run 1.13.0.

Fix:

```bash
cd /path/to/your/project
npx balakit@latest -v
npx balakit@latest init -y
```

To refresh a global install: `npm i -g balakit@latest`. Do not run project `init` in `$HOME` (that writes `AGENTS.md` next to your personal files). Use `--scope user` for a machine-wide kit.

## Project or user?

This repository only: `--scope project` (default). Every project on this PC: `--scope user`. User scope copies Cursor plugin packs to `~/.cursor/plugins/local/` only when you add `--cursor-plugins` or answer yes in the guided setup.

## Why didn’t skills show up after `init`?

Default `init` installs engineering skills plus standing rules. `--rules-only` skips skills. Marketing, SEO, media, NotebookLM, and `cloakbrowser-fallback` still need `npx balakit add …` or a native plugin.

Reload the agent window after a skill or plugin install. Cursor does not pick up `~/.cursor/plugins/local/` until reload.

Then run `npx balakit@latest doctor`. It checks every recorded skill, rule file, and link on disk. If something is missing or stale after an upgrade, `npx balakit@latest doctor --fix` (or `update`) repairs and reconciles it on Node 18+.

## Does native plugin install replace the CLI?

No. Plugins load skills (and Cursor plugins can load rules). `balakit init` still writes the `AGENTS.md` / `CLAUDE.md` / `.mdc` standing kit. Skip extra `balakit add` when this client already loaded the skill plugins you want.

## Claude Code ignored root `plugin.json`

Expected. Claude Code loads `.claude-plugin/plugin.json`. Use `/plugin marketplace add afaraha8403/balakit`, then `/plugin install <name>@balakit`. Do not `/add-plugin` the repo root.

## ChatGPT or Codex: which one?

Same OpenAI plugins. ChatGPT is the Plugins tab (web/desktop). Codex CLI is `codex plugin …` / `/plugins`. OpenAI’s IDE extension does not load plugins. Cursor / VS Code Copilot is a different client.

## OpenCode (or Cline, Windsurf, …) has no plugin install

Skip native plugins. `npx balakit@latest init --agents opencode -y` installs standing rules and engineering skills for that tool directly from the balakit package on Node 18+, with no GitHub download needed. Add more with `npx balakit@latest add …`. Later runs reuse the recorded tools.

## Cursor: Customize → User Rules is empty

That UI is Cursor account settings, not files. The CLI writes `~/.cursor/rules/*.mdc` (and `~/.cursor/plugins/local/` with `--cursor-plugins`). Reload the window.

## Can I mix agents?

Yes. `--agents cursor,claude-code,opencode` (or `all`). Each tool gets only its own files. See [which tools get which files](cli.md#which-tools-get-which-files) and the [id table](cli.md#agent-ids). `init --agents` sets the list, while `add --agents` adds to it.

## I edited a rule file or skill folder and `update` didn't overwrite it

That is on purpose. BalaKit keeps rule files and canonical skill folders you changed, and `doctor` lists them as warnings. Run `npx balakit@latest update --force` to replace them. Your version is saved next to the path as `.bak`.

## How do I upgrade cleanly without duplicate or leftover files?

Run `npx balakit@latest update` (or `npx balakit@latest doctor --fix`). Schema 4 migrates renamed rules and skills, sweeps retired files and `balakit-nlm` plugins, and cleans legacy `skills-lock.json` entries. It also prunes duplicate Cursor `.mdc` rules when `AGENTS.md` is active, and warns on project+user overlap.

## Why didn't an interactive skill show a clickable question picker?

Run `npx balakit@latest update` and reload the agent window to install the cross-harness Native Question UI contract (`AskUserQuestion`, `AskQuestion`, `question`, `request_user_input`, `vscode_askQuestions`, and `ask_user`, max 4 options). When a session exposes none of those tools (such as a headless runner), skills fall back to a numbered plain-text list.

## A script or agent ran `npx balakit add …` and it exited 2

A step needed an answer, but there was no terminal to ask in. Add `-y` to accept the plan shown, or `--dry-run` to preview it.

## `doctor` printed a Mental URL

`--personal`, `--mental-*`, or a name list containing `mental` is rejected on purpose. Continuity moved to [Mental](https://github.com/afaraha8403/mental). Kit health is still `npx balakit doctor`. Mental health is `mental doctor`.

## Skills installed but the agent never uses them

Ask by name (`/inception`, "use kit-workflows", `/dissect the billing service`). Heavy or interactive workflows are **manual** (`disable-model-invocation: true`): `inception`, `execute`, `dissect`, `trl`, `blinded-eval`, `verify-app`, `deep-deliberation`, `cloakbrowser-fallback`. The agent will not auto-start those without your command. Every installed skill sets `user-invocable: true` so slash commands always work.

## I used `npx skills add` and `balakit status` looks empty

Direct skills.sh does not write `.balakit/installed.json`. Use `npx balakit add` when you want the manifest and the managed `AGENTS.md` block to stay aligned.

## SEO rules did not appear after `init`

Default init does not include `seo-ai-search`. Run `npx balakit add seo-ai-search`. The Cursor plugin is `balakit-seo`.

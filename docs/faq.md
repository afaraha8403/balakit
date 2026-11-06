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

Then run `npx balakit doctor`. It checks every recorded skill and link on disk. If something is missing, `npx balakit update` reinstalls it from the package.

Skills need Node 22.20 or newer (the bundled skills.sh CLI requires it). On older Node, `init` installs the rules and says that skills were skipped.

## Does native plugin install replace the CLI?

No. Plugins load skills (and Cursor plugins can load rules). `balakit init` still writes the `AGENTS.md` / `CLAUDE.md` / `.mdc` standing kit. Skip extra `balakit add` when this client already loaded the skill plugins you want.

## Claude Code ignored root `plugin.json`

Expected. Claude Code loads `.claude-plugin/plugin.json`. Use `/plugin marketplace add afaraha8403/balakit`, then `/plugin install <name>@balakit`. Do not `/add-plugin` the repo root.

## ChatGPT or Codex: which one?

Same OpenAI plugins. ChatGPT is the Plugins tab (web/desktop). Codex CLI is `codex plugin …` / `/plugins`. OpenAI’s IDE extension does not load plugins. Cursor / VS Code Copilot is a different client.

## OpenCode (or Cline, Windsurf, …) has no plugin install

Skip native plugins. `npx balakit init --agents opencode -y` installs standing rules and engineering skills for that tool. Skills come from the balakit package you ran (via a bundled skills.sh), so no GitHub download is needed. Add more with `npx balakit add …`; later runs reuse the recorded tools.

## Cursor: Customize → User Rules is empty

That UI is Cursor account settings, not files. The CLI writes `~/.cursor/rules/*.mdc` (and `~/.cursor/plugins/local/` with `--cursor-plugins`). Reload the window.

## Can I mix agents?

Yes. `--agents cursor,claude-code,opencode` (or `all`). Each tool gets only its own files. See [which tools get which files](cli.md#which-tools-get-which-files) and the [id table](cli.md#agent-ids). `init --agents` sets the list; `add --agents` adds to it.

## I edited a rule file and `update` didn't overwrite it

That's on purpose. Balakit keeps rule files you changed, and `doctor` lists them as warnings. Run `npx balakit update --force` to replace them; your version is saved next to the file as `.bak`.

## A script or agent ran `npx balakit add …` and it exited 2

A step needed an answer, but there was no terminal to ask in. Add `-y` to accept the plan shown, or `--dry-run` to preview it.

## `doctor` printed a Mental URL

`--personal`, `--mental-*`, or a name list containing `mental` is rejected on purpose. Continuity moved to [Mental](https://github.com/afaraha8403/mental). Kit health is still `npx balakit doctor`. Mental health is `mental doctor`.

## Skills installed but the agent never uses them

Ask by name (`/inception`, "use kit-workflows", "dissect the billing service"). Several skills are **manual** (`disable-model-invocation: true`): `inception`, `opinion`, `execute`, `trl`, `blinded-eval`, `generating-app-verify`, `refreshing-app-verify`, `unmatched-workflow`, `deep-deliberation`, `cloakbrowser-fallback`. The agent will not auto-start those.

## I used `npx skills add` and `balakit status` looks empty

Direct skills.sh does not write `.balakit/installed.json`. Use `npx balakit add` when you want the manifest and the managed `AGENTS.md` block to stay aligned.

## SEO rules did not appear after `init`

Default init does not include `seo-ai-search`. Run `npx balakit add seo-ai-search`. The Cursor plugin is `balakit-seo`.

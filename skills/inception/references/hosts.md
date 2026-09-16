# Host plan surfaces

Read this file in Step 1 of `inception`. The live session is source of truth.
Tables below are classification help, not a picker menu.

## Detect the host

Pick the first match:

| Signal | Host |
|---|---|
| Session lists available subagent model names, or tools named like Cursor Task | `cursor` |
| Claude Code / `CLAUDE.md` as the standing file this client owns | `claude-code` |
| OpenCode agent/subagent config in play | `opencode` |
| Copilot agent session | `copilot` |
| Codex CLI / ChatGPT Codex | `codex` |
| None of the above | `other` |

## Detect Plan Mode

`plan_mode: on` when **any** of these is true this session:

| Host | Signal |
|---|---|
| `cursor` | Conversation mode is Plan (Shift+Tab / mode picker / CLI `/plan`). Plan tools such as create/update plan are present. A live `*.plan.md` is the session document. |
| `claude-code` | Status `plan mode on`. Permission mode `plan`. `/plan` this session. `EnterPlanMode` / `ExitPlanMode` in play. |
| `opencode` | Primary agent is `plan` (Tab / `switch_agent`), not `build`. |
| `copilot` | Plan mode / Plan agent / `/plan`. CLI session has `plan.md`. |
| `codex` | Collaboration mode Plan (`/plan` or Shift+Tab). `<proposed_plan>` protocol. |
| `other` | The host documents a read-mostly plan/permission mode that is active now. |

Otherwise `plan_mode: off`. Do not infer Plan Mode from “this looks complex.”

## Native write path (`plan_mode: on`)

One canvas. Fill empty. Patch existing. Never a sibling.

| Host | Write here | How | Format the UI needs |
|---|---|---|---|
| `cursor` | Live `*.plan.md`: default `~/.cursor/plans/<slug>_<8hex>.plan.md`; Save to workspace → `<repo>/.cursor/plans/`. | Host plan create/update tool if present. Else `StrReplace` / `Edit` on that file. Changelog: files are editable with normal tools after create. | YAML frontmatter `name`, `overview`, `todos[]` (`id`, `content`, `status`), `isProject`. Body markdown + Mermaid OK. Empty `todos: []` breaks Build. Extension `.plan.md`. |
| `claude-code` | The injected file under `~/.claude/plans/` (or project `plansDirectory`). | `Write` / `Edit` **only that file**, then `ExitPlanMode` with **no plan body**. The tool reads disk. | Markdown. No required frontmatter. Empty/missing file → “No plan found.” |
| `opencode` | Chat plan. Optional files only under `~/.opencode/plan` when they asked to persist. | Stay on the `plan` primary. Do not edit project source. | Chat markdown. No `create_plan` tool. |
| `codex` | `<proposed_plan>…</proposed_plan>` in chat. Durable files only via `$plan` → `~/.codex/plans`. | Non-mutating explore. Do not call `update_plan` (TODO tool; errors in Plan). | Chat block. Not a repo file. |
| `copilot` | CLI: `~/.copilot/session-state/<id>/plan.md`. VS Code: session memory plan (dies with the chat). Visual Studio: `.copilot/plans/plan-{title}.md`. Cloud agent: chat only. | Host Plan agent / `/plan`. | Checkbox markdown. Do not assume a workspace `plan.md` on VS Code. |

## Forbidden (fighting the host)

- A second plan file (`PLAN.md`, `INCEPTION.md`, `.balakit/plans/` **while Plan Mode is on**, `docs/plans/`, anything under `skills/`).
- Full-file `Write` that replaces a live host plan.
- `SwitchMode` to Agent / `ExitPlanMode` in order to “replace” the plan or to run `execute` (`skip: plan-mode` instead).
- Passing the plan text into Claude `ExitPlanMode` (field unused; disk wins).
- Cursor `EditNotebook` for plans (Jupyter only).
- Naming a skill or OpenCode primary `plan` (OpenCode built-in primary + Codex SYSTEM `$plan`).
- Writing `.balakit/installed.json`.
- `CreatePlan` / entering Plan Mode when `plan_mode: off` unless they chose native UI this turn.

## Fallback (`plan_mode: off`)

`.balakit/plans/<slug>.md` — sibling of `installed.json`, never that file.
CLI `writeManifest` only touches `installed.json`. Plain markdown, not
`.plan.md` (Cursor YAML is host-only).

Interactive may offer native Plan Mode. Circuit/autopilot skip that offer.

## Mental

`--against` = the canvas path (host plan file/URI or `.balakit/plans/<slug>.md`).
Do not copy the plan body into Mental.

# Hosts and spawning

Read this file in step 1.

## Detect the host

| Signal | Host |
|---|---|
| Cursor Task tool, or a listed set of subagent model names | `cursor` |
| Claude Code, with `CLAUDE.md` as its standing file | `claude-code` |
| OpenCode agent/subagent config in play | `opencode` |
| Copilot agent session | `copilot` |
| Codex CLI / ChatGPT Codex | `codex` |
| None of the above | `other`: try the host's documented subagent mechanism once |

If the host cannot spawn a child agent, stop. A same-context self-score is
not a blind panel. Say so. Offer `--assess-only` on a host that can spawn.

## Models

Default: the current model on all three lenses (inherit, or omit `model`).
If the user named models, map them to lenses in order (cold, audit,
skeptic). A single named model fills every lens.

Spawn identifiers go only in the spawn tool's `model` argument. Keep them
out of prompts, the ledger, the scorecard, and questions. Use display
names there (`Current`, `Claude`, `OpenAI`, `Gemini`, …).

## How to spawn

| Host | Spawn |
|---|---|
| `cursor` | Three parallel Task agents. Current → `inherit`. Prefer `subagent_type: explore`. |
| `claude-code` | Three parallel Agent/Task calls in one message, foreground. Current → omit `model`. |
| `opencode` / `copilot` / `codex` / `other` | The host's child-agent call. Current → inherit or omit. |

The read-only contract lives in the prompt. Do not rely on a read-only
flag existing. New agents every cycle. Never resume or message an
earlier cycle's assessor.

## Native Question UI (Cross-Harness)

At baseline/plateau checkpoints and outward-action asks, inspect your session's live declared tools and invoke the matching structured question tool (2–4 options max, `header` ≤12 chars, never print `prompt:`/`options:` YAML):

| Host | Question tool |
|---|---|
| `claude-code` | `AskUserQuestion` (`questions: [{ question, header, options: [{ label, description }], multiSelect: false }]`) |
| `cursor` | `AskQuestion` (`title`, `questions: [{ id, prompt, options: [{ id, label }], allow_multiple: false }]`) |
| `opencode` | `question` (`questions: [{ question, header, options: [{ label, description }], multiple: false }]`) |
| `codex` | `request_user_input` (`questions: [{ id, header, question, options: [{ label, description }] }]`) |
| `copilot` / `other` | `vscode_askQuestions` or `ask_user` (including `balakit` MCP `ask_user` — check `tool_search` if deferred tools exist); numbered plain-text list only when zero question tools exist |

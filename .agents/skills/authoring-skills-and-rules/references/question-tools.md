# Native Question UIs Across Harnesses

When a Skill or rule reaches a real human choice or checkpoint, invoke the
host's **native structured question tool** instead of printing option menus or
pseudo-YAML in chat.

## Live tool lookup (source of truth)

Inspect the tools declared in the active session and call the matching tool:

| Harness | Tool name | Key arguments & limits |
|---|---|---|
| **Claude Code** | `AskUserQuestion` | `questions: [{ question, header, options: [{ label, description }], multiSelect }]` — **2–4 options max**, `header` ≤12 chars, automatic `"Other"` free-text input. |
| **Cursor** | `AskQuestion` | `title`, `questions: [{ id, prompt, options: [{ id, label }], allow_multiple }]` — keep options ≤4 for scannability. |
| **OpenCode** | `question` | `questions: [{ question, header, options: [{ label, description }], multiple }]` — **≤4 options max**, `header` ≤30 chars, automatic custom input. |
| **Codex (CLI / App)** | `request_user_input` | `questions: [{ id, header, question, options: [{ label, description }] }]` — 2–4 concise options (`default_mode_request_user_input = true` in `~/.codex/config.toml` enables it outside Plan mode). |
| **GitHub Copilot** | `vscode_askQuestions` / `ask_user` | Call whichever structured question tool is declared in the active VS Code or CLI session, matching its live JSON schema. |
| **Gemini CLI / ACP** | `ask_user` (or host question tool) | Call if declared in the session's tools; otherwise use the numbered plain-text fallback below. |

**Fallback (only when zero question tools are declared):** render a numbered
plain-text list (`1.`–`4.`) at the end of the turn and stop.

---

## Five cross-harness invariants

Violating any of these causes models to skip the graphical UI or fail tool-schema validation:

1. **Never put `prompt:` / `options:` YAML fences in `SKILL.md` or output templates.**
   Models copy code fences literally into assistant prose instead of emitting a `tool_use` call. Specify the question sentence and 2–4 option labels as tool-call inputs, never as markdown output.
2. **Cap options at 4 (`2 <= options <= 4`).**
   Claude Code and OpenCode enforce `maxItems: 4`. Omit `"Other — I'll specify"` because every native widget renders a built-in free-text field automatically.
3. **Emit all markdown BEFORE invoking the blocking question tool.**
   A structured question tool suspends the turn immediately for user input. Never instruct the agent to "append a footer after the checkpoint ask" — emit the full report (including any pace-mode footer) first, then invoke the question tool as the final action of the turn.
4. **Short headers and plain-English labels.**
   Keep `header` ≤12 chars (satisfies Claude Code's strictest cap) and `label` ≤40 chars. First option ends with `(Recommended)`. Last option on workflow checkpoints is `Say this in plain English`. Keep internal state variables (`DELIBERATION_STATE`, model slugs, taxonomy codes) out of the prompt and labels.
5. **`Say this in plain English` is a non-advancing meta option.**
   If chosen, do not advance the stage. Rephrase the trade-off in everyday product terms with one concrete example from this codebase, then re-invoke the native question tool at the same checkpoint.

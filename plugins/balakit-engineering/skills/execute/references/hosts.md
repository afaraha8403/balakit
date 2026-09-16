# Host detection, live lists, auto-pick

Read this file in Step 1 of `execute`. The live list this session
exposes is source of truth. Tables below are classification help and
degraded fallbacks, not a picker menu.

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

If `other`, try the host's documented subagent-with-model mechanism once. If it cannot set a worker model, stop: this skill needs two spawnable families.

## Live list

Collect every model identifier this session is allowed to pass when spawning a child. On Cursor that is the listed subagent model names. On other hosts, the equivalent Task/subagent `model` enum or picker.

Exclude from the working list:

- `inherit` (that is the parent)
- Names the user did not enable / the spawn API rejected
- Fast/mini/haiku-class twins when a higher-tier name exists in the same family (`composer-2.5-fast` loses to `composer-2.5`)

If the spawn API returns an allowed-list error, do not retry the same name. Use a listed name or stop.

## Family map

Classify by the model name, case-insensitive. First matching row wins.

| Family | Name contains |
|---|---|
| anthropic | `claude`, `sonnet`, `opus`, `haiku`, `fable` |
| openai | `gpt-`, `o1`, `o3`, `o4`, `sol`, `terra` |
| google | `gemini` |
| xai | `grok` |
| moonshot | `kimi` |
| zhipu | `glm` |
| cursor | `composer` |
| meta | `llama` |
| mistral | `mistral`, `devstral`, `codestral` |
| deepseek | `deepseek` |
| unknown | anything else — each distinct unknown name is its own family named after that name |

Two names in the same family are not diversity. Keep one.

## Auto-pick

Need `agents` families: 3 by default, 2 when the request is small, local,
or mechanical. Never more than 3 unless the user named that many models.
If the live list has fewer families than `agents`, use every remaining
family and say so.

1. Detect the parent family when the session names the current model. Exclude that family from workers.
2. From remaining families on the live list, take up to `agents`, in this **preference order** (skip missing): openai, google, xai, moonshot, anthropic, zhipu, deepseek, cursor, mistral, meta, then any leftover families alphabetically.
3. Inside a family, pick the highest-tier name the live list offers (thinking/high/max/pro before flash/mini/fast).
4. If fewer than two families remain, stop. Tell the user to use `deep-deliberation` or name models this host cannot spawn.
5. Announce the pick, then spawn. Auto-pick is consent to choose; do not ask again.

Example (illustrative, not a menu): parent is Grok on a Cursor session that also lists GPT Sol, Gemini Flash, Kimi, GLM, Fable → auto-pick `gpt-5.6-sol-high`, `gemini-3.7-flash-high`, `kimi-k3-max`.

## How to spawn

Workers get the worker prompt. They must not edit the project.

| Host | Spawn |
|---|---|
| `cursor` | Parallel Task agents. Pass `model` only from the live list. Prefer `subagent_type: explore`. The prompt forbids writes; do not rely on a readonly flag existing. |
| `claude-code` | Parallel Task/subagent calls with an explicit `model` when the tool accepts one. Same write ban in the prompt. |
| `opencode` | Launch subagents with an explicit `model` if this session can. If OpenCode would inherit the parent model, stop. |
| `copilot` / `codex` / `other` | Use the host's child-agent model parameter when it exists. If children cannot be given a different model, stop. |

Never require a YAML stack, Pi, or a second checkout. Never start two write-capable children against the same working directory.

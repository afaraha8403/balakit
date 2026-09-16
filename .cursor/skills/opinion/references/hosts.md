# Host detection, live lists, roster

Read this file in Step 1 of `opinion`. The live list this session
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

If `other`, try the host's documented subagent-with-model mechanism once.
If it cannot spawn a child at all, stop. Auto-pick still needs two
spawnable families; Current-for-all does not.

## Live list

Collect every model identifier this session is allowed to pass when
spawning a child. On Cursor that is the listed subagent model names. On
other hosts, the equivalent Task/subagent `model` enum or picker.

`inherit` is the **Current** handle. Do not put it on the family option
list (Current is its own option). Keep it for spawn when the roster slot
is Current.

Exclude from the **family** working list:

- `inherit` (already represented as Current)
- Names the user did not enable / the spawn API rejected
- Fast/mini/haiku-class twins when a higher-tier name exists in the same family

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

Two names in the same family are not diversity **for auto-pick**. User
assignment may repeat a family across slots.

## Display names (slug shield)

Spawn identifiers in the parent context window can reroute the parent
or poison later asks. Keep them out of everything except the spawn
tool's `model` argument.

| Family id | Display label | Option `id` |
|---|---|---|
| current | Current model | `current` |
| anthropic | Claude | `fam-anthropic` |
| openai | OpenAI | `fam-openai` |
| google | Gemini | `fam-google` |
| xai | Grok | `fam-xai` |
| moonshot | Kimi | `fam-moonshot` |
| zhipu | GLM | `fam-zhipu` |
| cursor | Composer | `fam-cursor` |
| meta | Llama | `fam-meta` |
| mistral | Mistral | `fam-mistral` |
| deepseek | DeepSeek | `fam-deepseek` |
| unknown | that family's live-list token, title-cased, never the full identifier | `fam-unknown-N` |

Never use a live-list identifier as an option `id`, option `label`,
question prompt, chat roster, worker IDENTITY, or take label.

Announce the roster with display names only: `Current, OpenAI, Grok`.

Map at spawn time only:

- `current` → Cursor: pass `inherit`. Other hosts: omit `model` so the child inherits.
- `fam-*` → highest-tier name on the live list in that family.

The worker prompt gets `slot` + display name, never the spawn id.

## Auto-pick

Need `agents` families (opinion default 3, min 2, max 5). If the live list
has fewer families than `agents`, use every remaining family and say so.

1. Detect the parent family when the session names the current model. Exclude that family from workers.
2. From remaining families on the live list, take up to `agents`, in this **preference order** (skip missing): openai, google, xai, moonshot, anthropic, zhipu, deepseek, cursor, mistral, meta, then any leftover families alphabetically.
3. Inside a family, pick the highest-tier name the live list offers (thinking/high/max/pro before flash/mini/fast).
4. If fewer than two families remain, stop. Offer Current-for-all or `deep-deliberation`.
5. Announce the pick with **display names**, then spawn. Auto-pick is consent to choose; do not ask again.

Example (illustrative, not a menu): parent is Grok on a Cursor session that also lists OpenAI, Gemini, Kimi, GLM, Claude → auto-pick OpenAI, Gemini, Kimi.

## How to spawn

Workers get the worker prompt. They must not edit the project.

| Host | Spawn |
|---|---|
| `cursor` | Parallel Task agents. Current → `inherit`. Other slots: `model` from the live list, mapped from the family alias. Prefer `subagent_type: explore`. The prompt forbids writes; do not rely on a readonly flag existing. |
| `claude-code` | Parallel Task/subagent calls. Current → omit `model`. Explicit `model` only for non-current families. Same write ban in the prompt. |
| `opencode` | Current may inherit. Auto-pick must set an explicit other-family model; if it cannot, stop. |
| `copilot` / `codex` / `other` | Current → inherit/omit. Other slots: the host's child-agent model parameter. If children cannot be spawned at all, stop. |

Never require a YAML stack, Pi, or a second checkout. Never start two write-capable children against the same working directory.

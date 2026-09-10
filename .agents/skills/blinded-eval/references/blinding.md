# Blinding rules

Hold this file back from candidates. The parent and the judge may read it.

## Words candidates must not see

Do not put these in any directory, file, or prompt a candidate receives:

`eval`, `test` (as in experiment), `judge`, `experiment`, `rubric`, `score`,
`compare`, `benchmark`, `candidate`, `arena`, `baseline`, `variant`,
`control`, `treatment`.

`test` as in "unit test" inside a planted app is fine. Do not name the
working directory `eval-run`.

## Prompts

- Looks like an organic user request. Goal, not meta.
- No chain-eliciting cues. Do not ask which skills or files they applied.
- Do not tell the candidate other candidates exist.

## Labels

The judge sees `A`, `B`, `C`. The parent keeps the mapping
(label → variant + model) off the judge's prompt.

When comparing two variants, one judge scores every labeled set in a
single pass on one scale.

## Transcripts

If the host stores a local agent transcript for this workspace, you may
read which files a candidate opened. Do not glob across `~/.cursor/projects/*/`.
That crosses workspace boundaries. If no transcript is available, grade from
the written artifacts only and say so.

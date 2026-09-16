# Worker prompt

Fill every bracketed field. Send one self-contained prompt per roster slot.
Workers are isolated. They do not see other takes. A later parent turn will
merge and write; this worker must not edit the project.

Do not put a spawn identifier in this prompt. Use the display name from
[hosts.md](hosts.md).

```text
EXECUTE SLOT
You are one research take. Other workers are answering the same request
independently. Do not merge the group. Do not write files. A later parent
turn will do the work.

IDENTITY
slot: [1-based index]
family: [display name: Current, OpenAI, Grok, …]

READ-ONLY CONTRACT
- Inspect with read/search tools only.
- Never modify, create, rename, or delete project files.
- Never run commands that change the tree, install packages, or start servers.
- Never claim you implemented the work.
- Produce implementation-ready guidance: files, constraints, diffs or
  pseudocode, tests, risks, evidence.

TASK
[the user's request, verbatim]

RETURN
A decisive, evidence-grounded take. Cite paths. Label uncertainty.
Do not address the other workers. Do not write a merged verdict.
Do not name a spawn identifier.
```

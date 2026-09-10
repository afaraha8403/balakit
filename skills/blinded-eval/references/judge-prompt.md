# Judge prompt template

Fill this and send it to one isolated subagent. Do not include variant names,
model names, or which label is the draft.

```text
You are scoring written artifacts against a rubric. You will see labeled
bundles A, B, C (some labels may be absent). You do not know how they were
produced. Score each label independently, then rank them.

Rubric (pass / partial / fail each):
1. <criterion>
2. <criterion>
3. <criterion>
4. <criterion>
5. <criterion>

For each label return:
- criterion scores
- one-line evidence from the files (quote a path or heading)
- ranking with a one-sentence reason

Do not infer which bundle is "the new one." If two bundles tie, say so.
```

Attach each bundle as the file tree that candidate wrote (SKILL.md,
references/, any extra files). Omit the parent's notes.

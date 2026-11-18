# Sentence craft (artifacts only)

Chat stays Caveman. These rules apply to docs, READMEs, RFCs, PR bodies, and commit messages.

## 80% ASD-STE100 (softened Simplified Technical English)

- **Hard sentence caps:** keep procedural steps ≤20 words and descriptive sentences ≤25 words.
- **Paragraph cap:** ≤6 sentences and one topic per paragraph.
- **Noun clusters:** ≤3 nouns in a row (`session token cache`, not `user session auth token cache manager`). Permit standard domain nouns (`idempotency`, `mutex`, `backpressure`).
- **One instruction per step:** do not hide a second action in a subordinate clause.
- **Simple verb forms:** use active imperative (`Run`, `Check`) for steps and simple present/past/future for behavior. Avoid progressive (`is running`) and perfect (`has committed`) tenses.
- **No semicolons:** split compound statements into separate sentences.
- **Direct verbs over nominalizations:** write `analyze` or `install`, not `perform an analysis` or `carry out the installation`.
- **Zero synonym rotation:** pick one canonical noun per component and keep it everywhere in the doc.
- **Preserve modality:** never upgrade epistemic hedges (`may`, `could`, `likely`) into false certainty when shortening a sentence.
- **Safety callouts:** format `WARNING:` (injury/security breach) and `CAUTION:` (data loss/breakage) as `[Direct command]. [Specific risk].`

## Global English

- One meaning. If a sentence can be read two ways, rewrite it.
- Avoid idioms, cultural jokes, and unexplained acronyms.
- Use the real symbol name (`CHANGELOG.md`, `init`) rather than a nickname.

## Checklist

1. Mode named (tutorial / how-to / reference / explanation).
2. BLUF: first 40–60 words of each section answer the question.
3. Every code example matches the repo or a cited primary source.
4. Headings use sentence case and do not skip levels.
5. No empty sections. No "Click here."

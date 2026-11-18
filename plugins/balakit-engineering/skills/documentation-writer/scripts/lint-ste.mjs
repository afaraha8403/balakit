#!/usr/bin/env node
/**
 * Zero-dependency 80% ASD-STE100 linter for technical markdown and prose artifacts.
 *
 * Strips YAML frontmatter, fenced code blocks, HTML comments, and inline code spans
 * so symbol names and code examples do not trigger false positives.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Unapproved STE words and phrases mapped to plain English replacements.
 * @type {Readonly<Record<string, string>>}
 */
export const STE_REPLACEMENTS = Object.freeze({
  ensure: "make sure",
  "prior to": "before",
  replenish: "fill",
  utilize: "use",
  utilizes: "uses",
  utilized: "used",
  commence: "start",
  commences: "starts",
  commenced: "started",
  approximately: "about",
  "in order to": "to",
  terminate: "stop",
  terminates: "stops",
  terminated: "stopped",
  modify: "change",
  modifies: "changes",
  modified: "changed",
  obtain: "get",
  obtains: "gets",
  obtained: "got",
  "subsequent to": "after",
});

/**
 * Soft phrasal verbs mapped to direct single verbs (STE Rule 9.3).
 * @type {Readonly<Record<string, string>>}
 */
export const PHRASAL_VERBS = Object.freeze({
  "spin up": "start",
  "spun up": "started",
  "reach out": "contact",
  "dive into": "inspect",
  "kick off": "start",
  "circle back": "return",
  "touch base": "contact",
});

/**
 * AI filler buzzwords and decorative marketing terms banned in technical artifacts.
 * @type {readonly string[]}
 */
export const AI_BUZZWORDS = Object.freeze([
  "delve",
  "delves",
  "leverage",
  "leverages",
  "leveraged",
  "leveraging",
  "tapestry",
  "seamless",
  "seamlessly",
  "revolutionize",
  "testament",
  "beacon",
  "cutting-edge",
  "game-changer",
  "transformative",
  "holistic",
  "multifaceted",
  "effortless",
  "effortlessly",
  "blazing-fast",
  "world-class",
  "state-of-the-art",
  "secret sauce",
  "north star",
]);

const NON_PROGRESSIVE_ING = new Set([
  "according",
  "anything",
  "bring",
  "cling",
  "corresponding",
  "everything",
  "existing",
  "fling",
  "following",
  "king",
  "leading",
  "matching",
  "missing",
  "nothing",
  "pending",
  "ping",
  "remaining",
  "ring",
  "sing",
  "something",
  "spring",
  "standing",
  "string",
  "swing",
  "thing",
  "underlying",
  "willing",
  "wing",
]);

const NOMINALIZATION_RE =
  /\b(?:perform|performs|performed|conduct|conducts|conducted|carry out|carries out|carried out)\s+(?:a|an|the)\s+[a-z]+(?:tion|sion|ment|ance|ence|ysis)\b/i;

const PROGRESSIVE_RE = /\b(?:is|are|was|were)\s+([a-z]+ing)\b/gi;

/**
 * @typedef {{
 *   rule:
 *     | "SEMICOLON"
 *     | "SENTENCE_TOO_LONG"
 *     | "PARAGRAPH_TOO_LONG"
 *     | "UNAPPROVED_WORD"
 *     | "PHRASAL_VERB"
 *     | "NOMINALIZATION"
 *     | "AI_BUZZWORD"
 *     | "PROGRESSIVE_TENSE",
 *   line: number,
 *   message: string,
 *   snippet: string,
 * }} SteIssue
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   sentenceCount: number,
 *   issueCount: number,
 *   issues: SteIssue[],
 * }} SteReport
 */

function preserveNewlines(chunk) {
  return chunk.replace(/[^\n]/g, "");
}

function sanitizeMarkdown(raw) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/^---\n[\s\S]*?\n---(?=\n|$)/, preserveNewlines)
    .replace(/```[\s\S]*?```/g, preserveNewlines)
    .replace(/~~~[\s\S]*?~~~/g, preserveNewlines)
    .replace(/<!--[\s\S]*?-->/g, preserveNewlines)
    .replace(/<(?:p|h[1-6]|div)\b[^>]*>[\s\S]*?<\/(?:p|h[1-6]|div)>/gi, preserveNewlines)
    .replace(/`[^`\n]+`/g, "code")
    .replace(/\[([^\]]+)\]\([^)\n]+\)/g, "$1");
}

function clip(text) {
  return text.length > 88 ? `${text.slice(0, 85)}...` : text;
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function checkSentence(sentence, line, procedural, issues) {
  const words = sentence.match(/[A-Za-z0-9'-]+/g) ?? [];
  const cap = procedural ? 20 : 25;
  const kind = procedural ? "Procedural step" : "Descriptive sentence";

  if (sentence.includes(";")) {
    issues.push({
      rule: "SEMICOLON",
      line,
      message: "Semicolons are banned in STE (Rule 8.1). Split into two sentences.",
      snippet: clip(sentence),
    });
  }

  if (words.length > cap) {
    issues.push({
      rule: "SENTENCE_TOO_LONG",
      line,
      message: `${kind} exceeds ${cap} words (${words.length} words). Shorten or split.`,
      snippet: clip(sentence),
    });
  }

  const lower = sentence.toLowerCase();

  for (const [bad, good] of Object.entries(STE_REPLACEMENTS)) {
    const re = new RegExp(`\\b${bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) {
      issues.push({
        rule: "UNAPPROVED_WORD",
        line,
        message: `Replace '${bad}' with '${good}'.`,
        snippet: clip(sentence),
      });
    }
  }

  for (const [phrasal, plain] of Object.entries(PHRASAL_VERBS)) {
    const re = new RegExp(`\\b${phrasal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) {
      issues.push({
        rule: "PHRASAL_VERB",
        line,
        message: `Replace phrasal verb '${phrasal}' with '${plain}' (Rule 9.3).`,
        snippet: clip(sentence),
      });
    }
  }

  const nom = sentence.match(NOMINALIZATION_RE);
  if (nom) {
    issues.push({
      rule: "NOMINALIZATION",
      line,
      message: `Replace nominalization '${nom[0]}' with a direct action verb (Rule 3.7).`,
      snippet: clip(sentence),
    });
  }

  for (const buzz of AI_BUZZWORDS) {
    const re = new RegExp(`\\b${buzz.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) {
      issues.push({
        rule: "AI_BUZZWORD",
        line,
        message: `Remove AI filler term '${buzz}'. State the plain fact.`,
        snippet: clip(sentence),
      });
    }
  }

  for (const match of lower.matchAll(PROGRESSIVE_RE)) {
    const ingWord = match[1];
    if (!NON_PROGRESSIVE_ING.has(ingWord)) {
      issues.push({
        rule: "PROGRESSIVE_TENSE",
        line,
        message: `Avoid progressive verb '${match[0]}'. Use simple present, past, or imperative.`,
        snippet: clip(sentence),
      });
    }
  }
}

/**
 * Audit markdown or plain text against 80% ASD-STE100 constraints.
 *
 * @param {string} markdown
 * @returns {SteReport}
 */
export function lintSte(markdown) {
  const clean = sanitizeMarkdown(markdown);
  const lines = clean.split("\n");
  /** @type {SteIssue[]} */
  const issues = [];
  let sentenceCount = 0;

  let paragraphLines = [];
  let paragraphStartLine = 1;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join(" ").replace(/\s+/g, " ").trim();
    paragraphLines = [];
    if (!text) return;
    const sentences = splitSentences(text);
    sentenceCount += sentences.length;
    if (sentences.length > 6) {
      issues.push({
        rule: "PARAGRAPH_TOO_LONG",
        line: paragraphStartLine,
        message: `Descriptive paragraph exceeds 6 sentences (${sentences.length} sentences). Keep one topic per paragraph.`,
        snippet: clip(text),
      });
    }
    for (const s of sentences) {
      checkSentence(s, paragraphStartLine, false, issues);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const rawLine = lines[i].trim();

    if (
      !rawLine ||
      /^#{1,6}\s+/.test(rawLine) ||
      /^(?:---|___|\*\*\*)\s*$/.test(rawLine) ||
      rawLine.startsWith("|")
    ) {
      flushParagraph();
      continue;
    }

    const numbered = rawLine.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      const stepSentences = splitSentences(numbered[1]);
      sentenceCount += stepSentences.length;
      for (const s of stepSentences) {
        checkSentence(s, lineNo, true, issues);
      }
      continue;
    }

    const bullet = rawLine.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      const itemSentences = splitSentences(bullet[1]);
      sentenceCount += itemSentences.length;
      for (const s of itemSentences) {
        checkSentence(s, lineNo, false, issues);
      }
      continue;
    }

    const unquoted = rawLine.replace(/^>\s*/, "");
    if (!unquoted) {
      flushParagraph();
      continue;
    }
    if (paragraphLines.length === 0) paragraphStartLine = lineNo;
    paragraphLines.push(unquoted);
  }
  flushParagraph();

  return {
    ok: issues.length === 0,
    sentenceCount,
    issueCount: issues.length,
    issues,
  };
}

function runCli(argv) {
  const json = argv.includes("--json");
  const targets = argv.filter((a) => a !== "--json");

  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: node lint-ste.mjs [--json] <file... | ->");
    return 0;
  }

  /** @type {{ source: string, text: string }[]} */
  const inputs = [];
  if (targets.length === 0 || (targets.length === 1 && targets[0] === "-")) {
    if (targets.length === 0 && process.stdin.isTTY) {
      console.error("Usage: node lint-ste.mjs [--json] <file... | ->");
      return 2;
    }
    inputs.push({ source: "<stdin>", text: readFileSync(0, "utf8") });
  } else {
    for (const file of targets) {
      inputs.push({
        source: file,
        text: file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8"),
      });
    }
  }

  const combinedIssues = [];
  let totalSentences = 0;
  for (const { source, text } of inputs) {
    const report = lintSte(text);
    totalSentences += report.sentenceCount;
    for (const issue of report.issues) {
      combinedIssues.push(inputs.length > 1 ? { file: source, ...issue } : issue);
    }
  }

  const summary = {
    ok: combinedIssues.length === 0,
    sentenceCount: totalSentences,
    issueCount: combinedIssues.length,
    issues: combinedIssues,
  };

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else if (summary.ok) {
    console.log(`80% STE OK (${summary.sentenceCount} sentences checked, 0 issues).`);
  } else {
    console.log(
      `80% STE found ${summary.issueCount} issue(s) across ${summary.sentenceCount} sentence(s):`,
    );
    for (const issue of summary.issues) {
      const loc = issue.file ? `${issue.file}:${issue.line}` : `line ${issue.line}`;
      console.log(`  [${issue.rule}] ${loc} — ${issue.message}`);
      console.log(`    > ${issue.snippet}`);
    }
  }

  return summary.ok ? 0 : 1;
}

const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  process.exit(runCli(process.argv.slice(2)));
}

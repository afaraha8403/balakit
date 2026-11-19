#!/usr/bin/env node
/**
 * Zero-dependency MCP stdio server and user-scope harness config helpers.
 *
 * Exposes a capability-gated `ask_user` tool backed by MCP form elicitation
 * (`elicitation/create`) so hosts that support form elicitation render native
 * graphical question cards, while hosts without elicitation skip it cleanly.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {{ label: string, description?: string }} QuestionOption
 *
 * @typedef {{
 *   id: string,
 *   header: string,
 *   question: string,
 *   options: QuestionOption[],
 *   multiSelect: boolean,
 * }} NormalizedQuestion
 *
 * @typedef {{
 *   written: string[],
 *   removed: string[],
 *   surfaces: string[],
 *   files: Record<string, string>,
 *   droppedFiles: string[],
 *   notes: string[],
 * }} HarnessConfigResult
 */

const SELF_PATH = fileURLToPath(import.meta.url);
const SUPPORTED_PROTOCOLS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const DEFAULT_PROTOCOL = "2025-11-25";

function detectVersion() {
  for (const rel of ["installed.json", "../../package.json"]) {
    try {
      const candidate = resolve(dirname(SELF_PATH), rel);
      if (!existsSync(candidate)) continue;
      const parsed = JSON.parse(readFileSync(candidate, "utf8"));
      if (typeof parsed?.version === "string" && parsed.version) return parsed.version;
    } catch {
      // Ignore unreadable metadata and fall back to default version.
    }
  }
  return "1.0.0";
}

function textSha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * MCP tool descriptor for structured user questions.
 */
export const ASK_USER_TOOL = {
  name: "ask_user",
  title: "Ask User",
  description:
    "Ask the user 1 to 4 structured multiple-choice or free-text questions in a native UI card and return their selected or custom answers.",
  inputSchema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        description: "List of 1 to 4 concise questions for the user.",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Stable identifier such as q1.",
            },
            header: {
              type: "string",
              maxLength: 12,
              description: "Short badge title (12 characters max).",
            },
            question: {
              type: "string",
              description: "Plain-English question sentence.",
            },
            options: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              description:
                "Optional 2 to 4 choices. Omit for free-text input. A custom Other text field is provided automatically.",
              items: {
                type: "object",
                properties: {
                  label: {
                    type: "string",
                    description: "Short choice label; end the default option with (Recommended).",
                  },
                  description: {
                    type: "string",
                    description: "One-sentence explanation of the option.",
                  },
                },
                required: ["label"],
              },
            },
            multiSelect: {
              type: "boolean",
              description: "Allow selecting multiple options when true.",
            },
          },
          required: ["question"],
        },
      },
    },
    required: ["questions"],
  },
};

/**
 * Check whether MCP client capabilities support form elicitation.
 * @param {Record<string, unknown>|undefined|null} capabilities
 */
export function clientSupportsFormElicitation(capabilities) {
  const elicitation = capabilities?.elicitation;
  if (!elicitation || typeof elicitation !== "object" || Array.isArray(elicitation)) {
    return false;
  }
  if ("form" in elicitation) {
    return Boolean(elicitation.form && typeof elicitation.form === "object");
  }
  if ("url" in elicitation) {
    return false;
  }
  return true;
}

/**
 * Validate and normalize `ask_user` tool arguments into 1 to 4 questions.
 * @param {Record<string, unknown>} args
 * @returns {NormalizedQuestion[]}
 * @throws {Error} When questions are missing, exceed 4 items, or lack prompt text.
 */
export function normalizeQuestions(args) {
  if (!args || typeof args !== "object") {
    throw new Error("ask_user expects an object with questions.");
  }

  const rawList = Array.isArray(args.questions)
    ? args.questions
    : typeof args.question === "string" || typeof args.prompt === "string"
      ? [args]
      : null;

  if (!rawList || rawList.length < 1 || rawList.length > 4) {
    throw new Error("ask_user requires 1 to 4 questions.");
  }

  const usedIds = new Set();
  return rawList.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Question ${idx + 1} must be an object.`);
    }
    const text = String(item.question ?? item.prompt ?? "").trim();
    if (!text) {
      throw new Error(`Question ${idx + 1} requires a non-empty question string.`);
    }
    let id = String(item.id ?? `q${idx + 1}`).trim() || `q${idx + 1}`;
    id = id.replace(/__other$/i, "");
    if (usedIds.has(id)) id = `${id}_${idx + 1}`;
    usedIds.add(id);

    const rawHeader = String(item.header ?? item.title ?? `Question ${idx + 1}`).trim();
    const header = (rawHeader || `Question ${idx + 1}`).slice(0, 12);

    const rawOptions = Array.isArray(item.options)
      ? item.options
      : Array.isArray(item.choices)
        ? item.choices
        : [];
    if (rawOptions.length === 1 || rawOptions.length > 4) {
      throw new Error(`Question "${id}" options must contain 2 to 4 choices when provided.`);
    }

    const options = rawOptions.map((opt, optIdx) => {
      if (typeof opt === "string") {
        const label = opt.trim();
        if (!label) throw new Error(`Option ${optIdx + 1} in "${id}" cannot be empty.`);
        return { label };
      }
      if (!opt || typeof opt !== "object") {
        throw new Error(`Option ${optIdx + 1} in "${id}" must be an object or string.`);
      }
      const label = String(opt.label ?? opt.title ?? opt.value ?? "").trim();
      if (!label) throw new Error(`Option ${optIdx + 1} in "${id}" requires a label.`);
      const description = typeof opt.description === "string" && opt.description.trim()
        ? opt.description.trim()
        : undefined;
      return description ? { label, description } : { label };
    });

    const multiSelect = Boolean(item.multiSelect ?? item.multiple ?? item.allow_multiple);
    return { id, header, question: text, options, multiSelect };
  });
}

/**
 * Build MCP `elicitation/create` parameters from normalized questions.
 * @param {NormalizedQuestion[]} questions
 * @param {string} [protocolVersion]
 */
export function buildElicitationParams(questions, protocolVersion = DEFAULT_PROTOCOL) {
  const message =
    questions.length === 1
      ? questions[0].question
      : questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n");

  /** @type {Record<string, object>} */
  const properties = {};
  /** @type {string[]} */
  const required = [];

  for (const q of questions) {
    if (q.options.length > 0 && q.multiSelect) {
      // Omit `items.type` so T3 Code's `parseElicitationForm` parses `items.anyOf` choices.
      properties[q.id] = {
        type: "array",
        title: q.header,
        description: q.question,
        items: {
          anyOf: q.options.map((opt) => ({
            const: opt.label,
            title: opt.label,
            ...(opt.description ? { description: opt.description } : {}),
          })),
        },
      };
    } else if (q.options.length > 0) {
      properties[q.id] = {
        type: "string",
        title: q.header,
        description: q.question,
        oneOf: q.options.map((opt) => ({
          const: opt.label,
          title: opt.label,
          ...(opt.description ? { description: opt.description } : {}),
        })),
      };
      // T3 Code pairs `${id}__other` as the built-in custom-answer input when neither field is required.
      properties[`${q.id}__other`] = {
        type: "string",
        title: "Other",
        description: "Custom answer",
      };
    } else {
      properties[q.id] = {
        type: "string",
        title: q.header,
        description: q.question,
      };
      required.push(q.id);
    }
  }

  return {
    ...(protocolVersion >= "2025-11-25" ? { mode: "form" } : {}),
    message,
    requestedSchema: {
      type: "object",
      properties,
      ...(required.length ? { required } : {}),
    },
  };
}

/**
 * Normalize an MCP `elicitation/create` response into a structured answer map.
 * @param {NormalizedQuestion[]} questions
 * @param {Record<string, unknown>|undefined|null} result
 */
export function normalizeElicitationResult(questions, result) {
  const action =
    result?.action === "accept" || result?.action === "decline" || result?.action === "cancel"
      ? result.action
      : "cancel";

  if (action !== "accept") {
    return { action, answers: {} };
  }

  const content =
    result?.content && typeof result.content === "object" && !Array.isArray(result.content)
      ? /** @type {Record<string, unknown>} */ (result.content)
      : {};

  /** @type {Record<string, unknown>} */
  const answers = {};
  for (const q of questions) {
    const custom = content[`${q.id}__other`];
    if (typeof custom === "string" && custom.trim().length > 0) {
      answers[q.id] = custom.trim();
    } else if (content[q.id] !== undefined) {
      answers[q.id] = content[q.id];
    }
  }
  return { action: "accept", answers };
}

/**
 * Create a stateful MCP JSON-RPC session dispatcher.
 * @param {{
 *   send: (msg: object) => void,
 *   forceTools?: boolean,
 *   version?: string,
 * }} opts
 */
export function createMcpSession({ send, forceTools = false, version = detectVersion() }) {
  let negotiatedProtocol = DEFAULT_PROTOCOL;
  let formElicitation = Boolean(forceTools);
  let nextReqId = 1;
  /** @type {Map<string|number, { resolve: (v: any) => void, reject: (e: Error) => void }>} */
  const pending = new Map();

  function sendRequest(method, params) {
    const id = `balakit-${nextReqId++}`;
    return new Promise((resolveReq, rejectReq) => {
      pending.set(id, { resolve: resolveReq, reject: rejectReq });
      send({ jsonrpc: "2.0", id, method, params });
    });
  }

  function closeAll(reason = "MCP transport closed.") {
    for (const [, entry] of pending) {
      entry.reject(new Error(reason));
    }
    pending.clear();
  }

  async function handleMessage(msg) {
    if (!msg || typeof msg !== "object") return;

    // Client response to a server-initiated request (such as `elicitation/create`).
    if (!("method" in msg) && "id" in msg && pending.has(msg.id)) {
      const entry = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        entry.reject(new Error(msg.error.message || "Client request failed."));
      } else {
        entry.resolve(msg.result);
      }
      return;
    }

    // Notifications carry no `id` and expect no reply.
    if (!("id" in msg) || msg.id === undefined || msg.id === null) {
      return;
    }

    const { id, method, params } = msg;

    if (method === "initialize") {
      const requested = typeof params?.protocolVersion === "string" ? params.protocolVersion : "";
      negotiatedProtocol = SUPPORTED_PROTOCOLS.includes(requested) ? requested : DEFAULT_PROTOCOL;
      formElicitation = Boolean(forceTools) || clientSupportsFormElicitation(params?.capabilities);
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: negotiatedProtocol,
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "balakit",
            version,
          },
        },
      });
      return;
    }

    if (method === "ping") {
      send({ jsonrpc: "2.0", id, result: {} });
      return;
    }

    if (method === "tools/list") {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          tools: formElicitation ? [ASK_USER_TOOL] : [],
        },
      });
      return;
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      if (toolName !== "ask_user") {
        send({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: `Unknown tool: ${String(toolName)}` },
        });
        return;
      }
      if (!formElicitation) {
        send({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: "This MCP host does not support form elicitation. Ask the user with a numbered plain-text list instead.",
              },
            ],
          },
        });
        return;
      }

      let questions;
      try {
        questions = normalizeQuestions(params?.arguments ?? {});
      } catch (err) {
        send({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: err.message }],
          },
        });
        return;
      }

      try {
        const elicitationParams = buildElicitationParams(questions, negotiatedProtocol);
        const rawResult = await sendRequest("elicitation/create", elicitationParams);
        const normalized = normalizeElicitationResult(questions, rawResult);
        send({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(normalized),
              },
            ],
          },
        });
      } catch (err) {
        send({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: `Elicitation failed: ${err.message}`,
              },
            ],
          },
        });
      }
      return;
    }

    send({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${String(method)}` },
    });
  }

  return { handleMessage, closeAll };
}

/**
 * Run the Balakit MCP server over stdio until the input stream closes.
 * Supports both newline-delimited JSON-RPC and `Content-Length` framing.
 * @param {{
 *   input?: NodeJS.ReadableStream,
 *   output?: NodeJS.WritableStream,
 *   forceTools?: boolean,
 *   version?: string,
 * }} [opts]
 */
export function runMcpServer({
  input = process.stdin,
  output = process.stdout,
  forceTools = false,
  version,
} = {}) {
  let framing = /** @type {"ndjson"|"content-length"|null} */ (null);

  const send = (msg) => {
    const json = JSON.stringify(msg);
    if (framing === "content-length") {
      const byteLen = Buffer.byteLength(json, "utf8");
      output.write(`Content-Length: ${byteLen}\r\n\r\n${json}`);
    } else {
      output.write(`${json}\n`);
    }
  };

  const session = createMcpSession({ send, forceTools, version });
  let buffer = Buffer.alloc(0);

  const drainBuffer = () => {
    while (buffer.length > 0) {
      if (framing === null) {
        const preview = buffer.toString("utf8", 0, Math.min(buffer.length, 32)).trimStart();
        if (!preview) return;
        framing = /^Content-Length:/i.test(preview) ? "content-length" : "ndjson";
      }

      if (framing === "content-length") {
        const headerEnd = buffer.indexOf("\r\n\r\n");
        const lfHeaderEnd = headerEnd < 0 ? buffer.indexOf("\n\n") : -1;
        const sepIdx = headerEnd >= 0 ? headerEnd : lfHeaderEnd;
        const sepLen = headerEnd >= 0 ? 4 : 2;
        if (sepIdx < 0) return;

        const headerText = buffer.toString("utf8", 0, sepIdx);
        const match = headerText.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          buffer = buffer.subarray(sepIdx + sepLen);
          continue;
        }
        const bodyLen = Number(match[1]);
        if (buffer.length < sepIdx + sepLen + bodyLen) return;

        const bodyText = buffer.toString("utf8", sepIdx + sepLen, sepIdx + sepLen + bodyLen);
        buffer = buffer.subarray(sepIdx + sepLen + bodyLen);
        try {
          session.handleMessage(JSON.parse(bodyText));
        } catch {
          // Ignore malformed JSON frames.
        }
      } else {
        const nlIdx = buffer.indexOf(0x0a);
        if (nlIdx < 0) return;
        const line = buffer.toString("utf8", 0, nlIdx).trim();
        buffer = buffer.subarray(nlIdx + 1);
        if (!line) continue;
        try {
          session.handleMessage(JSON.parse(line));
        } catch {
          // Ignore malformed JSON lines.
        }
      }
    }
  };

  return new Promise((resolveRun) => {
    const onData = (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8");
      buffer = buffer.length === 0 ? buf : Buffer.concat([buffer, buf]);
      drainBuffer();
    };
    const onEnd = () => {
      input.off("data", onData);
      session.closeAll();
      resolveRun(0);
    };
    input.on("data", onData);
    input.once("end", onEnd);
    input.once("close", onEnd);
    if (typeof input.resume === "function") input.resume();
  });
}

function mergeJsonMcpServer(absPath, displayKey, serverEntry, { dryRun = false } = {}) {
  let root = {};
  if (existsSync(absPath)) {
    try {
      const parsed = JSON.parse(readFileSync(absPath, "utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { skippedNote: `Skipped ${displayKey}: root JSON value is not an object.` };
      }
      root = parsed;
    } catch {
      return { skippedNote: `Skipped ${displayKey}: invalid JSON syntax (left untouched).` };
    }
  }

  const servers =
    root.mcpServers && typeof root.mcpServers === "object" && !Array.isArray(root.mcpServers)
      ? { ...root.mcpServers }
      : {};

  if (JSON.stringify(servers.balakit) === JSON.stringify(serverEntry)) {
    return { changed: false };
  }

  const next = { ...root, mcpServers: { ...servers, balakit: serverEntry } };
  if (!dryRun) {
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, `${JSON.stringify(next, null, 2)}\n`);
  }
  return { changed: true };
}

function removeJsonMcpServer(absPath, { dryRun = false } = {}) {
  if (!existsSync(absPath)) return false;
  let root;
  try {
    root = JSON.parse(readFileSync(absPath, "utf8"));
  } catch {
    return false;
  }
  if (!root?.mcpServers || typeof root.mcpServers !== "object" || !("balakit" in root.mcpServers)) {
    return false;
  }
  const nextServers = { ...root.mcpServers };
  delete nextServers.balakit;
  const next = { ...root, mcpServers: nextServers };
  if (!dryRun) {
    writeFileSync(absPath, `${JSON.stringify(next, null, 2)}\n`);
  }
  return true;
}

function ensureCodexQuestionFeature(absPath, { dryRun = false } = {}) {
  const current = existsSync(absPath) ? readFileSync(absPath, "utf8") : "";
  // Respect any existing user setting (`true` or `false`).
  if (/^\s*default_mode_request_user_input\s*=/m.test(current)) {
    return false;
  }

  let next;
  const featuresHeader = /^\s*\[features\]\s*(?:#.*)?$/m.exec(current);
  if (featuresHeader) {
    const insertPos = featuresHeader.index + featuresHeader[0].length;
    next =
      current.slice(0, insertPos) +
      "\ndefault_mode_request_user_input = true" +
      current.slice(insertPos);
  } else if (!current.trim()) {
    next = "[features]\ndefault_mode_request_user_input = true\n";
  } else {
    const sep = current.endsWith("\n") ? "\n" : "\n\n";
    next = `${current}${sep}[features]\ndefault_mode_request_user_input = true\n`;
  }

  if (!dryRun) {
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, next);
  }
  return true;
}

/**
 * Configure user-scope Question UI and MCP wiring for selected harnesses.
 *
 * - Copies standalone `~/.balakit/mcp.mjs` when Copilot or Gemini CLI is active.
 * - Registers `mcpServers.balakit` in `~/.copilot/mcp-config.json` (Copilot)
 *   and `~/.gemini/settings.json` (Gemini CLI) without overwriting user servers.
 * - Enables `[features] default_mode_request_user_input = true` in
 *   `~/.codex/config.toml` when Codex is active and unset.
 *
 * @param {{
 *   agentIds: string[],
 *   home?: string,
 *   dryRun?: boolean,
 *   pruneUnselected?: boolean,
 *   recordedSurfaces?: string[],
 * }} opts
 * @returns {HarnessConfigResult}
 */
export function installUserHarnessConfigs({
  agentIds = [],
  home = homedir(),
  dryRun = false,
  pruneUnselected = false,
  recordedSurfaces = [],
} = {}) {
  const written = [];
  const removed = [];
  const surfaces = [];
  /** @type {Record<string, string>} */
  const files = {};
  const droppedFiles = [];
  const notes = [];

  const wantsCopilot = agentIds.includes("copilot");
  const wantsGemini = agentIds.includes("gemini-cli");
  const wantsCodex = agentIds.includes("codex");
  const wantsMcpScript = wantsCopilot || wantsGemini;

  const mcpAbs = join(home, ".balakit", "mcp.mjs");
  const mcpKey = "~/.balakit/mcp.mjs";

  if (wantsMcpScript) {
    const sourceText = readFileSync(SELF_PATH, "utf8");
    const desiredHash = textSha256(sourceText);
    const existingHash = existsSync(mcpAbs) ? textSha256(readFileSync(mcpAbs, "utf8")) : "";
    if (existingHash !== desiredHash) {
      if (!dryRun) {
        mkdirSync(dirname(mcpAbs), { recursive: true });
        copyFileSync(SELF_PATH, mcpAbs);
      }
      written.push(mcpKey);
    }
    surfaces.push(mcpKey);
    files[mcpKey] = desiredHash;
  } else if (pruneUnselected && (recordedSurfaces.includes(mcpKey) || existsSync(mcpAbs))) {
    if (existsSync(mcpAbs)) {
      if (!dryRun) rmSync(mcpAbs, { force: true });
      removed.push(mcpKey);
    }
    droppedFiles.push(mcpKey);
  }

  const copilotAbs = join(home, ".copilot", "mcp-config.json");
  const copilotKey = "~/.copilot/mcp-config.json";
  if (wantsCopilot) {
    const res = mergeJsonMcpServer(
      copilotAbs,
      copilotKey,
      { type: "local", command: "node", args: [mcpAbs], tools: ["*"] },
      { dryRun },
    );
    if (res.skippedNote) {
      notes.push(res.skippedNote);
    } else {
      if (res.changed) written.push(copilotKey);
      surfaces.push(copilotKey);
    }
  } else if (pruneUnselected && recordedSurfaces.includes(copilotKey)) {
    if (removeJsonMcpServer(copilotAbs, { dryRun })) removed.push(`${copilotKey} (mcpServers.balakit)`);
  }

  const geminiAbs = join(home, ".gemini", "settings.json");
  const geminiKey = "~/.gemini/settings.json";
  if (wantsGemini) {
    const res = mergeJsonMcpServer(
      geminiAbs,
      geminiKey,
      { command: "node", args: [mcpAbs] },
      { dryRun },
    );
    if (res.skippedNote) {
      notes.push(res.skippedNote);
    } else {
      if (res.changed) written.push(geminiKey);
      surfaces.push(geminiKey);
    }
  } else if (pruneUnselected && recordedSurfaces.includes(geminiKey)) {
    if (removeJsonMcpServer(geminiAbs, { dryRun })) removed.push(`${geminiKey} (mcpServers.balakit)`);
  }

  const codexAbs = join(home, ".codex", "config.toml");
  const codexKey = "~/.codex/config.toml";
  if (wantsCodex) {
    if (ensureCodexQuestionFeature(codexAbs, { dryRun })) {
      written.push(codexKey);
    }
    surfaces.push(codexKey);
  }

  return { written, removed, surfaces, files, droppedFiles, notes };
}

/**
 * Remove Balakit's user-scope MCP registrations when uninstalling user scope.
 * Preserves user-authored settings in `~/.codex/config.toml` and other MCP servers.
 * @param {{ home?: string, dryRun?: boolean }} [opts]
 */
export function removeUserHarnessConfigs({ home = homedir(), dryRun = false } = {}) {
  const removed = [];
  const droppedFiles = ["~/.balakit/mcp.mjs"];
  const droppedSurfaces = [
    "~/.balakit/mcp.mjs",
    "~/.copilot/mcp-config.json",
    "~/.gemini/settings.json",
  ];

  const copilotAbs = join(home, ".copilot", "mcp-config.json");
  if (removeJsonMcpServer(copilotAbs, { dryRun })) {
    removed.push("~/.copilot/mcp-config.json (mcpServers.balakit)");
  }

  const geminiAbs = join(home, ".gemini", "settings.json");
  if (removeJsonMcpServer(geminiAbs, { dryRun })) {
    removed.push("~/.gemini/settings.json (mcpServers.balakit)");
  }

  const mcpAbs = join(home, ".balakit", "mcp.mjs");
  if (existsSync(mcpAbs)) {
    if (!dryRun) rmSync(mcpAbs, { force: true });
    removed.push("~/.balakit/mcp.mjs");
  }

  return { removed, droppedFiles, droppedSurfaces };
}

/**
 * Verify user-scope MCP and Codex Question UI surfaces for `balakit doctor`.
 * @param {{ surfaces?: string[], home?: string, cmd?: string }} [opts]
 * @returns {{ level: "issue"|"warn", text: string }[]}
 */
export function verifyUserHarnessConfigs({ surfaces = [], home = homedir(), cmd = "balakit" } = {}) {
  /** @type {{ level: "issue"|"warn", text: string }[]} */
  const findings = [];

  for (const [key, abs] of [
    ["~/.copilot/mcp-config.json", join(home, ".copilot", "mcp-config.json")],
    ["~/.gemini/settings.json", join(home, ".gemini", "settings.json")],
  ]) {
    if (!surfaces.includes(key)) continue;
    if (!existsSync(abs)) {
      findings.push({
        level: "issue",
        text: `Missing ${key} (expected mcpServers.balakit). Run \`npx ${cmd}@latest doctor --fix\` or \`update\`.`,
      });
      continue;
    }
    try {
      const parsed = JSON.parse(readFileSync(abs, "utf8"));
      if (!parsed?.mcpServers?.balakit) {
        findings.push({
          level: "issue",
          text: `${key} is missing mcpServers.balakit. Run \`npx ${cmd}@latest doctor --fix\` or \`update\`.`,
        });
      }
    } catch {
      findings.push({
        level: "warn",
        text: `${key} contains invalid JSON; balakit left it untouched.`,
      });
    }
  }

  if (surfaces.includes("~/.codex/config.toml")) {
    const codexAbs = join(home, ".codex", "config.toml");
    if (!existsSync(codexAbs)) {
      findings.push({
        level: "issue",
        text: `Missing ~/.codex/config.toml. Run \`npx ${cmd}@latest doctor --fix\` or \`update\`.`,
      });
    } else {
      const text = readFileSync(codexAbs, "utf8");
      if (!/^\s*default_mode_request_user_input\s*=/m.test(text)) {
        findings.push({
          level: "warn",
          text: `~/.codex/config.toml has no default_mode_request_user_input setting. Run \`npx ${cmd}@latest update\` to restore Codex Default-mode question cards.`,
        });
      }
    }
  }

  return findings;
}

function safeRealpath(p) {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

const invoked = process.argv[1] ? safeRealpath(process.argv[1]) : "";
if (invoked && safeRealpath(SELF_PATH) === invoked) {
  const forceTools = process.argv.includes("--force-tools");
  runMcpServer({ forceTools }).catch((err) => {
    process.stderr.write(`balakit mcp error: ${err?.message ?? err}\n`);
    process.exit(1);
  });
}

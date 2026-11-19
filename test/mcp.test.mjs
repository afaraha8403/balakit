// Integration tests for `balakit mcp` elicitation server and user-scope harness config wiring.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  clientSupportsFormElicitation,
  normalizeQuestions,
  buildElicitationParams,
  normalizeElicitationResult,
  createMcpSession,
  installUserHarnessConfigs,
  removeUserHarnessConfigs,
  verifyUserHarnessConfigs,
} from "../bin/lib/mcp.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(ROOT, "bin/cli.mjs");

test("clientSupportsFormElicitation gates on form elicitation and excludes copilot --acp sampling-only", () => {
  assert.equal(clientSupportsFormElicitation(undefined), false);
  assert.equal(clientSupportsFormElicitation({ sampling: {} }), false);
  assert.equal(clientSupportsFormElicitation({ elicitation: { url: {} } }), false);
  assert.equal(clientSupportsFormElicitation({ elicitation: { form: null } }), false);
  assert.equal(clientSupportsFormElicitation({ elicitation: {} }), true);
  assert.equal(clientSupportsFormElicitation({ elicitation: { form: {} } }), true);
  assert.equal(clientSupportsFormElicitation({ elicitation: { form: {}, url: {} } }), true);
});

test("buildElicitationParams satisfies T3 Code parseElicitationForm invariants for choice, multiSelect, and text", () => {
  const questions = normalizeQuestions({
    questions: [
      {
        id: "canvas",
        header: "Plan canvas",
        question: "Where should this plan live?",
        options: [
          { label: ".balakit/plans/auth.md (Recommended)", description: "Repo-local plan file" },
          { label: "Host Plan Mode", description: "Switch to native plan surface" },
        ],
      },
      {
        id: "targets",
        header: "Harnesses",
        question: "Which harnesses need updates?",
        multiSelect: true,
        options: [
          { label: "Codex", description: "OpenAI Codex" },
          { label: "Copilot", description: "GitHub Copilot" },
        ],
      },
      {
        id: "slug",
        header: "Custom slug",
        question: "Enter a plan slug:",
      },
    ],
  });

  const v202511 = buildElicitationParams(questions, "2025-11-25");
  assert.equal(v202511.mode, "form");
  const props = v202511.requestedSchema.properties;

  // Single-select choice + `__other` companion with neither key in `required` (enables T3 Code's Other input).
  assert.equal(props.canvas.type, "string");
  assert.equal(props.canvas.title, "Plan canvas");
  assert.equal(props.canvas.oneOf.length, 2);
  assert.equal(props.canvas__other.type, "string");
  assert.equal(props.canvas__other.title, "Other");
  assert.ok(!v202511.requestedSchema.required.includes("canvas"));
  assert.ok(!v202511.requestedSchema.required.includes("canvas__other"));

  // Multi-select omits `items.type` so T3 Code's `parseField` parses `items.anyOf`.
  assert.equal(props.targets.type, "array");
  assert.equal(props.targets.items.type, undefined);
  assert.equal(props.targets.items.anyOf.length, 2);

  // Free-text question is required.
  assert.equal(props.slug.type, "string");
  assert.deepEqual(v202511.requestedSchema.required, ["slug"]);

  // MCP 2025-06-18 omits `mode` for strict schema validators.
  const v202506 = buildElicitationParams(questions, "2025-06-18");
  assert.equal("mode" in v202506, false);

  // Custom `__other` overrides selected option when non-empty.
  const customAns = normalizeElicitationResult(questions, {
    action: "accept",
    content: {
      canvas: "Host Plan Mode",
      canvas__other: " docs/custom-plan.md ",
      targets: ["Codex", "Copilot"],
      slug: "auth-flow",
    },
  });
  assert.deepEqual(customAns, {
    action: "accept",
    answers: {
      canvas: "docs/custom-plan.md",
      targets: ["Codex", "Copilot"],
      slug: "auth-flow",
    },
  });
});

test("createMcpSession hides ask_user without elicitation and round-trips elicitation/create when supported", async () => {
  const noElicitSent = [];
  const noElicit = createMcpSession({ send: (m) => noElicitSent.push(m), version: "1.22.3" });
  await noElicit.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-11-25", capabilities: { sampling: {} } },
  });
  await noElicit.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  assert.deepEqual(noElicitSent[1].result.tools, []);

  const fullSent = [];
  let fullSession;
  fullSession = createMcpSession({
    version: "1.22.3",
    send: (m) => {
      fullSent.push(m);
      if (m.method === "elicitation/create") {
        queueMicrotask(() => {
          fullSession.handleMessage({
            jsonrpc: "2.0",
            id: m.id,
            result: { action: "accept", content: { q1: ".balakit/plans/x.md (Recommended)" } },
          });
        });
      }
    },
  });
  await fullSession.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: { elicitation: {} } },
  });
  assert.equal(fullSent[0].result.protocolVersion, "2025-06-18");
  await fullSession.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  assert.equal(fullSent[1].result.tools.length, 1);
  assert.equal(fullSent[1].result.tools[0].name, "ask_user");

  await fullSession.handleMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "ask_user",
      arguments: {
        question: "Where should this plan live?",
        choices: [".balakit/plans/x.md (Recommended)", "Host Plan Mode"],
      },
    },
  });
  const callReply = fullSent.find((m) => m.id === 3);
  assert.ok(callReply);
  assert.deepEqual(JSON.parse(callReply.result.content[0].text), {
    action: "accept",
    answers: { q1: ".balakit/plans/x.md (Recommended)" },
  });
});

test("stdio subprocess `balakit mcp` handles NDJSON + elicitation round-trip and exits 0 on EOF", async () => {
  const child = spawn(process.execPath, [CLI, "mcp"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const received = [];
  let buf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      received.push(msg);
      if (msg.method === "elicitation/create") {
        child.stdin.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: { action: "accept", content: { q1__other: "custom/plan.md" } },
          }) + "\n",
        );
      }
      if (msg.id === 3) {
        child.stdin.end();
      }
    }
  });

  child.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: { elicitation: { form: {} } } },
    }) + "\n",
  );
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "server/discover" }) + "\n");
  child.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "ask_user",
        arguments: {
          questions: [
            {
              id: "q1",
              header: "Plan canvas",
              question: "Where should this plan live?",
              options: [{ label: "Repo file (Recommended)" }, { label: "Plan Mode" }],
            },
          ],
        },
      },
    }) + "\n",
  );

  const exitCode = await new Promise((res) => child.once("close", res));
  assert.equal(exitCode, 0);

  const discoverErr = received.find((m) => m.id === 2);
  assert.equal(discoverErr.error.code, -32601);

  const toolResult = received.find((m) => m.id === 3);
  assert.deepEqual(JSON.parse(toolResult.result.content[0].text), {
    action: "accept",
    answers: { q1: "custom/plan.md" },
  });
});

test("installUserHarnessConfigs preserves user MCP servers and existing Codex flags, and cleans up on remove", () => {
  const home = mkdtempSync(join(tmpdir(), "balakit-harness-cfg-"));
  try {
    mkdirSync(join(home, ".copilot"), { recursive: true });
    writeFileSync(
      join(home, ".copilot", "mcp-config.json"),
      JSON.stringify({ mcpServers: { "aws-mcp": { type: "local", command: "uvx", args: ["aws"] } } }, null, 2),
    );
    mkdirSync(join(home, ".codex"), { recursive: true });
    writeFileSync(join(home, ".codex", "config.toml"), 'model = "gpt-5.4"\n\n[features]\nfast_apply = true\n');

    const res = installUserHarnessConfigs({
      agentIds: ["copilot", "gemini-cli", "codex"],
      home,
    });
    assert.ok(existsSync(join(home, ".balakit", "mcp.mjs")));
    assert.ok(res.surfaces.includes("~/.copilot/mcp-config.json"));
    assert.ok(res.surfaces.includes("~/.gemini/settings.json"));
    assert.ok(res.surfaces.includes("~/.codex/config.toml"));

    const copilotJson = JSON.parse(readFileSync(join(home, ".copilot", "mcp-config.json"), "utf8"));
    assert.deepEqual(copilotJson.mcpServers["aws-mcp"], { type: "local", command: "uvx", args: ["aws"] });
    assert.equal(copilotJson.mcpServers.balakit.command, "node");
    assert.deepEqual(copilotJson.mcpServers.balakit.args, [join(home, ".balakit", "mcp.mjs")]);

    const codexToml = readFileSync(join(home, ".codex", "config.toml"), "utf8");
    assert.match(codexToml, /model = "gpt-5\.4"/);
    assert.match(codexToml, /\[features\]\ndefault_mode_request_user_input = true\nfast_apply = true/);

    // Verify doctor passes with zero findings.
    assert.deepEqual(verifyUserHarnessConfigs({ surfaces: res.surfaces, home }), []);

    // Explicit `default_mode_request_user_input = false` is never overwritten.
    writeFileSync(join(home, ".codex", "config.toml"), "[features]\ndefault_mode_request_user_input = false\n");
    installUserHarnessConfigs({ agentIds: ["codex"], home });
    assert.match(
      readFileSync(join(home, ".codex", "config.toml"), "utf8"),
      /default_mode_request_user_input = false/,
    );

    // Clean removal deletes only Balakit's MCP entries and standalone script, keeping aws-mcp.
    const rem = removeUserHarnessConfigs({ home });
    assert.ok(rem.removed.includes("~/.balakit/mcp.mjs"));
    assert.equal(existsSync(join(home, ".balakit", "mcp.mjs")), false);
    const afterCopilot = JSON.parse(readFileSync(join(home, ".copilot", "mcp-config.json"), "utf8"));
    assert.equal("balakit" in afterCopilot.mcpServers, false);
    assert.ok("aws-mcp" in afterCopilot.mcpServers);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

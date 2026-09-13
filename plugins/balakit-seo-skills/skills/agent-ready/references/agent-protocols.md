# Agent protocol cards

HTTP and DNS contracts for agent-to-agent discovery. `skip unless` this
origin is an agent product (hosts A2A, MCP, WebMCP, or skills) or **this
origin sends** bot/agent requests (Web Bot Auth).

Cite the spec. Serve JSON from origin or the edge. Do not require a
named agent SDK or DNS host.

## A2A Agent Card

- Serve JSON at `/.well-known/agent-card.json` with HTTP 200.
- Include `name`, `version`, `description`.
- Include `supportedInterfaces` (service URL + transport).
- List `capabilities` and `skills` (each with `id`, `name`, `description`).
- Spec: [A2A Protocol](https://a2a-protocol.org/latest/specification/),
  [Agent Discovery](https://a2a-protocol.org/latest/topics/agent-discovery/).

## Agent skills discovery index

- Serve JSON at `/.well-known/agent-skills/index.json` with HTTP 200.
- Include `$schema` set to
  `https://schemas.agentskills.io/discovery/0.2.0/schema.json` (or the
  current schema the index claims).
- `skills` array entries: `name` (lowercase alphanumeric + hyphens),
  `type` (`skill-md` or `archive`), `description`, `url` (artifact),
  `digest` (`sha256:{hex}`).
- Spec: [Agent Skills Discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc)
  (protocol name; not a host requirement).

## MCP Server Card

- Serve JSON at `/.well-known/mcp/server-card.json` with HTTP 200.
- Include `serverInfo` with `name` and `version`.
- Include a transport `endpoint` URL (for example `/mcp` for Streamable HTTP).
- List `capabilities` (tools, resources, prompts) this server supports.
- Spec: [SEP-1649](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127)
  (or the published MCP server-card document that supersedes it).

## WebMCP

- Call `navigator.modelContext.registerTool()` (or the current WebMCP API)
  for each in-page tool.
- Each tool: `name`, `description`, `inputSchema` (JSON Schema), `execute`.
- Expose the site's real actions (search, navigate, fetch data). HTML
  remains the default document; this is an additional browser API.
- Unregister with an `AbortController` when the page tears down.
- Spec: [WebMCP](https://webmachinelearning.github.io/webmcp/). Detected
  by loading the page; the script must run on load.

## Web Bot Auth (outbound)

Only when **this origin** sends bot or agent HTTP requests. Inbound
verification of other people's bots is a server policy, not a discovery
document for this skill's default path.

- Publish a JWKS at `/.well-known/http-message-signatures-directory`.
- At least one public key for signature verification.
- Signed outbound requests include `Signature-Agent` and `Signature-Input`.
- Spec: [IETF WebBotAuth WG](https://datatracker.ietf.org/wg/webbotauth/about/).

## DNS-AID

- Publish records under the zone's `_agents` namespace, for example
  `_index._agents.example.com` or `_a2a._agents.example.com`.
- Use `SVCB` (or `HTTPS` for HTTPS endpoints) with `alpn` and connection
  parameters. Experimental keys use numeric `keyNNNNN` until registered.
- Sign the discovery zone with DNSSEC when the rest of the zone is signed.
- Publish via whatever DNS host already serves the domain. Do not
  require a specific DoH resolver.
- Example shape (replace the owner names with this origin):

```dns
_a2a._agents.example.com. 3600 IN SVCB 1 agent.example.com. alpn="a2a" port=443 mandatory=alpn,port
```

## Verify

| URL or record | Pass |
|---|---|
| `GET /.well-known/agent-card.json` | 200, JSON, `name` + `version` + interfaces |
| `GET /.well-known/agent-skills/index.json` | 200, JSON, `$schema` + `skills[]` with digest |
| `GET /.well-known/mcp/server-card.json` | 200, JSON, `serverInfo` + `endpoint` |
| WebMCP | tools registered on page load |
| `GET /.well-known/http-message-signatures-directory` | 200, JWKS with ≥1 key (outbound bots only) |
| DNS `_agents` | SVCB/HTTPS exists; DNSSEC if the zone is signed |

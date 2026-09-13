# Agentic commerce discovery

`skip unless` agents can buy, pay, or check out on this origin. A brochure
site does not get ACP, AP2, MPP, UCP, or x402.

Publish the discovery document the product actually implements. Do not
stack every protocol. Serve JSON/OpenAPI from origin or the edge.

## ACP — Agentic Commerce Protocol

- Serve JSON at `/.well-known/acp.json` with HTTP 200.
- `protocol.name` is `"acp"`; include `protocol.version`.
- `api_base_url` is an absolute `http(s)` URL.
- `transports` is a non-empty array.
- `capabilities.services` is a non-empty array of offered services.
- Spec: [Agentic Commerce Protocol](https://agenticcommerce.dev).

## AP2 — Agent Payments Protocol

- Add AP2 on the A2A Agent Card (see `agent-protocols.md`), not as a
  standalone page, when this origin is a merchant/shopper/credentials
  provider/payment processor.
- Extension `uri` for AP2 v0.1.0:
  `https://github.com/google-agentic-commerce/AP2/tree/v0.1.0`
  (or the current published URI).
- `params.roles` declares the role. Merchant agents mark the extension
  required.
- Spec: [AP2](https://ap2-protocol.org/).
- `n/a:` if there is no A2A card and the site is not commerce.

## MPP — Machine Payment Protocol

- Serve `/openapi.json` (or the OpenAPI URL this API already uses) with HTTP 200.
- Payable operations include `x-payment-info` with `intent` (`charge` or
  `session`), `method` (for example `tempo`, `stripe`, `lightning`, `card`),
  and `amount`. Optionally `currency`, `description`, top-level
  `x-service-info`.
- Spec: [MPP](https://mpp.dev),
  [payment discovery draft](https://paymentauth.org/draft-payment-discovery-00.txt).

## UCP — Universal Commerce Protocol

- Serve JSON at `/.well-known/ucp` with HTTP 200.
- Include `protocol_version`, `services`, `capabilities`, and `endpoints`.
- Referenced spec URLs and schemas must be reachable.
- Spec: [UCP](https://ucp.dev/specification/overview/).

## x402 — HTTP 402 payments

- Protect payable API routes so unauthenticated/unpaid calls return **HTTP
  402** with machine-readable payment requirements.
- Implement with this stack's HTTP middleware or handlers (Express, Hono,
  Next, or the equivalent already in the repo). Do not require one npm
  package name.
- Configure a facilitator URL and receiving wallet/account using the
  project's existing secret store — never commit keys.
- Spec: [x402](https://x402.org).

## Verify

| URL | Pass |
|---|---|
| `GET /.well-known/acp.json` | 200, JSON, `protocol` + `api_base_url` + transports + services |
| A2A card AP2 extension | present with `uri` + `params.roles` when AP2 applies |
| OpenAPI with `x-payment-info` | 200, payable ops declare intent/method/amount |
| `GET /.well-known/ucp` | 200, JSON, version + services + capabilities + endpoints |
| Payable route without payment | HTTP 402 with requirements (x402) |

Do not complete a real payment during verify.

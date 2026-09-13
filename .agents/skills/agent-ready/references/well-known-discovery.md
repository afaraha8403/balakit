# Well-known discovery (APIs and auth)

HTTP contracts for automated discovery. Serve each URL from origin or the
edge in front of it. Validate with GET (status, Content-Type, required
fields). Do not POST registration endpoints during a passive check.

`skip unless` the origin has an API (catalog + Link) or an API with
authentication (Auth.md / OAuth).

## API catalog — RFC 9727

- Serve `/.well-known/api-catalog` as `application/linkset+json` with HTTP 200.
- Body has a `linkset` array. Each entry needs an `anchor` URL and link
  relations: `service-desc` (OpenAPI or equivalent), `service-doc` (human
  docs), optionally `status` (health).
- Spec: [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727). Examples in
  [Appendix A](https://www.rfc-editor.org/rfc/rfc9727#appendix-A).

## Link response headers — RFC 8288 / RFC 9727 §3

- Homepage (and/or API root) responses include `Link` headers pointing at
  machine-readable resources.
- Use registered relations: `api-catalog`, `service-desc`, `service-doc`,
  `describedby`.
- Example: `Link: </.well-known/api-catalog>; rel="api-catalog"`
- Multiple `Link` headers or a comma-separated value are both valid.
- Add the header in the origin app, a reverse proxy, or the CDN in front —
  whichever already mutates responses. Do not require a named edge product.

## Auth.md

- Serve `/auth.md` from the origin root as Markdown. The H1 contains
  `auth.md` (for example `# auth.md`).
- Prefer OAuth Protected Resource Metadata at
  `/.well-known/oauth-protected-resource` when the origin is a resource
  server.
- If OAuth metadata is not available, keep `/auth.md` self-contained:
  agent audience, registration or provisioning URLs, supported methods,
  how credentials are used.
- Do not probe `POST` registration URLs. Public discovery documents are
  the source of truth.

## OAuth / OIDC discovery — RFC 8414 / OIDC Discovery

- Serve JSON at `/.well-known/openid-configuration` (OIDC) or
  `/.well-known/oauth-authorization-server` (OAuth 2.0 Authorization
  Server) with HTTP 200.
- Required fields: `issuer`, `authorization_endpoint`, `token_endpoint`,
  `jwks_uri`. Also list `grant_types_supported` and `response_types_supported`.
- Specs: [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414),
  [OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html).

## Protected resource metadata — RFC 9728

- Serve JSON at `/.well-known/oauth-protected-resource` with HTTP 200.
- Include `resource` (this resource's identifier URL) and
  `authorization_servers` (issuer URL array). Optionally `scopes_supported`.
- Optionally return `WWW-Authenticate` with `resource_metadata` on 401.
- Spec: [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728).

## Auth.md flow metadata (when the AS supports it)

Include only the methods this origin actually supports:

- **ID-JAG:** `identity_types_supported` includes `identity_assertion`;
  assertion types include `urn:ietf:params:oauth:token-type:id-jag`;
  credential types; `revocation_uri` and revocation in `events_supported`
  when supported (optional for detection).
- **Verified email:** assertion type `verified_email`, credential types,
  `claim_uri`.
- **Anonymous:** `identity_types_supported` includes `anonymous`,
  `anonymous.credential_types_supported`, `claim_uri`.

## Verify

| URL or header | Pass |
|---|---|
| `GET /.well-known/api-catalog` | 200, `application/linkset+json`, `linkset` with `anchor` + relations |
| Homepage `Link` | includes `rel="api-catalog"` (or the relations this API uses) |
| `GET /auth.md` | 200, Markdown, H1 contains `auth.md` |
| `GET /.well-known/openid-configuration` or `.../oauth-authorization-server` | 200, JSON, `issuer` + endpoints + `jwks_uri` |
| `GET /.well-known/oauth-protected-resource` | 200, JSON, `resource` + `authorization_servers` |

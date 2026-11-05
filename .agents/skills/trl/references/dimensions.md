# Rows (areas of software)

Each in-scope row is scored on its own. Overall TRL = the lowest row.
Levels 1–2 come from the frame and apply to every row. Rungs begin at 3.
A row at level N meets every rung at or below N and the generic criterion
in [scale.md](scale.md).

In the frame, drop a row only with `n/a: <reason>`. Example: a backend job
with no screens → `ui-ux: n/a: no user interface`. For a feature or
improvement, a row the host app already covers may be marked
`inherited: <evidence>`. It is then scored once, at the host app's level,
and it still caps the feature.

Critical technology elements (a novel algorithm, a sync engine, an LLM
extraction step) become extra rows. They use the `core` rungs plus their
own risk-specific checks, written in the frame.

## core: domain logic and correctness

- **3** The critical algorithm passes unit tests on representative inputs.
- **4** Every business rule has a test, edge cases included. Integrated with stubs.
- **5** Runs on a realistic data shape and volume. Risky parsers have property or fuzz tests.
- **6** End-to-end journeys exercise every rule in the staging-like deploy.
- **7** Synthetic users on the operational environment get correct results. No data-correctness defect is open.
- **8** The full regression suite is a CI release gate and is green. No open sev-1 or sev-2 defects.
- **9** Results stay correct through the soak. Reconciliation checks find no drift.

## data: schema, migrations, integrity

- **3** The data shape is named and typed.
- **4** Migrations apply to an empty DB. Constraints enforce the invariants.
- **5** Migrations apply to a realistic-size seed. The down or rollback path is tested.
- **6** The staging DB is seeded and backups are configured.
- **7** Migrations are rehearsed on the operational environment, with timing recorded.
- **8** A backup restore is drilled, timed against the RPO and RTO. Retention and deletion are implemented.
- **9** The restore drill is repeated after the soak. Integrity checks are clean.

## interfaces: APIs, contracts, integrations

- **3** The contract is sketched: inputs, outputs, errors.
- **4** Contract tests pass against stubs. The error schema is defined.
- **5** Runs against the real third-party sandbox. Auth, rate limits, and timeouts are handled.
- **6** The contract is versioned. Consumers pass end to end.
- **7** Live or sandbox credentials work in the operational environment. Webhooks are received from the real provider.
- **8** API docs or the OpenAPI spec match behavior. CI checks backward compatibility. Retries are idempotent.
- **9** An outage of each dependency is injected. Degradation is graceful and recovery is automatic.

## ui-ux: flows, states, copy

- **3** The core screen renders, or a clickable sketch exists.
- **4** Flows are built against mocks. Empty, loading, and error states exist.
- **5** Real data. Responsive at the target breakpoints. Copy is a final draft.
- **6** Every core journey completes end to end in staging, driven by an automated browser.
- **7** A first-time-user walkthrough on the operational environment completes every core task. Either a fresh agent gets only the URL and a goal, or an `attested` human does it. The friction log is addressed.
- **8** Design system is consistent. Every error message says what to do next. Localization is done if in scope. A visual review pass is recorded.
- **9** Journeys pass through the soak. A repeat first-time walkthrough shows no regression.

## a11y: accessibility

- **4** Semantic markup and labels. Automated checks (for example axe) on components are clean.
- **6** Automated checks on every core page in staging show no serious or critical issues.
- **7** Keyboard-only and screen-reader passes of the core journeys.
- **8** A WCAG 2.2 AA checklist is evidenced. Contrast passes in every theme.
- **9** Accessibility checks are a CI gate and stay green.

## performance

- **4** Hot-path complexity is known. Tests show no N+1 queries.
- **5** Benchmarks run on realistic data volume.
- **6** Budgets are defined (for example p95 latency, LCP, INP, bundle size) and measured in staging.
- **7** A load test at expected peak runs on the operational environment.
- **8** Budgets are met at 2× expected peak. CI enforces the budgets.
- **9** Budgets hold through the soak. No memory or connection leak.

## security-privacy

- **4** A threat model sketch exists. Input is validated at trust boundaries. No secrets in the repo.
- **5** Authn and authz tests cover negative cases. The dependency scan shows no high or critical findings.
- **6** Staging uses the real auth provider. Secrets live in a secret manager.
- **7** Static and dynamic scans run against the operational environment. Security headers and TLS are set. IAM is least-privilege.
- **8** A security review checklist is evidenced (OWASP ASVS level 1, or the frame's chosen standard). There is a PII inventory, plus consent and a privacy notice where required. Sensitive actions are audit-logged.
- **9** Secret rotation is drilled. An adversarial probe, or an `attested` external review, is recorded.

## infra-deploy: build, environments, delivery

- **4** The build reproduces from a clean checkout.
- **5** Config comes from the environment. Infra is code, or documented step by step.
- **6** CI builds and deploys to staging automatically.
- **7** The operational environment is built from the same infra code, with a real domain and TLS.
- **8** Deploys are automated and a rollback is drilled. Environment parity is checked. A cost estimate exists.
- **9** Repeated deploys during the soak cause no downtime. Scale-out is verified.

## observability-ops

- **5** Logs are structured. No secrets or PII in logs.
- **6** Metrics and error tracking run in staging.
- **7** Dashboards, health checks, and alerts are live on the operational environment.
- **8** SLOs are defined. Alerts reach a human. A runbook covers the top failure modes.
- **9** During failure injection an alert fired and the runbook resolved it (incident drill).

## reliability: errors and recovery

- **4** Main-path errors are handled. No silent catches.
- **5** External calls have timeouts, and retries with backoff.
- **6** Graceful-degradation paths are tested.
- **7** A failure of each dependency is observed on the operational environment.
- **8** Jobs are idempotent. Data-loss scenarios are covered. Rollback and restore are drilled (shared with `data` and `infra-deploy`).
- **9** The soak with failure injection meets the SLOs.

## docs-support

- **4** README dev setup works from a clean checkout.
- **6** User-facing help for the core journeys is drafted.
- **8** User docs, a changelog entry, a support or feedback channel, and onboarding exist.
- **9** A fresh agent follows the docs to complete setup and one core journey.

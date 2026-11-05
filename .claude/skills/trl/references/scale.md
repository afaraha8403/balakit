# Software TRL scale

Assessors and the builder both read this file. It adapts the NASA 1–9
scale (NPR 7123.1, Appendix E) and the MLTRL framework (Lavin et al.,
*Nature Communications* 13:6039, 2022) to software. Process follows the
GAO Technology Readiness Assessment Guide (GAO-20-48G): name the critical
technology elements, assess each one with independent reviewers, and
report the lowest one.

## Rules

- A row is at level N when **every** exit criterion for levels 1 through N
  holds, both the generic one below and that row's rungs in
  [dimensions.md](dimensions.md).
- A missing rung means the row's previous rung still has to hold, plus
  the generic criterion for that level.
- The evidence must exist now and be reproducible. "Planned", "should",
  and "will" count as unmet.
- Each piece of evidence carries one provenance tag. A level needs at
  least its minimum provenance.

## Provenance

| Tag | Meaning |
|---|---|
| `local` | Ran on a dev machine or CI, with stubs, fakes, or seed data. |
| `staged` | Ran against a production-equivalent environment: the same build, infra config, auth provider, and integrations in live or sandbox mode. The traffic is synthetic or internal. |
| `field` | Real users or real production traffic. |
| `attested` | Supplied by a named human (beta feedback, a review sign-off, dogfood notes). Has a who and a when. Agents never write it. |

Strength order for "weakest provenance": `local` < `staged` < `attested` ≈
`field`. `attested` and `field` both count at any level that asks for
`staged`.

## Environments

The frame defines both environments, in concrete terms, for this scope.

- **Relevant environment.** It matches the stresses that matter: real
  dependencies, realistic data shape and volume, and real config. Example:
  a staging deploy with a seeded copy of the production schema.
- **Operational environment.** It is production or a faithful twin: the
  same infra code, build, auth, domain, TLS, and live-mode integrations.
  For a feature, this is the host app's operational environment.

## Levels

| TRL | Name | Generic exit criterion | Min provenance |
|---|---|---|---|
| 1 | Basic principles | The problem, the users, and the core idea are written down. Prior art and the libraries that could solve it are named. | — |
| 2 | Concept formulated | The approach, architecture sketch, named data shape, chosen stack, and critical technology elements are written down. Key risks are listed. | — |
| 3 | Proof of concept | The critical function works in isolation. Its tests pass on representative inputs. | `local` |
| 4 | Validated in lab | The components are built and integrated with stubs or fakes. The happy path and the main error paths are tested. | `local` |
| 5 | Validated in relevant environment | It runs against real dependencies (real DB, third-party sandbox) with realistic data, config from the environment, and non-happy paths covered. | `local` against real deps, or `staged` |
| 6 | Prototype demo, relevant environment | Every core user journey completes end to end in a staging-like deploy. Every in-scope row has at least basic coverage. | `staged` |
| 7 | Prototype demo, operational environment | It is deployed to the operational environment (or a faithful twin). Every core journey runs at expected load with synthetic users. A first-time user (a fresh agent given only the URL and a goal, or an `attested` human) completes the core tasks. Observability is live. **Beta-ready.** | `staged` |
| 8 | Complete and qualified | Every in-scope row passes its release gate in [dimensions.md](dimensions.md): regression suite, accessibility, performance budgets at peak, security review, restore and rollback drills, runbook, and user docs. **Launch-ready.** | `staged` |
| 9 | Proven in operation | It runs sustained without a sev-1 or sev-2 incident. A soak at expected peak holds the SLOs. Injected failures of each dependency recover. An incident drill is run with the runbook. | `staged` → label `TRL 9 · staged`. A real production window → `TRL 9 · field`. |

### Constants

- **Expected load / peak.** Taken from the frame. If unknown, ask. Do not
  guess a traffic number.
- **Headroom at TRL 8: 2× expected peak.** Launch traffic regularly
  overshoots forecasts, and 2× gives one doubling before the budgets break.
- **Soak at TRL 9: at least 1 hour, or one full cycle of the
  longest-period scheduled job, whichever is longer.** Short enough to run
  inside a session. Long enough to surface leaks and job interactions.
  Record the actual duration. The user may raise it.
- **Field window for `TRL 9 · field`: 30 days.** That matches the usual
  monthly SLO window.

## What does not count

- A claim with no command or artifact behind it.
- A test that would still pass if the code under test returned nothing.
- Evidence from a different branch, build, or environment than the one
  named in the frame.
- Screenshots alone at TRL 6 or higher. Pair them with the run that
  produced them.
- An agent's statement that it is "production-ready".

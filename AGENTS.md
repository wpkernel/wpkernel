# AGENTS.md - WP Kernel

> 💡 For human contributors: see [DEVELOPMENT.md](./DEVELOPMENT.md) for setup, workflow, and environment details.  
> This file focuses on agent/contribution rules.

**Purpose**: Operational guide for coding agents (Codex, etc.) working on WP Kernel. Follow the commands and constraints below. Finish only when checks are green and diffs are minimal.

## Project Overview (for agents)

- **Architecture**: Rails-like WordPress framework. **JS is source of truth**; PHP is a thin bridge (REST + capabilities + optional server bindings).
- **Core primitives**: Actions (orchestrate writes), Resources (transport + stores + cache keys + events), Views (blocks + bindings + Interactivity API), Jobs (background).
- **Non-negotiables**
    - UI never calls transport directly. **All writes flow through Actions.**
    - Events must use **canonical registry names**. No ad-hoc events.
    - Errors are typed `KernelError` subclasses. Never throw a plain `Error`.

## Monorepo Layout

```
packages/
	wp-kernel/            # core framework (resources, actions, events, jobs)
	wp-kernel-ui/         # UI components & design system
	wp-kernel-cli/        # scaffolding & DX tools
	wp-kernel-e2e-utils/  # e2e utilities (validated via showcase)
app/
	showcase/             # demo plugin exercising full kernel
docs/                   # public API docs & guides
information/            # product spec, example plugin specs, roadmap, event taxonomy
```

## Environment & Tooling

- **Node**: v20.x LTS or higher (minimum for Vite 7). **pnpm** workspace.
- **WordPress**: 6.8+ required (Script Modules API is core to framework).
- **Development environments**: wp-env (Docker + PHP 8.1+) OR WordPress Playground (WASM, no Docker).
- **E2E testing**: Optional. Only needed if writing/running E2E tests (uses Playwright + `@geekist/wp-kernel-e2e-utils`).

- **Commands** (always use exactly these):
    - Install: `pnpm install`
    - Format/lint: `pnpm lint --fix` (or `pnpm format`)
    - Typecheck (code): `pnpm typecheck`
    - Typecheck (tests): `pnpm typecheck:tests`
    - Test (all): `pnpm test`
        > Do **not** use `--filter` for tests; it breaks our harness.
    - Build (if needed): `pnpm build`

    - **When running agents (Codex, Co‑Pilot, etc.) inside private containers or CI**, set the environment variable `CI=1` before running any `git` or `pnpm` commands. This ensures non-interactive behaviour and avoids prompts that could block automation.

    - **Note:** The pre-commit hook may take some time to complete. It performs typechecks and tests before allowing a commit. Contributors should wait patiently until it finishes.

**When in doubt**: run install → typecheck → tests → lint fix → tests again.

## Definition of Done (DoD)

1. `pnpm typecheck` and `pnpm typecheck:tests` pass.
2. `pnpm test` is green and **coverage does not regress**:
    - ≥95% statements/lines, ≥98% functions globally.
    - Branch coverage median ≥90% (file-level dips acceptable if global median holds).
3. New public APIs covered, error paths tested.
4. No `any` types introduced; project/test globals updated if needed (`global.d.ts`, `tests/test-globals.d.ts`).
5. Follow folder conventions:

```

app/
resources/  # defineResource()
actions/    # defineAction()
views/      # bindings + Interactivity
jobs/       # defineJob()

```

## File & Refactor Guards

- Keep modules/tests under **500 lines**. If approaching the limit:
- Extract utilities/interfaces or split modules.
- Before large refactors, open a planning comment and summarise the split.

## Action & Resource Patterns (enforced)

- **Actions-first**. Example:

```ts
import { CreateThing } from '@/app/actions/Thing/Create';
await CreateThing({ data: formData });
```

- **Resources**: one `defineResource()` defines client, store, cache keys, events.
- **Events**: import from the canonical registry only.

## PHP Bridge

- Treat PHP as a strict transport/capability contract. No business logic drift.
- If changing types across PHP/JS, stop and raise a comment with a migration note.

## Test Strategy

- **E2E tests are optional** for framework users - only needed if contributing or writing E2E tests for your own project.
- Target e2e realism. `@geekist/wp-kernel-e2e-utils` is validated **via** `app/showcase` e2e; do not unit-test `e2e-utils` in isolation.
- Flaky tests: prefer serial mode or better selectors/cleanup over sleeps.

## Coverage Hotspots

- Keep `error`, `http`, and `resource` core near **100%**.
- Defensive branches that are genuinely hard to reach are acceptable if documented.

## Commit, PR, and Review Protocol

- Small, cohesive commits. One concern per commit.
- **ALWAYS use the PR template** (`.github/PULL_REQUEST_TEMPLATE.md`) - never create ad-hoc PRs
- PR title format: Sprint headline (e.g., "Sprint 5: Bindings & Interactivity")
- Link to Roadmap section and Sprint doc/spec in PR description
- Include changeset unless labelled `no-release` (see [RELEASING.md](./RELEASING.md))
- Before requesting review: run `pnpm lint --fix && pnpm typecheck && pnpm typecheck:tests && pnpm test`.
- Respond to all review feedback; avoid duplication; extract interfaces when suggested.

## Agent Execution Policy (Codex)

- **Approval mode**: default to read/write in workspace. Ask before:
    - Writing outside workspace, changing dotfiles, or enabling network access.
    - Installing new dev dependencies.
    - Creating or modifying PRs (always use PR template)

- **Never**: run destructive commands, alter Git history, or publish artefacts.
- **PR creation**: Always use `.github/PULL_REQUEST_TEMPLATE.md` - no ad-hoc PRs
- Always show plan, then diffs, then run checks. Close task only after DoD passes.

## Package-specific Notes

- `wp-kernel-e2e-utils`: treated as a support lib; validated by showcase e2e only.
- `wp-kernel-ui`: respect design tokens and component boundaries; add stories if created.
- `wp-kernel-cli`: keep scaffolds idempotent; snapshot tests preferred.

## Typical Flows

### Bug fix

1. Reproduce with a focused test.
2. Minimal fix in the smallest package.
3. Run full checks; ensure coverage does not drop.
4. Add a short regression test name: `fix: <symptom>`.

### Feature

1. Add/extend Actions and Resources first; wire Views via bindings.
2. Emit canonical events; update cache invalidation.
3. Add tests; update docs if API changed.

## What NOT to do

- ✗ Call transport from UI components
- ✗ Create ad-hoc event names
- ✗ Deep-import across packages (`packages/*/src/**`)
- ✗ Use `any` or throw plain `Error`
- ✗ Skip cache invalidation after writes
- ✗ Ignore TS errors or coverage regressions

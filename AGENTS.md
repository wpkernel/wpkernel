# AGENTS.md - WP Kernel

## Scope & Precedence

This document provides operational guidance for coding agents (Codex, etc.) working on WP Kernel. Follow the commands and constraints below. Complete tasks only when checks are green and diffs are minimal.

## Project Architecture & Invariants

- Rails-like WordPress framework: **JS is source of truth**; PHP acts as a thin transport and capability bridge.
- Core primitives: Actions (handle writes), Resources (transport, stores, cache keys, events), Views (blocks, bindings, Interactivity API), Jobs (background).
- Non-negotiables:
    - UI never calls transport directly; **all writes flow through Actions**.
    - Use only **canonical registry event names**; no ad-hoc events.
    - Errors must be typed `KernelError` subclasses; never throw plain `Error`.

## Environment & Tooling

- **Node**: v20.x LTS or higher (minimum for Vite 7). Uses **pnpm** workspace.
- **WordPress**: 6.8+ required (Script Modules API is core).
- **Development environments**: wp-env (Docker + PHP 8.1+) OR WordPress Playground (WASM, no Docker).
- **E2E testing**: Optional; only needed if writing/running E2E tests (uses Playwright + `@geekist/wp-kernel-e2e-utils`).

- **Commands** (always use exactly these):
    - Install: `pnpm install`
    - Format/lint: `pnpm lint --fix` and `pnpm format`
    - Typecheck (code): `pnpm typecheck`
    - Typecheck (tests): `pnpm typecheck:tests`
    - Test (all): `pnpm test`
        > Do **not** use `--filter` for tests; it breaks our harness.
    - Build (if needed): `pnpm build`

- We have `types/globals.d.ts`, `tests/test-globals.d.ts`, and stubs in `tests/test-utils/wp.ts` for typing and testing support. Use these and update incrementally as needed.

- **When running agents (Codex, Co‑Pilot, etc.) inside private containers or CI**, set the environment variable `CI=1` before running any `git` commands to ensure non-interactive behavior and avoid prompts that block automation.

> **Tip:** The pre‑commit hook automatically runs lint, type‑checks, doc build and tests (~30 s).  
> Run these manually before committing to fix errors quickly; otherwise re‑running `CI=1 git commit` can become painful.
> It is prudent to run `pnpm build` to ensure the build passes or it will fail in CI anyway

## Quality & Coverage

- Maintain ≥95% statements/lines and ≥98% functions coverage globally.
- Branch coverage median ≥90% (some file-level dips allowed if global median holds).
- Keep core modules (error, http, resource) near 100% coverage.
- Defensive branches that are genuinely hard to reach are acceptable if documented.
- Flaky tests should use serial mode or improved selectors/cleanup instead of sleeps.

## Workflow & Policies

### Definition of Done (DoD)

- Pass `pnpm typecheck` and `pnpm typecheck:tests`.
- Pass `pnpm test` with no coverage regression.
- New public APIs and error paths are tested.
- No `any` types introduced; update globals if needed.
- Follow folder conventions

### Commit, PR, and Review

- Make small, focused commits (one concern per commit).
- Always use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`).
- PR title format: Sprint headline (e.g., "Sprint 5: Bindings & Interactivity").
- Link to Roadmap section and Sprint doc/spec in PR description.
- Before requesting review, run:  
  `pnpm lint --fix && pnpm typecheck && pnpm typecheck:tests && pnpm test`.
- Respond to all review feedback; avoid duplication; extract interfaces when suggested.

### Agent Execution Policy (Codex)

- Default to read/write in workspace.
- Ask before:
    - Writing outside workspace, changing dotfiles, or enabling network access.
    - Installing new dev dependencies.
    - Creating or modifying PRs (always use PR template).
- Never run destructive commands, alter Git history, or publish artifacts.
- Always show plan, then diffs, then run checks. Close task only after DoD passes.

## What NOT to do

- ✗ Call transport from UI components.
- ✗ Create ad-hoc event names.
- ✗ Deep-import across packages (`packages/*/src/**`).
- ✗ Use `any` or throw plain `Error`.
- ✗ Skip cache invalidation after writes.
- ✗ Ignore TypeScript errors or coverage regressions.

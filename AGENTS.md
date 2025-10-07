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

## Project Structure & Module Organisation

- The repo is a monorepo with multiple packages under `packages/`.
- Each package uses `src/` for source code, `tests/` for tests, and `types/` for TypeScript definitions.
- Modules have clear separation of concerns and minimal cross-package dependencies.
- Avoid deep imports across packages (e.g., no direct imports from `packages/*/src/**`).
- Use explicit exports and imports to maintain encapsulation and module boundaries.

## Environment & Tooling

- Node v20.x LTS or higher (required for Vite 7).
- WordPress 6.8+ (Script Modules API required).
- Development environments: `wp-env` (Docker + PHP 8.1+) or WordPress Playground (WASM, no Docker).
- E2E testing is optional; uses Playwright and `@geekist/wp-kernel-e2e-utils`.
- Commands:
    - Install: `pnpm install`
    - Format/lint: `pnpm lint --fix` and `pnpm format`
    - Typecheck code: `pnpm typecheck`
    - Typecheck tests: `pnpm typecheck:tests`
    - Test all: `pnpm test` (do not use `--filter`)
    - Build: `pnpm build` (if needed)
- We have `types/globals.d.ts`, `tests/test-globals.d.ts`, and stubs in `tests/test-utils/wp.ts` for typing and testing support. Use these and update incrementally as needed.
- When running agents (Codex, Co-Pilot, etc.) inside private containers or CI, set `CI=1` before running any `git` commands to ensure non-interactive behavior.

## Quality & Coverage

- Maintain ≥95% statements/lines and ≥98% functions coverage globally.
- Branch coverage median ≥90% (some file-level dips allowed if global median holds).
- Keep core modules (error, http, resource) near 100% coverage.
- Defensive branches that are hard to reach are acceptable if documented.
- Avoid flaky tests; use serial mode or improved selectors/cleanup instead of sleeps.

## Workflow & Policies

- Definition of Done (DoD):
    - Pass `pnpm typecheck` and `pnpm typecheck:tests`.
    - Pass `pnpm test` with no coverage regression.
    - Test new public APIs and error paths.
    - No `any` types introduced; update globals if needed.
    - Follow folder conventions.
- Always run before requesting review:
  `pnpm lint --fix && pnpm typecheck && pnpm typecheck:tests && pnpm test`

## Commit & PR Guidelines

- Make small, focused commits (one concern per commit).
- Always use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`).
- PR title format: Sprint headline (e.g., "Sprint 5: Bindings & Interactivity").
- Link to Roadmap section and Sprint doc/spec in PR description.
- Respond to all review feedback; avoid duplication; extract interfaces when suggested.

## Agent Execution Policy (Codex)

- Default to read/write in workspace.
- Ask before:
    - Writing outside workspace, changing dotfiles, or enabling network access.
    - Installing new dev dependencies.
    - Creating or modifying PRs (always use PR template).
- Never run destructive commands, alter Git history, or publish artifacts.
- Always show plan, then diffs, then run checks. Close task only after DoD passes.

## What NOT to do

- Call transport from UI components.
- Create ad-hoc event names.
- Deep-import across packages (`packages/*/src/**`).
- Use `any` or throw plain `Error`.
- Skip cache invalidation after writes.
- Ignore TypeScript errors or coverage regressions.

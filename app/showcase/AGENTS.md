## Purpose & Context

This app is a **real-world WordPress plugin demo** designed to exercise WP Kernel and e2e-utils. It is **not** the kernel itself but serves to validate features, integration flows, and alignment with the Example Plugin Specifications.

## Role in the Monorepo

- Provides **proof of concept** for new kernel features as they are developed.
- Validates `@geekist/wp-kernel-e2e-utils` in a real browser/e2e context.
- Mirrors the **Example Plugin Requirements** and **Specifications** (symlinked from Obsidian), which serve as the _source of truth_ for intended plugin behavior.

## Environment & Tooling

- Depends directly on `@geekist/wp-kernel` and `@geekist/wp-kernel-ui` (`workspace:*`).
- Dev-only dependency: `@geekist/wp-kernel-e2e-utils` for end-to-end testing.
- Seeds (`./seeds/*.sh`) bootstrap jobs, users, media, and content. Run these to reset to a clean demo dataset.

## Definition of Done

- [ ] **Spec alignment**: All new or changed flows must match the Example Plugin Specifications.
- [ ] **Kernel integration**:
    - Showcase can and should freely patch itself (resources, actions, views, seeds, admin screens).
    - Kernel-level gaps (new primitives, type fixes, error handling, cache rules, etc.) must be fixed in the kernel package and then consumed by showcase.
    - Follow the rule of thumb: _generic, reusable logic belongs in kernel; business/domain logic belongs in showcase_.
    - New generic primitives (e.g., store invalidation, resource resolver, error types) should be implemented in `@geekist/wp-kernel` and consumed here to avoid duplicating transport or event logic in PHP.
- [ ] **E2E validation**:
    - Run `pnpm test` at the repo root (includes showcase e2e).
    - All showcase flows (public + admin) must pass.
- [ ] **Seeds updated** if new data requirements arise.
- [ ] **No hidden kernel logic**-do not let framework fixes live only in showcase.

## Patterns

- Prefer using block.json `viewScriptModule`/`editorScriptModule` for mounting wherever possible.
- Enqueue scripts via PHP only when a screen or route cannot be block-mounted (e.g., custom admin pages).

- Keep `includes/` for PHP bridge code; keep PHP thin (REST controllers + wiring).
- Build artifacts (`build/`, `dist-tests/`) should never be hand-edited.

## Tests

- Showcase includes two kinds of tests:
    - `__tests__/e2e/` - full browser-driven flows.
    - `__tests__/build-verification/` - ensures build outputs load correctly.
- Coverage is less critical than in kernel, but **all major flows** (job listing, application, admin pipeline) must be tested end-to-end.
- `dist-tests/` contains generated/compiled test output and should not be edited manually.

## What NOT to do

- ✗ Hide framework fixes inside showcase (upstream them to kernel).
- ✗ Break alignment with Example Plugin Requirements/Specifications.
- ✗ Commit symlinked docs (they live outside the repo; only symlinks).
- ✗ Rely on showcase for unit tests-kernel coverage belongs in `packages/wp-kernel`.

## Agent Policy

Use showcase to **prove and pressure-test** kernel features. When gaps are discovered, fix them upstream in the kernel. Showcase is the **integration battlefield**, not a side-channel fork of the framework.

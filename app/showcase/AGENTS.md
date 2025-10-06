# AGENTS.md - Showcase Plugin

> 💡 For human contributors: see [DEVELOPMENT.md](../../DEVELOPMENT.md) for setup, workflow, and environment details.  
> This file focuses on agent/contribution rules.

**Purpose**: This app is a **real-world WordPress plugin demo** that exercises WP Kernel and e2e-utils.  
It is **not** the kernel itself. Use it to validate features, integration flows, and alignment with the Example Plugin Specifications.

## Role in the Monorepo

- Provides **proof of concept** for new kernel features as they land.
- Validates `@geekist/wp-kernel-e2e-utils` in a real browser/e2e context.
- Mirrors the **Example Plugin Requirements** and **Specifications** (symlinked from Obsidian).  
  → These are the _source of truth_ for intended plugin behaviour.

## Environment

- Depends directly on `@geekist/wp-kernel` and `@geekist/wp-kernel-ui` (`workspace:*`).
- Dev-only dependency: `@geekist/wp-kernel-e2e-utils` for e2e tests.
- Seeds (`./seeds/*.sh`) bootstrap jobs, users, media, and content.  
  Run them whenever you need a clean demo dataset.

## Definition of Done (for showcase work)

1. **Spec alignment**: New/changed flows must match the Example Plugin Specifications.
2. **Kernel integration**:
    - Showcase can and should **patch itself freely** (resources, actions, views, seeds, admin screens).
    - If you find a gap that really belongs at the framework level (new primitive, type fix, error handling, cache rule, etc.), **patch the kernel package itself** and then upgrade showcase to consume it.
    - Rule of thumb: _if it’s generic and reusable, it belongs in kernel; if it’s business/domain logic, it belongs in showcase_.
    - If a mount or data flow needs a new generic primitive (e.g., store invalidation rule, resource resolver, error type), implement it in `@geekist/wp-kernel` and then consume it here. Don’t recreate transport or event rules in PHP, push that logic to JS primitives.

3. **E2E validation**:
    - Run `pnpm test` at repo root (includes showcase e2e).
    - All showcase flows must pass (public + admin).
4. **Seeds updated** if new data requirements appear.
5. **No hidden kernel logic** - don’t let framework fixes live only in showcase.

## Patterns

- Prefer block.json `viewScriptModule/editorScriptModule` for mounting where possible. Only enqueue via PHP when a screen or route cannot be block-mounted (e.g., custom admin page).

- Keep **src/** structure canonical:

```

src/
admin/       # admin views & logic
resources/   # resource bindings
index.ts     # plugin entrypoint

```

- `includes/` contains PHP bridge code. Keep PHP thin: just REST controllers + wiring.
- Build artefacts (`build/`, `dist-tests/`) should never be hand-edited.

## Tests

- Showcase has **two kinds of tests**:
- `__tests__/e2e/` → full browser-driven flows.
- `__tests__/build-verification/` → ensures build outputs load correctly.
- Coverage is less critical here than in kernel, but **all major flows** (job listing, application, admin pipeline) must be tested end-to-end.
- `dist-tests/` exists only for generated/compiled test output - do not edit manually.

## What NOT to do

- ✗ Hide framework fixes inside showcase (upstream them to kernel).
- ✗ Break alignment with Example Plugin Requirements/Specifications.
- ✗ Commit symlinked docs (they live outside repo; symlinks only).
- ✗ Rely on showcase for unit tests - kernel coverage belongs in `packages/wp-kernel`.

**Agent policy**:  
Use showcase to **prove and pressure-test**. When kernel gaps are discovered, upstream the fix. Showcase is the **integration battlefield**, not a side-channel fork of the framework.

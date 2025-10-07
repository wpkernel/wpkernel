# `@geekist/wp-kernel-ui` - Package-specific Agent Rules

This file supplements the root [AGENTS.md](../../AGENTS.md) with agent guidelines specific to the UI package.

---

## Build & Test

- Build: `pnpm build`
- Test: `pnpm test`
- Verify no `@wordpress/*` packages are bundled; all are peer dependencies.

---

## UI Package Conventions

- Wrap `@wordpress/components` lightly; mirror WP props/types/events.
- Implement canonical async UX states with `AsyncBoundary`: idle, loading, empty, error, success.
- Use `ActionButton` for all write operations; avoid direct transport calls.
- Read data via `ResourceList` connected to resource stores; no ad-hoc fetching.
- Accessibility is mandatory: semantic HTML, ARIA roles, keyboard nav, focus management.
- Use `@wordpress/i18n` for all user-facing strings.
- No internal theming engine; respect WP admin/editor CSS vars and dark mode.

---

## PR Checklist (UI Package)

- `pnpm typecheck` and `pnpm typecheck:tests` pass.
- Tests cover all async states and action error handling.
- Accessibility checks pass (axe).
- No bundling of WordPress externals.
- CHANGELOG.md entry added in affected packages.
- No deep imports across monorepo packages, only what is exposed as public API. If something critical or useful is not exposed, adjust framework exports accordingly
- Always use `.github/PULL_REQUEST_TEMPLATE.md` - no ad-hoc PRs

---

See [../../AGENTS.md](../../AGENTS.md) for shared monorepo agent policies.

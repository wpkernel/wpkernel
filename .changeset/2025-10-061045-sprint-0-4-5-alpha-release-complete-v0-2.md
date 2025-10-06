---
"@geekist/wp-kernel": minor
"@geekist/wp-kernel-cli": minor
"@geekist/wp-kernel-e2e-utils": minor
"@geekist/wp-kernel-ui": minor
---

# v0.2.0 - Alpha Release Complete 🎉

**Major Milestone**: Completion of Alpha phase (Sprints 0-4.5) with production-ready core framework primitives.

## Foundation (Sprints 0-1.5) ✅

Monorepo infrastructure, TypeScript strict mode, Vite 7 builds, testing harness (Jest + Playwright), CI/CD, documentation site, wp-env + Playground environments. 58+ test files, 900+ tests.

## Resources & Data (Sprint 1) ✅

`defineResource()` with typed REST contracts, automatic @wordpress/data stores, cache management (invalidate, invalidateAll, cache key matching), React hooks (useGet, useList, usePrefetch), dual-surface API (thin-flat + grouped), client methods (fetch, create, update, remove).

## E2E Utils (Sprint 2) ✅

`@geekist/wp-kernel-e2e-utils` package with namespaced API, Playwright fixture, test helpers (auth, rest, store, events, db, project), utility unit tests separated from domain E2E tests. Full fixture integration.

## Policies (Sprint 3) ✅

`definePolicy()` with full capability checking, `can()`/`assert()` helpers, `usePolicy()` React hook, policy context management, caching layer, automatic UI control gating, `wpk.policy.denied` events, policy reporter integration, WordPress capability provider.

## Actions (Sprint 4) ✅

Write-path orchestration with `defineAction()`, middleware layer, lifecycle events, cache invalidation, error handling.

## WordPress Data Integration (Sprint 4) ✅

`useKernel()` registry plugin, `registerKernelStore()` wrapper, `kernelEventsPlugin()` error bridge.

## Unified Reporting (Sprint 4.5) ✅

`createReporter()` with pluggable transports, consolidated logging.

## Release Infrastructure ✅

Complete Changesets-based release automation workflow with GitHub Actions, sprint-driven changeset generation scripts, comprehensive documentation (RELEASING.md, VERSIONING.md), fixed versioning across all packages.

---

**Next Phase**: Beta (v0.3.x) - Bindings & Interactivity (Sprint 5)

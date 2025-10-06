# WP Kernel Roadmap

**Status**: Active development toward v1.0  
**Latest Release**: v0.1.1

---

## ✓ Completed

### Foundation (Sprints 0-1.5)

Monorepo infrastructure, TypeScript strict mode, Vite 7 builds, testing harness (Jest + Playwright), CI/CD, documentation site, wp-env + Playground environments. 58+ test files, 900+ tests.

### Resources & Data (Sprint 1)

`defineResource()` with typed REST contracts, automatic @wordpress/data stores, cache management (invalidate, invalidateAll, cache key matching), React hooks (useGet, useList, usePrefetch), dual-surface API (thin-flat + grouped), client methods (fetch, create, update, remove).

### E2E Utils (Sprint 2)

`@geekist/wp-kernel-e2e-utils` package with namespaced API, Playwright fixture, test helpers (auth, rest, store, events, db, project), utility unit tests separated from domain E2E tests. Full fixture integration.

### Policies (Sprint 3)

`definePolicy()` with full capability checking, `can()`/`assert()` helpers, `usePolicy()` React hook, policy context management, caching layer, automatic UI control gating, `wpk.policy.denied` events, policy reporter integration, WordPress capability provider.

### Actions (Sprint 4)

Write-path orchestration with `defineAction()`, middleware layer, lifecycle events, cache invalidation, error handling.

### WordPress Data Integration (Sprint 4)

`useKernel()` registry plugin, `registerKernelStore()` wrapper, `kernelEventsPlugin()` error bridge.

### Unified Reporting (Sprint 4.5)

`createReporter()` with pluggable transports, consolidated logging.

---

## 🚧 In Progress

**Sprint 5 - Bindings & Interactivity**  
Block Bindings for resource data, Interactivity API integration, client-side state management, React providers.

---

## 🔮 Upcoming

**Sprint 6** - Jobs & background processing (`defineJob()`, status tracking, polling)  
**Sprint 7-8** - Policies & capabilities (client hints, server authorization, permission-aware UI)  
**Sprint 9** - PHP Bridge (JS → PHP event mirroring, legacy plugin integration)  
**Later** - Server-side rendering, SlotFill extension points, showcase plugin, performance & a11y hardening

---

## Timeline

| Phase             | Target  | Status         |
| ----------------- | ------- | -------------- |
| Alpha (v0.1.x)    | Q4 2024 | ✓ Complete     |
| **Beta** (v0.5.x) | Q3 2025 | 🚧 In Progress |
| **RC** (v0.9.x)   | Q4 2025 | Planned        |
| **v1.0**          | Q4 2025 | Planned        |

---

**Get Involved**: [GitHub](https://github.com/theGeekist/wp-kernel) · [Issues](https://github.com/theGeekist/wp-kernel/issues) · [Contributing](https://theGeekist.github.io/wp-kernel/contributing/)

_Last updated: October 6, 2025_

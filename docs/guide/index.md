# Core Concepts

WP Kernel revolves around a handful of primitives that cooperate rather than compete. This page narrates how they fit together before you dive into the dedicated guides for resources, Actions, events, bindings, interactivity, and jobs.

## Architecture overview

```
┌─────────────────────────────────────────────────┐
│                    User                         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│        View (Blocks + Bindings + Interactivity) │
│  • Block Bindings (read data)                   │
│  • Interactivity API (front-end behavior)       │
│  • Components (editor UI)                       │
└────────────────────┬────────────────────────────┘
                     │
                     │ triggers
                     ▼
┌─────────────────────────────────────────────────┐
│               Action (orchestration)            │
│  • Validates permissions                        │
│  • Calls Resources                              │
│  • Emits Events                                 │
│  • Invalidates cache                            │
│  • Enqueues Jobs                                │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
    │Resource│  │ Events │  │ Cache  │  │  Jobs  │
    │(REST)  │  │(hooks) │  │(store) │  │(queue) │
    └────┬───┘  └───┬────┘  └───┬────┘  └───┬────┘
         │          │           │           │
         ▼          ▼           ▼           ▼
    ┌──────────────────────────────────────────┐
    │          WordPress (REST + DB)           │
    └──────────────────────────────────────────┘
```

The diagram mirrors the way WordPress ships features today. Views render blocks backed by bindings and Interactivity controllers. Actions coordinate writes. Resources speak REST to WordPress, while events and jobs make the system observable and resilient.

## The core primitives

### Resources

A resource turns a REST contract into a typed client, data store, and cache keys from a single definition. Reach for one whenever the UI needs to read or write data. Because the schema drives both TypeScript and PHP validation, the documentation you write here stays true across the stack. [Read the full guide →](/guide/resources)

### Policies

Policies define capability gates that sit between resources and Actions. They provide synchronous hints to the UI while Actions enforce them at runtime, emit denial events, and keep cache state in sync across tabs. [Read the full guide →](/guide/policy)

### Actions

Actions are the only sanctioned write path. They call resources, wrap permission checks, emit canonical events, invalidate caches, and schedule jobs. When you trace a bug or audit a change, Actions form the timeline. [Read the full guide →](/guide/actions)

### Events

Events publish what happened in language the rest of the platform understands. Names follow `wpk.{domain}.{verb}` and remain stable across major versions. Extensions listen to them, telemetry records them, and the PHP bridge mirrors a curated subset for legacy integrations. [Read the full guide →](/guide/events)

### Reporting

Reporters centralise logging, route errors to `core/notices`, and expose hook-friendly payloads for observability. [Read the full guide →](/guide/reporting)

### WordPress data integration

Helpers for wiring kernel middleware into `@wordpress/data` registries and stores, including automatic notice bridging. [Read the full guide →](/guide/data)

### Block bindings

Bindings connect WordPress blocks to your data. Instead of hard-coded `InnerBlocks` or custom blocks, you register sources that map store selectors to block attributes. Editors and front-end users see consistent content without juggling bespoke APIs. [Read the full guide →](/guide/block-bindings)

### Interactivity API

The Interactivity API adds behaviour without shipping custom JavaScript bundles per feature. It consumes the same stores and Actions you already defined, which means front-end interactions stay in sync with the editor. [Read the full guide →](/guide/interactivity)

### Jobs

Jobs handle long-running work-imports, exports, background synchronisation-while providing polling hooks back to the UI. They live alongside Actions so retry policies and status updates stay coherent. [Read the full guide →](/guide/jobs)

## Golden rules

### Actions-first

Every write flows through an Action. The rule is enforced by linting and, soon, runtime guards. It keeps permission checks, retries, cache invalidation, and analytics in one place.

```typescript
// ❌ WRONG
const handleSubmit = async () => {
	await thing.create(formData); // ESLint error + runtime warning
};

// ✅ CORRECT
const handleSubmit = async () => {
	await CreateThing({ data: formData });
};
```

### Separate read and write paths

Read operations travel from views to bindings to store selectors and finally to resources. Write operations move from views to Actions, then to resources, and back through events and invalidation. Keeping those paths distinct is what makes features observable and debuggable.

### Event stability

Events are part of the public contract. Use the canonical registry:

```typescript
import { events } from '@geekist/wp-kernel/events';

CreateThing.emit(events.thing.created, { id });
```

Avoid ad-hoc strings; linting will remind you, and future integrations will thank you.

### JavaScript hooks are canonical

The JavaScript event registry is the source of truth. The PHP bridge mirrors only the events needed for server-side integrations, which prevents drift and double-bookkeeping.

### Explicit cache lifecycle

Resources expose `invalidate`, `prefetch`, and `use*` hooks so the UI can manage cache behaviour deliberately. There are no hidden timers or stale-while-revalidate surprises.

## Walk through a request

Consider a user submitting the Thing form from the quick start:

1. The component calls `CreateThing({ data })`.
2. The Action validates permissions and forwards the call to `thing.create(data)`.
3. WordPress receives the REST request, applies schema validation, and persists the record.
4. The resource resolves with the created object.
5. The Action emits `wpk.thing.created` so analytics and extensions can react.
6. The Action invalidates the `['thing', 'list']` cache key.
7. Store resolvers notice the invalidation and refetch.
8. The UI re-renders with the fresh list.

Because each step has a dedicated place in the architecture, you can add logging, retries, or additional side effects without rewriting existing code.

## Error handling and resilience

All surfaced errors extend `KernelError`, giving you predictable properties for UX messaging, logging, and telemetry. Transports retry with exponential backoff on recoverable failures (timeouts, 5xx, 429). Background jobs follow the same policy and expose polling hooks so the UI can communicate progress without guesswork.

## Performance expectations

The framework sets budgets-sub-1.5s TTI on 3G, less than 30KB of additional JavaScript when you adopt the kernel, REST responses that stay under 500ms at p95. By baking these expectations into the architecture, the documentation you are reading doubles as a checklist for production readiness.

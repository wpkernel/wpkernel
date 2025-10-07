# API Reference

Complete API documentation for WP Kernel.

## Core Modules

### [Resources](/api/resources)

Define typed REST resources with automatic client generation, store integration, and cache management.

### [Policies](/api/policy)

Declarative capability rules with caching, denial events, and React helpers for UI gating.

### [Reporter](/api/reporter)

Structured logging via LogLayer with console and WordPress hook transports.

### [Data Helpers](/guide/data)

Registry utilities (`registerKernelStore`) and notice bridging for `@wordpress/data` stores. `withKernel`
is the bootstrap function available from `@geekist/wp-kernel`.

### [Errors](/api/generated/error/README)

Error types and handling primitives.

### [HTTP Transport](/api/generated/http/README)

## UI Hooks

### [`usePrefetcher`](/api/usePrefetcher)

React adapters around resource prefetching helpers (`prefetchGet` /
`prefetchList`) plus utility hooks for hover, visibility, and pagination
prefetch flows.

### [`useAction`](/api/useAction)

Thin React wrapper over kernel Actions with concurrency controls, deduping,
and automatic cache invalidation.

## Coming Soon

The following modules are planned for future sprints:

- [**Actions**](/api/actions) - Write operation orchestration (Sprint 3)
- [**Jobs**](/api/jobs) - Background task management (Sprint 2)
- [**Events**](/api/events) - Hook system integration (Sprint 2)

## Usage

```typescript
import { defineResource, invalidate } from '@geekist/wp-kernel';
import { KernelError, ServerError } from '@geekist/wp-kernel/error';
import { fetch } from '@geekist/wp-kernel/http';
```

For detailed examples and tutorials, see the [Guide](/guide/).

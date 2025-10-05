# Sprint 4.5 Specification - Unified Reporting & Data Consolidation

## Scope (Sprint 4.5)

- ESLint rule: `no-console-in-kernel`
- Reporter consolidation using LogLayer
- Data registry integration: `useKernel`, `kernelEventsPlugin`, `registerKernelStore`
- Documentation updates

See also: [WordPress Data Integration - Implementation Plan](../sprint_4.5_WordPress-Data-Integration-Implementation-Plan.md)

⸻

## 1. Objectives

1. Deliver Reporter v0 - a unified logging framework using `loglayer` npm package
2. Consolidate two fragmented `createReporter()` implementations (actions, policy) into single `packages/kernel/src/reporter/` module
3. Implement core multi-channel transports: console and hooks (`wp.hooks`)
4. Add custom ESLint rule `no-console-in-kernel` to enforce reporter usage
5. Finalise WordPress Data Integration with registry/store helpers and notices bridge (deferred parts marked post-4.5)

⸻

## 2. Deliverables (by Package)

| Package               | Deliverable                                                          | Status |
| --------------------- | -------------------------------------------------------------------- | ------ |
| @geekist/wp-kernel    | Reporter v0 module using `loglayer`                                  | 🟡 New |
|                       | Consolidate actions/policy createReporter() → unified implementation | 🟡 New |
|                       | Multi-channel transports (console, hooks)                            | 🟡 New |
|                       | ESLint rule: no-console-in-kernel                                    | 🟡 New |
| @geekist/wp-kernel-ui | (Defer to Sprint 5 UI providers)                                     | ⏸     |

⸻

## 3. Reporter v0 Specification

### 3.1 API Surface

```typescript
export interface ReporterOptions {
	namespace?: string; // e.g. "kernel", "showcase"
	channel?: 'console' | 'hooks' | 'bridge' | 'all';
	level?: 'debug' | 'info' | 'warn' | 'error';
}

export interface Reporter {
	info(message: string, context?: unknown): void;
	warn(message: string, context?: unknown): void;
	error(message: string, context?: unknown): void;
	debug(message: string, context?: unknown): void;
	child?(namespace: string): Reporter; // Optional extension
}

export function createReporter(opts?: ReporterOptions): Reporter;
```

### 3.2 Behaviour

| Channel | Description                                                |
| ------- | ---------------------------------------------------------- |
| Console | Pretty-printed logs (dev only)                             |
| Hooks   | Emits {namespace}.reporter.{level} via wp.hooks.doAction() |
| Bridge  | _Planned for post-4.5; not implemented in this sprint_     |
| All     | Uses all of the above (post-4.5 enhancement)               |

### 3.3 Event Mapping

| Level | Hook                       | Payload              |
| ----- | -------------------------- | -------------------- |
| debug | {namespace}.reporter.debug | { message, context } |
| info  | {namespace}.reporter.info  | { message, context } |
| warn  | {namespace}.reporter.warn  | { message, context } |
| error | {namespace}.reporter.error | { message, context } |

**Note**: Events are namespace-aware, following existing event taxonomy (e.g., `showcase.reporter.error` for showcase app)

⸻

## 4. LogLayer Integration

**Implementation**: Use [`loglayer`](https://www.npmjs.com/package/loglayer) npm package to provide unified, multi-channel reporter.

**Location**: `packages/kernel/src/reporter/`

**Key Benefits**:

- Single source of truth for all logging
- Pluggable transport architecture (console, hooks)
- Contextual logging with namespace support
- Child loggers for nested contexts
- Type-safe API

**Implementation Guidance**:

- Keep wrapper minimal and focused on LogLayer integration
- Ensure namespace awareness for all log events
- Provide test coverage for all channels implemented in this sprint
- Avoid premature optimisation; focus on clarity and extensibility
- Bridge transport and PHP integration to be implemented in later sprints

### 4.1 Basic Implementation

```typescript
import { LogLayer } from 'loglayer';

export function createReporter(opts?: ReporterOptions): Reporter {
	const transports = createTransports(opts?.channel ?? 'console');

	const logger = new LogLayer({
		transport: transports,
		context: {
			namespace: opts?.namespace ?? 'kernel',
		},
	});

	return {
		info: (message, context) => logger.info(message, context),
		warn: (message, context) => logger.warn(message, context),
		error: (message, context) => logger.error(message, context),
		debug: (message, context) => logger.debug(message, context),
		child: (namespace) =>
			createReporter({
				...opts,
				namespace: `${opts?.namespace ?? 'kernel'}.${namespace}`,
			}),
	};
}
```

### 4.2 Transport Implementations

**Console Transport** (development):

```typescript
const consoleTransport = {
	info: (msg: LogEntry) =>
		console.info(`[${msg.context.namespace}]`, msg.message, msg.context),
	warn: (msg: LogEntry) =>
		console.warn(`[${msg.context.namespace}]`, msg.message, msg.context),
	error: (msg: LogEntry) =>
		console.error(`[${msg.context.namespace}]`, msg.message, msg.context),
	debug: (msg: LogEntry) =>
		console.debug(`[${msg.context.namespace}]`, msg.message, msg.context),
};
```

**Hooks Transport** (WordPress events):

```typescript
import { doAction } from '@wordpress/hooks';

const hooksTransport = {
	info: (msg: LogEntry) =>
		doAction(`${msg.context.namespace}.reporter.info`, msg),
	warn: (msg: LogEntry) =>
		doAction(`${msg.context.namespace}.reporter.warn`, msg),
	error: (msg: LogEntry) =>
		doAction(`${msg.context.namespace}.reporter.error`, msg),
	debug: (msg: LogEntry) =>
		doAction(`${msg.context.namespace}.reporter.debug`, msg),
};
```

**Bridge Transport** (PHP logging):  
_Planned for post-4.5 sprint; not implemented in this sprint._

```typescript
const bridgeTransport = {
	info: (msg: LogEntry) => window.wpKernel?.bridge?.log?.('info', msg),
	warn: (msg: LogEntry) => window.wpKernel?.bridge?.log?.('warn', msg),
	error: (msg: LogEntry) => window.wpKernel?.bridge?.log?.('error', msg),
	debug: (msg: LogEntry) => window.wpKernel?.bridge?.log?.('debug', msg),
};
```

⸻

## Data Registry Integration (Sprint 4.5)

Deliver WordPress Data Integration components specified in [[WordPress Data Integration - Implementation Plan]].

### Components

| Module                 | Purpose                                                | Status      |
| ---------------------- | ------------------------------------------------------ | ----------- |
| useKernel(registry)    | Registry plugin injecting action middleware + reporter | 🟡 New      |
| registerKernelStore()  | Store wrapper for kernel middleware                    | 🟡 New      |
| kernelEventsPlugin()   | Action error → notice bridge                           | 🟡 New      |
| kernelPolicyPlugin()   | Policy middleware                                      | ⏸ Post-4.5 |
| registerKernelPlugin() | Editor UI provider                                     | ⏸ Post-4.5 |

### Reporter Integration

- All store/middleware installers accept `reporter` option.
- Errors and policy denials emit `reporter.error()` with context.
- Bridge to `core/notices` preserves existing UX.
- Full implementation details in [[WordPress Data Integration - Implementation Plan]].

⸻

## Post-4.5 Context (Reference)

The following sections are post-4.5 context/reference only.

### Repository Consolidation Plan

**Note**: LogLayer makes the console sweep optional. Teams can migrate gradually as they touch code. Full migration and bridge integration are post-4.5 enhancements.

Gradual migration is optional and can be done incrementally after 4.5 if needed.

### Lint / CI Rules

```javascript
// eslint.config.js
rules: {
  'no-console': ['error', { allow: ['assert'] }],
};
```

Dev-mode warning (console.warn) printed once per method:  
“ctx.reporter.warn is deprecated; use ctx.reporter.warn instead.”

⸻

### Architecture Overview

```
┌──────────────────────────────┐
│ Actions Layer                │
│ ──────────────────────────── │
│ ctx.reporter / ctx.reporter       │
│ middleware + events          │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ Reporter v0 (4.5)            │
│ console + wp.hooks           │
│ → emits {ns}.reporter.*      │
│ *Bridge transport planned*   │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ kernelEventsPlugin (data)    │
│ converts errors → notices    │
│ + reporter.error() │
└────────────┬─────────────────┘
│
▼
┌──────────────────────────────┐
│ UI / Showcase (Sprint5) │
│ consumes notices + logs │
└──────────────────────────────┘
```

⸻

### Testing Plan

#### Unit Tests

- `reporter.test.ts`: verify channel outputs and hook emission
- `context.test.ts`: `ctx.reporter.*` forwards and warns once
- `data/plugins/events.test.ts`: error → notice + `reporter.error()`

#### Integration

- Run with real `@wordpress/data` registry → actions dispatch → error → notice
- Ensure reporter logs hook events as implemented in this sprint (console, hooks)
- _PHP bridge payload firing tests to be added post-4.5_

#### E2E (Showcase)

- Trigger failed action → user sees UI notice and Reporter entry in dev console
- Verify no raw `console.log()` output from kernel code

⸻

### Documentation

| Doc                        | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `docs/api/reporter.md`     | API surface (createReporter, methods, channels) |
| `docs/guide/reporting.md`  | Migration guide from console to Reporter        |
| `docs/guide/actions.md`    | Update `ctx.reporter` section                   |
| `docs/guide/data.md`       | Mention reporter option in `useKernel()`        |
| `docs/internal/contrib.md` | Add "No console.\*" commit rule                 |

⸻

### Risk & Mitigation

| Risk                           | Impact      | Mitigation                                                |
| ------------------------------ | ----------- | --------------------------------------------------------- |
| Residual logs in kernel core   | Noise in CI | ESLint gate + manual sweep (optional)                     |
| Hot reload breakage (LogLayer) | Low         | Safe no-op cleanup                                        |
| Bridge channel flood           | Medium      | _Planned for post-4.5; throttle bridge emission by level_ |
| Namespace collision            | Low         | Prefix reporter events with namespace                     |

⸻

## Definition of Done (DoD)

- ✅ `createReporter()` implemented and tested (console and hooks channels only)
- ✅ individual implementations of existing `ctx.reporter.*` forwards to the new `ctx.reporter` with deprecation notice
- ✅ ESLint rules enforce no-console in kernel core (with exemptions)
- ✅ Lint and CI enforce policy
- ✅ Data Integration wrappers (`useKernel`, `kernelEventsPlugin`) accept reporter
- ✅ Docs and migration guide published
- ✅ Showcase demonstrates notice integration

⸻

**In Short ⚡**

Sprint 4.5 consolidates the foundation:  
a Reporter for clarity, a LogLayer-based unified implementation, and lint rules to enforce usage.  
_Bridge transport and full PHP integration are future work._  
This ensures Sprint 5 UI can deliver developer-facing blocks and visual debuggers on top of a clean, event-driven, and fully observable kernel.

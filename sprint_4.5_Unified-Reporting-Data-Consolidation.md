# Sprint 4.5 Specification - Unified Reporting & Data Consolidation

Context: Transitional sprint between 4 (Actions) and 5 (UI Blocks)
Goal: Introduce a unified reporting framework, consolidate logging across kernel packages, and finalise the WordPress Data Integration work from Sprint 4.
Roadmap Link: [[Roadmap PO • v1.0]] § Sprint 4.5
Dependencies: [[Actions]], [[sprint_4.5_WordPress-Data-Integration-Implementation-Plan]], [[Policies]]

⸻

## 1. Objectives

1. Deliver Reporter v0 - a unified logging framework using `loglayer` npm package
2. Consolidate two fragmented `createReporter()` implementations (actions, policy) into single `packages/kernel/src/reporter/` module
3. Implement multi-channel transports: console, hooks (`wp.hooks`), and bridge (PHP)
4. Add custom ESLint rule `no-console-in-kernel` to enforce reporter usage
5. Finalise WordPress Data Integration with registry/store helpers and notices bridge
6. Update all kernel code to use unified reporter

⸻

## 2. Deliverables (by Package)

| Package               | Deliverable                                                           | Status           |
| --------------------- | --------------------------------------------------------------------- | ---------------- |
| @geekist/wp-kernel    | Reporter v0 module using `loglayer`                                   | 🟡 New           |
|                       | Consolidate actions/policy createReporter() → unified implementation  | 🟡 New           |
|                       | Multi-channel transports (console, hooks, bridge)                     | 🟡 New           |
|                       | Data Integration (useKernel, registerKernelStore, kernelEventsPlugin) | 🟢 From Sprint 4 |
|                       | ESLint rule: no-console-in-kernel                                     | 🟡 New           |
| @geekist/wp-kernel-ui | (Defer to Sprint 5 UI providers)                                      | ⏸               |
| Showcase app          | Adopt unified reporter for notices and action feedback                | 🟡 New           |

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
| Bridge  | Optional bridge → PHP wpk.bridge.log                       |
| All     | Uses all of the above                                      |

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
- Pluggable transport architecture (console, hooks, bridge)
- Contextual logging with namespace support
- Child loggers for nested contexts
- Type-safe API

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

```typescript
const bridgeTransport = {
	info: (msg: LogEntry) => window.wpKernel?.bridge?.log?.('info', msg),
	warn: (msg: LogEntry) => window.wpKernel?.bridge?.log?.('warn', msg),
	error: (msg: LogEntry) => window.wpKernel?.bridge?.log?.('error', msg),
	debug: (msg: LogEntry) => window.wpKernel?.bridge?.log?.('debug', msg),
};
```

⸻

## 5. Repository Consolidation Plan

**Note**: LogLayer makes the console sweep optional. Teams can migrate gradually as they touch code.

### 5.1 Inventory (Optional)

Run ripgrep to identify console usage:

```bash
rg "console\.(log|debug|info|warn|error)" packages app > /tmp/console.txt
```

Current inventory (from codebase scan):

- Kernel core: ~10 instances (actions/context.ts, resource/cache.ts, namespace/detect.ts)
- Showcase app: ~14 instances (debug logging in JobsList.tsx, admin/index.tsx)
- CLI/Scripts: Multiple instances (legitimate user output - DO NOT TOUCH)
- Tests: Multiple instances (legitimate test output - DO NOT TOUCH)
- Docs: All console.\* are examples (DO NOT TOUCH)

### 5.2 Migration Strategy

**Gradual migration** (no codemod needed):

1. LogLayer handles all `ctx.reporter.*` calls automatically
2. New code uses `ctx.reporter.*` directly
3. Old code continues working with deprecation warnings
4. Teams migrate when convenient (no rush)

### 5.3 Lint / CI Rules

```javascript
// eslint.config.js
rules: {
  'no-console': ['error', { allow: ['assert'] }],
};
```

Dev-mode warning (console.warn) printed once per method:
“ctx.reporter.warn is deprecated; use ctx.reporter.warn instead.”

⸻

## 6. Data Integration Completion

Deliver WordPress Data Integration components specified in [[WordPress Data Integration - Implementation Plan]].

### 6.1 Components

Module Purpose Status
useKernel(registry) Registry plugin injecting action middleware + reporter � New
registerKernelStore() Store wrapper for kernel middleware � New
kernelEventsPlugin() Action error → notice bridge � New
kernelPolicyPlugin() Policy middleware ⏸ Defer to Sprint 3
registerKernelPlugin() Editor UI provider ⏸ Defer to Sprint 5

### 6.2 Reporter Integration

- All store/middleware installers accept `reporter` option.
- Errors and policy denials emit `reporter.error()` with context.
- Bridge to `core/notices` preserves existing UX.
- Full implementation details in [[WordPress Data Integration - Implementation Plan]].

⸻

## 7. Architecture Overview

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
│ console + wp.hooks + bridge  │
│ → emits {ns}.reporter.*      │
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

⸻

## 8. Testing Plan

### Unit Tests
- `reporter.test.ts`: verify channel outputs and hook emission
- `context.test.ts`: `ctx.reporter.*` forwards and warns once
- `data/plugins/events.test.ts`: error → notice + `reporter.error()`

### Integration
- Run with real `@wordpress/data` registry → actions dispatch → error → notice
- Ensure reporter logs hook events and PHP bridge payload fires when available

### E2E (Showcase)
- Trigger failed action → user sees UI notice and Reporter entry in dev console
- Verify no raw `console.log()` output from kernel code

⸻

## 9. Documentation

| Doc | Purpose |
|-----|---------|
| `docs/api/reporter.md` | API surface (createReporter, methods, channels) |
| `docs/guide/reporting.md` | Migration guide from console to Reporter |
| `docs/guide/actions.md` | Update `ctx.reporter` section |
| `docs/guide/data.md` | Mention reporter option in `useKernel()` |
| `docs/internal/contrib.md` | Add "No console.*" commit rule |

⸻

## 10. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Residual logs in kernel core | Noise in CI | ESLint gate + manual sweep (optional) |
| Hot reload breakage (LogLayer) | Low | Safe no-op cleanup |
| Bridge channel flood | Medium | Throttle bridge emission by level |
| Namespace collision | Low | Prefix reporter events with namespace |

⸻

## 11. Timeline (1 Day Estimate)

| Phase | Effort | Deliverables |
|-------|--------|--------------|
| Reporter v0 Core | 3 h | Implementation + unit tests |
| LogLayer Shim | 1 h | Dev warnings + tests |
| Console Sweep (Optional) | 2 h | Replace logs in kernel core (gradual migration) |
| Lint / CI Rules | 1 h | ESLint + CI check |
| Docs | 2 h | API + migration guide |
| **Total** | **≈ 9 h** | **Sprint 4.5 Complete** |

**Note**: LogLayer enables gradual migration. Console sweep can be done incrementally after 4.5 if needed.

⸻

## 12. Definition of Done (DoD)
- ✅ `createReporter()` implemented and tested
- ✅ `ctx.reporter.*` forwards to `ctx.reporter` with deprecation notice
- ✅ ESLint rules enforce no-console in kernel core (with exemptions)
- ✅ Lint and CI enforce policy
- ✅ Data Integration wrappers (`useKernel`, `kernelEventsPlugin`) accept reporter
- ✅ Docs and migration guide published
- ✅ Showcase demonstrates notice integration

⸻

**In Short ⚡**

Sprint 4.5 consolidates the foundation:
a Reporter for clarity, a LogLayer for backward compatibility, and a fully-wired WordPress Data bridge for native action feedback.
This ensures Sprint 5 UI can deliver developer-facing blocks and visual debuggers on top of a clean, event-driven, and fully observable kernel.
```

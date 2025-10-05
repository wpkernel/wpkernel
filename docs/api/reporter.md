# Reporter

The reporter module provides a unified logging surface for the kernel. It routes structured log entries through LogLayer so that
console output, WordPress hooks, and future transports share the same formatting and namespace metadata.

## Import

```typescript
import { createReporter } from '@geekist/wp-kernel/reporter';
```

## `createReporter(options)`

Creates a reporter instance scoped to a namespace. Reporters expose levelled methods (`info`, `warn`, `error`, `debug`) plus
`child()` for composing nested namespaces.

```typescript
const reporter = createReporter({ namespace: 'kernel', channel: 'all' });

reporter.info('Action started', { requestId: 'act_123' });
reporter.error('Policy denied', { rule: 'posts.delete' });
```

### Options

| Option      | Type                                        | Default   | Description                                                            |
| ----------- | ------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| `namespace` | `string`                                    | `kernel`  | Prefix for log lines and hook names (`{namespace}.reporter.{level}`).  |
| `channel`   | `'console' \| 'hooks' \| 'bridge' \| 'all'` | `console` | Transport selection. Bridge is reserved for the PHP bridge (post-4.5). |
| `level`     | `'debug' \| 'info' \| 'warn' \| 'error'`    | `info`    | Minimum log level processed by transports.                             |
| `enabled`   | `boolean`                                   | `true`    | Disable all transports without changing configuration.                 |

### Methods

| Method  | Signature                                      | Notes                                                   |
| ------- | ---------------------------------------------- | ------------------------------------------------------- |
| `info`  | `(message: string, context?: unknown) => void` | Emits informational log entry.                          |
| `warn`  | `(message: string, context?: unknown) => void` | Emits warning-level entry.                              |
| `error` | `(message: string, context?: unknown) => void` | Emits error entry and is ideal for surfaced failures.   |
| `debug` | `(message: string, context?: unknown) => void` | Emits debug entry (honours `level`).                    |
| `child` | `(namespace: string) => Reporter`              | Returns a reporter nested under `{parent}.{namespace}`. |

Context objects are passed through LogLayer metadata. They remain structured when the entry is sent to hooks or console.

### Transports

Sprint 4.5 ships two transports with unified formatting:

- **Console** – writes `[namespace] message` to the developer console (skipped in production builds).
- **Hooks** – emits `doAction('{namespace}.reporter.{level}', { message, context, timestamp })`.

The bridge transport is reserved for the PHP integration in a later sprint. Requesting it throws to highlight the missing
implementation.

### Child Reporters

Use `child()` to create scoped reporters without repeating configuration:

```typescript
const kernelReporter = createReporter({
	namespace: 'showcase',
	channel: 'all',
});
const policyReporter = kernelReporter.child('policy');

policyReporter.warn('Rule denied', { rule: 'posts.delete' });
// Hook: showcase.policy.reporter.warn
```

## Integration

- **Actions** – the kernel automatically creates a reporter per namespace when actions execute.
- **Policies** – `definePolicy()` uses a reporter when `debug: true` is provided.
- **Registry** – `useKernel()` accepts a reporter override when wiring `@wordpress/data`.

Every console call inside `packages/kernel/src` now routes through this module. The custom ESLint rule
`@kernel/no-console-in-kernel` enforces the policy.

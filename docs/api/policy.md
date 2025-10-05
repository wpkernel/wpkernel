# Policy API

Policies provide a declarative capability layer that Actions enforce and UI
components consume through hooks. The client runtime handles caching, diagnostics,
and cross-tab synchronisation.

## `definePolicy`

```ts
import { definePolicy } from '@geekist/wp-kernel/policy';
```

### Signature

```ts
import type {
	PolicyMap,
	PolicyOptions,
	PolicyHelpers,
} from '@geekist/wp-kernel/policy';

declare function definePolicy<K extends Record<string, unknown>>(
	map: PolicyMap<K>,
	options?: PolicyOptions
): PolicyHelpers<K>;
```

`definePolicy()` accepts a typed map of rules keyed by capability name. Each rule
receives a `PolicyContext` with adapters, cache helpers, and the resolved
namespace. The return value contains helpers for evaluating and extending the
map.

### Options

`PolicyOptions` customise runtime behaviour:

- `namespace` – override the detected plugin namespace. Defaults to
  `getNamespace()` (usually the package slug).
- `adapters.wp.canUser` – inject a capability check compatible with
  `@wordpress/data`’s `canUser` selector. The runtime auto-detects the core
  selector when the adapter is omitted.
- `adapters.restProbe` – async helper for pinging REST endpoints before a rule
  resolves. Optional.
- `cache.ttlMs` – default time-to-live per entry (60_000 ms by default).
- `cache.storage` – `'memory'` (default) or `'session'` persistence.
- `cache.crossTab` – enable/disable BroadcastChannel fan-out (defaults to `true`).
- `debug` – when `true`, the runtime logs reporter messages to the console.

### Usage

```ts
export type JobPolicies = {
	'jobs.manage': void;
	'jobs.delete': { id: number };
};

export const policy = definePolicy<JobPolicies>({
	'jobs.manage': () => true,
	'jobs.delete': async ({ adapters }, { id }) =>
		(await adapters.wp?.canUser('delete', {
			kind: 'postType',
			name: 'job',
			id,
		})) ?? false,
});
```

The returned helpers automatically register with the Action runtime so
`ctx.policy.can()` and `ctx.policy.assert()` operate on the same instance used by
`usePolicy()`.

## `PolicyHelpers`

`PolicyHelpers<K>` exposes the following methods:

- `can(key, ...params)` → `boolean | Promise<boolean>` – Evaluate a rule without
  throwing. Async rules return promises.
- `assert(key, ...params)` → `void | Promise<void>` – Throws
  `KernelError('PolicyDenied')` when the rule resolves to `false`. Also emits a
  `{namespace}.policy.denied` WordPress hook and BroadcastChannel event.
- `keys()` → `(keyof K)[]` – List registered capability keys.
- `extend(map)` → `void` – Merge additional rules and invalidate the cache for
  affected keys.
- `cache` – Shared `PolicyCache` instance used by the runtime and UI hook.

## `PolicyContext`

Rules receive a `PolicyContext` argument with:

- `namespace` – resolved namespace.
- `adapters` – the adapters supplied through `PolicyOptions` plus any detected
  defaults (`wp.canUser`, `restProbe`).
- `cache` – low-level cache interface supporting `get`, `set`, `invalidate`, and
  `subscribe`.
- `reporter` – structured logging hooks (`info`, `warn`, `error`, `debug`).

Use the context to compose decisions, log diagnostic events, or reuse cached
results across rules.

## `PolicyCacheOptions`

```ts
interface PolicyCacheOptions {
	ttlMs?: number;
	storage?: 'memory' | 'session';
	crossTab?: boolean;
}
```

- Entries expire after `ttlMs` unless overridden in `cache.set()`.
- `storage: 'session'` persists results to `sessionStorage`; memory is
  ephemeral.
- `crossTab: false` disables BroadcastChannel replication across tabs.

## `usePolicy`

```ts
import { usePolicy } from '@geekist/wp-kernel/policy';
```

### Signature

```ts
function usePolicy<K extends Record<string, unknown>>(): {
	can: <Key extends keyof K>(
		key: Key,
		...params: K[Key] extends void ? [] : [K[Key]]
	) => boolean;
	keys: (keyof K)[];
	isLoading: boolean;
	error?: Error;
};
```

### Behaviour

- Before hydration, `can()` returns `false` and `isLoading` is `true` so UI
  components can optimistically disable affordances.
- After hydration, the hook reads from the shared cache and subscribes to
  invalidation events for live updates.
- Thrown errors from `policy.can()` propagate to the hook’s `error` state.

### Usage

```tsx
import type { JobPolicies } from '@/policy';

export function Toolbar({ id }: { id: number }) {
	const { can, isLoading } = usePolicy<JobPolicies>();
	const removeDisabled = isLoading || !can('jobs.delete', { id });

	return <Button disabled={removeDisabled}>Delete</Button>;
}
```

## Denial events

Every failed `assert()` emits a `{namespace}.policy.denied` hook via
`@wordpress/hooks` and a message on the `wpk.policy.events` BroadcastChannel. The
payload includes the policy key, sanitized params, message key, request id (when
available), and timestamp. Use these events to aggregate audit logs or fan out to
native bridges.

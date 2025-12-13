[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / defineCapability

# Function: defineCapability()

```ts
function defineCapability<K>(config): CapabilityHelpers<K>;
```

Define a capability runtime with declarative capability rules.

Capabilities provide **type-safe, cacheable capability checks** for both UI and actions.
They enable conditional rendering (show/hide buttons), form validation (disable fields),
and enforcement (throw before writes) - all from a single source of truth.

This is the foundation of **Capability-Driven UI**: Components query capabilities without
knowing implementation details. Rules can leverage WordPress native capabilities
(`wp.data.select('core').canUser`), REST probes, or custom logic.

## What Capabilities Do

Every capability runtime provides:

- **`can(key, params?)`** - Check capability (returns boolean, never throws)
- **`assert(key, params?)`** - Enforce capability (throws `CapabilityDenied` if false)
- **Cache management** - Automatic result caching with TTL and cross-tab sync
- **Event emission** - Broadcast denied events via `@wordpress/hooks` and BroadcastChannel
- **React integration** - `useCapability()` hook (provided by `@wpkernel/ui`) for SSR-safe conditional rendering
- **Action integration** - `ctx.capability.assert()` in actions for write protection

## Basic Usage

```typescript
import { defineCapability } from '@wpkernel/core/capability';

// Define capability rules
const capability = defineCapability<{
  'posts.view': void;           // No params needed
  'posts.edit': number;         // Requires post ID
  'posts.delete': number;       // Requires post ID
}>({
  'posts.view': (ctx) => {
    // Sync rule: immediate boolean
    return ctx.adapters.wp?.canUser('read', { kind: 'postType', name: 'post' }) ?? false;
  },
  'posts.edit': async (ctx, postId) => {
    // Async rule: checks specific post capability
    const result = await ctx.adapters.wp?.canUser('update', {
      kind: 'postType',
      name: 'post',
      id: postId
    });
    return result ?? false;
  },
  'posts.delete': async (ctx, postId) => {
    const result = await ctx.adapters.wp?.canUser('delete', {
      kind: 'postType',
      name: 'post',
      id: postId
    });
    return result ?? false;
  }
});

// Use in actions (enforcement)
export const DeletePost = defineAction('Post.Delete', async (ctx, { id }) => {
  ctx.capability.assert('posts.delete', id); // Throws if denied
  await post.remove!(id);
  ctx.emit(post.events.deleted, { id });
});

// Use in UI (conditional rendering)
function PostActions({ postId }: { postId: number }) {
  const capability = useCapability<typeof capability>();
  const canEdit = capability.can('posts.edit', postId);
  const canDelete = capability.can('posts.delete', postId);

  return (
    <div>
      <Button disabled={!canEdit}>Edit</Button>
      <Button disabled={!canDelete}>Delete</Button>
    </div>
  );
}
```

## Caching & Performance

Results are **automatically cached** with:

- **Memory cache** - Instant lookups for repeated checks
- **Cross-tab sync** - BroadcastChannel keeps all tabs in sync
- **Session storage** - Optional persistence (set `cache.storage: 'session'`)
- **TTL support** - Cache expires after configurable timeout (default: 60s)

```typescript
const capability = defineCapability(rules, {
	cache: {
		ttlMs: 30_000, // 30 second cache
		storage: 'session', // Persist in sessionStorage
		crossTab: true, // Sync across browser tabs
	},
});
```

Cache is invalidated automatically when rules change via `capability.extend()`,
or manually via `capability.cache.invalidate()`.

## WordPress Integration

By default, capabilities auto-detect and use `wp.data.select('core').canUser()` for
native WordPress capability checks:

```typescript
// Automatically uses wp.data when available
const capability = defineCapability({
	'posts.edit': async (ctx, postId) => {
		// ctx.adapters.wp is auto-injected
		const result = await ctx.adapters.wp?.canUser('update', {
			kind: 'postType',
			name: 'post',
			id: postId,
		});
		return result ?? false;
	},
});
```

Override adapters for custom capability systems:

```typescript
const capability = defineCapability(rules, {
	adapters: {
		wp: {
			canUser: async (action, resource) => {
				// Custom implementation (e.g., check external API)
				return fetch(`/api/capabilities?action=${action}`).then((r) =>
					r.json()
				);
			},
		},
		restProbe: async (key) => {
			// Optional: probe REST endpoints for availability
			return fetch(`/wp-json/acme/v1/probe/${key}`).then((r) => r.ok);
		},
	},
});
```

## Event Emission

When capabilities are denied, events are emitted to:

- **`@wordpress/hooks`** - `{namespace}.capability.denied` with full context
- **BroadcastChannel** - Cross-tab notification for UI synchronization
- **PHP bridge** - Optional server-side logging (when `bridged: true` in actions)

```typescript
// Listen for denied events
wp.hooks.addAction('acme.capability.denied', 'acme-plugin', (event) => {
	const reporter = createReporter({
		namespace: 'acme.capability',
		channel: 'all',
	});
	reporter.warn('Capability denied:', event.capabilityKey, event.context);
	// Show toast notification, track in analytics, etc.
});
```

## Runtime Wiring

Capabilities are **automatically registered** with the action runtime on definition:

```typescript
// 1. Define capability (auto-registers)
const capability = defineCapability(rules);

// 2. Use in actions immediately
const CreatePost = defineAction('Post.Create', async (ctx, args) => {
	ctx.capability.assert('posts.create'); // Works automatically
	// ...
});
```

For custom runtime configuration:

```typescript
globalThis.__WP_KERNEL_ACTION_RUNTIME__ = {
	capability: defineCapability(rules),
	jobs: defineJobQueue(),
	bridge: createPHPBridge(),
	reporter: createReporter(),
};
```

## Extending Capabilities

Add or override rules at runtime:

```typescript
capability.extend({
	'posts.publish': async (ctx, postId) => {
		// New rule
		return ctx.adapters.wp?.canUser('publish_posts') ?? false;
	},
	'posts.edit': (ctx, postId) => {
		// Override existing rule
		return false; // Disable editing
	},
});
// Cache automatically invalidated for affected keys
```

## Type Safety

Capability keys and parameters are **fully typed**:

```typescript
type MyCapabilities = {
  'posts.view': void;          // No params
  'posts.edit': number;        // Requires number
  'posts.assign': { userId: number; postId: number }; // Requires object
};

const capability = defineCapability<MyCapabilities>({ ... });

capability.can('posts.view');           // ✓ OK
capability.can('posts.edit', 123);      // ✓ OK
capability.can('posts.edit');           // ✗ Type error: missing param
capability.can('posts.unknown');        // ✗ Type error: unknown key
```

## Async vs Sync Rules

Rules can be **synchronous** (return `boolean`) or **asynchronous** (return `Promise<boolean>`).
Async rules are automatically detected and cached to avoid redundant API calls:

```typescript
defineCapability({
	map: {
		'fast.check': (ctx) => true, // Sync: immediate
		'slow.check': async (ctx) => {
			// Async: cached
			const result = await fetch('/api/check');
			return result.ok;
		},
	},
});
```

In React components, async rules return `false` during evaluation and update when resolved.

## Type Parameters

### K

`K` _extends_ `Record`<`string`, `unknown`>

Capability map type defining capability keys and their parameter types

## Parameters

### config

[`CapabilityDefinitionConfig`](../type-aliases/CapabilityDefinitionConfig.md)<`K`>

Configuration object mapping capability keys to rule functions and runtime options

## Returns

[`CapabilityHelpers`](../type-aliases/CapabilityHelpers.md)<`K`>

Capability helpers object with can(), assert(), keys(), extend(), and cache API

## Throws

DeveloperError if a rule returns non-boolean value

## Throws

CapabilityDenied when assert() called on denied capability

## Examples

```typescript
// Minimal example (no params)
const capability = defineCapability({
	map: {
		'admin.access': (ctx) =>
			ctx.adapters.wp?.canUser('manage_options') ?? false,
	},
});

if (capability.can('admin.access')) {
	// Show admin menu
}
```

```typescript
// With custom adapters
const capability = defineCapability({
	map: rules,
	options: {
		namespace: 'acme-plugin',
		adapters: {
			restProbe: async (key) => {
				const res = await fetch(`/wp-json/acme/v1/capabilities/${key}`);
				return res.ok;
			},
		},
		cache: { ttlMs: 5000, storage: 'session' },
		debug: true, // Log all capability checks
	},
});
```

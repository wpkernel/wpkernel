# Events

# Events

> **Status**: 🚧 Foundation implemented in Sprint 1. Full event system (Actions, Policies, Jobs, PHP Bridge) coming in Sprints 3-9.

Stable, versioned event registry with predictable names. All events come from a central registry-no ad-hoc strings.

JavaScript hooks are the authoritative source-events fire here first. The PHP bridge mirrors only selected events for legacy integrations.

## What's Implemented Now (Sprint 1)

### Resource Transport Events

Automatically emitted by the HTTP transport layer (framework events use `wpk.*` namespace):

```typescript
// Before making a REST request
'wpk.resource.request': {
  resourceName: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, unknown>;
  requestId: string;
}

// After successful response
'wpk.resource.response': {
  resourceName: string;
  method: string;
  path: string;
  status: number;
  data: unknown;
  requestId: string;
}

// On transport/server error
'wpk.resource.error': {
  resourceName: string;
  error: KernelError;
  requestId: string;
}

// During retry attempts
'wpk.resource.retry': {
  resourceName: string;
  attempt: number;
  nextDelay: number;
  error: KernelError;
  requestId: string;
}
```

### Cache Invalidation Events

Emitted when cache is invalidated (framework events use `wpk.*` namespace):

```typescript
'wpk.cache.invalidated': {
  keys: string[];
}
```

### Per-Resource CRUD Events

Each resource automatically gets event names (available via `resource.events`):

```typescript
import { testimonial } from './resources/testimonial';

// Event names use auto-detected namespace (e.g., plugin slug: "acme-blog")
testimonial.events.created; // 'acme-blog.testimonial.created'
testimonial.events.updated; // 'acme-blog.testimonial.updated'
testimonial.events.removed; // 'acme-blog.testimonial.removed'
```

**Note**: Event namespace is automatically detected from your plugin context. These events are defined but not yet emitted automatically. Full emission happens in Sprint 4 when Actions are implemented.

### Namespace Auto-Detection

WP Kernel automatically detects your plugin's namespace to brand events correctly:

```typescript
// Your plugin: "ACME Blog Pro" (slug: acme-blog)
export const post = defineResource<Post>({
	name: 'post', // Auto-detects namespace from plugin context
	routes: {
		/* ... */
	},
});

console.log(post.events.created); // 'acme-blog.post.created' ✓

// Override namespace when needed
export const customPost = defineResource<Post>({
	name: 'post',
	namespace: 'enterprise', // Explicit override
	routes: {
		/* ... */
	},
});

console.log(customPost.events.created); // 'enterprise.post.created' ✓
```

## Quick Examples

### Listen to Your Application Events

```typescript
import { addAction } from '@wordpress/hooks';

// Track your resource requests (uses your namespace)
addAction('acme-blog.resource.request', 'acme-blog/analytics', (payload) => {
	console.log(`${payload.method} ${payload.path}`);
});

// Handle your application errors
addAction('acme-blog.resource.error', 'acme-blog/error-handler', (payload) => {
	showNotice(`Request failed: ${payload.error.message}`, 'error');
});
```

### Listen to Cache Invalidation

```typescript
import { addAction } from '@wordpress/hooks';

// Listen to your application's cache events
addAction('acme-blog.cache.invalidated', 'acme-blog/debug', (payload) => {
	console.log('Cache invalidated:', payload.keys);
});
```

### Listen to Framework Events

```typescript
// Framework events use 'wpk' namespace
addAction('wpk.system.error', 'acme-blog/system-monitor', (payload) => {
	console.log('Framework error:', payload.error);
});
```

### Access Resource Event Names

```typescript
import { thing } from './resources/thing';

console.log(thing.events.created); // 'wpk.thing.created'
console.log(thing.events.updated); // 'wpk.thing.updated'
console.log(thing.events.removed); // 'wpk.thing.removed'

// These will be emitted by Actions in Sprint 4
```

## Coming Soon

### Sprint 3: Policy Events

- `wpk.policy.denied` - When client-side policy check fails

### Sprint 4: Action Events & Full Domain Events

- `wpk.action.start` - Action orchestration begins
- `wpk.action.complete` - Action completes successfully
- `wpk.action.error` - Action fails
- Full emission of `wpk.{resource}.created/updated/deleted` from Actions
- Canonical `events` registry export from `@geekist/wp-kernel/events`

### Sprint 8: Job Events

- `wpk.job.enqueued` - Background job queued
- `wpk.job.completed` - Job finished successfully
- `wpk.job.failed` - Job failed

### Sprint 9: PHP Bridge

- Event mirroring to PHP hooks (`wpk.bridge.*`)
- Sync vs Async execution patterns
- Payload serialization and guarantees

## Full Event Taxonomy

For the complete event taxonomy, payload contracts, PHP bridge mapping, versioning rules, and best practices, see:

**[Event Taxonomy Quick Reference](https://github.com/theGeekist/wp-kernel/blob/main/information/Event%20Taxonomy%20Quick%20Reference.md)**

This is the authoritative specification for the entire event system. The current implementation (Sprint 1) is the foundation; the full system will be completed by Sprint 9.

## See Also

- [Resources Guide](/guide/resources) - Resource transport and caching
- [Actions Guide](/guide/actions) - Write path orchestration (Sprint 4)
- [API Reference](/api/events) - Complete API docs

# API Contracts Reference

**One-glance reference for WP Kernel's stable contracts.** These are the guarantees you can rely on when building with the framework.

---

## Events Registry

All events follow the pattern: `{namespace}.{domain}.{action}`

### System Events (Framework-Emitted)

System events use the `wpk` namespace and are automatically emitted by the framework:

| Event Name                | Payload                                                   | Description               | PHP Bridged? |
| ------------------------- | --------------------------------------------------------- | ------------------------- | ------------ |
| **Resource Events**       |
| `wpk.resource.request`    | `{ resourceName, method, path, params?, requestId }`      | Before REST call          | No           |
| `wpk.resource.response`   | `{ resourceName, method, path, status, data, requestId }` | After successful response | No           |
| `wpk.resource.error`      | `{ resourceName, error: KernelError, requestId }`         | Transport/server error    | Yes (async)  |
| **Cache Events**          |
| `wpk.cache.invalidate`    | `{ keys: string[], resourceName? }`                       | Cache keys invalidated    | No           |
| `wpk.cache.hit`           | `{ key: string, resourceName }`                           | Cache hit                 | No           |
| `wpk.cache.miss`          | `{ key: string, resourceName }`                           | Cache miss                | No           |
| **Action Events**         |
| `wpk.action.start`        | `{ actionName, args, actionId }`                          | Action started            | No           |
| `wpk.action.complete`     | `{ actionName, result, actionId, duration }`              | Action completed          | No           |
| `wpk.action.error`        | `{ actionName, error: KernelError, actionId }`            | Action failed             | Yes (async)  |
| **Policy Events**         |
| `wpk.policy.denied`       | `{ policyKey, context, userId? }`                         | Policy check failed       | Yes (async)  |
| `wpk.policy.granted`      | `{ policyKey, context, userId? }`                         | Policy check passed       | No           |
| **Job Events** (Sprint 8) |
| `wpk.job.enqueued`        | `{ jobName, jobId, params }`                              | Job queued                | Yes (async)  |
| `wpk.job.started`         | `{ jobName, jobId }`                                      | Job execution started     | Yes (async)  |
| `wpk.job.completed`       | `{ jobName, jobId, result, duration }`                    | Job finished successfully | Yes (async)  |
| `wpk.job.failed`          | `{ jobName, jobId, error: KernelError }`                  | Job execution failed      | Yes (async)  |

### Domain Events (Resource-Defined)

Domain events are defined by your resources and use your plugin's namespace:

| Pattern                          | Example                 | Description               |
| -------------------------------- | ----------------------- | ------------------------- |
| `{namespace}.{resource}.created` | `acme-jobs.job.created` | Resource instance created |
| `{namespace}.{resource}.updated` | `acme-jobs.job.updated` | Resource instance updated |
| `{namespace}.{resource}.removed` | `acme-jobs.job.removed` | Resource instance removed |

**Namespace Auto-Detection:**

- ✓ **90% case**: Detected from WordPress plugin headers (e.g., "ACME Jobs Pro" → `acme-jobs`)
- ⚙️ **9% case**: Explicit override via `namespace` option
- 🔧 **1% case**: Framework default (`wpk`) for internal events

**Example:**

```typescript
import { defineResource } from '@geekist/wp-kernel';

const job = defineResource<Job>({
	name: 'job',
	routes: {
		/* ... */
	},
});

// Auto-namespaced events available:
job.events.created; // → 'acme-jobs.job.created'
job.events.updated; // → 'acme-jobs.job.updated'
job.events.removed; // → 'acme-jobs.job.removed'
```

### Event Scope

| Scope      | Default? | Behavior                                        | Use Case                                     |
| ---------- | -------- | ----------------------------------------------- | -------------------------------------------- |
| `crossTab` | ✓        | Broadcasts via BroadcastChannel API to all tabs | Sync state across tabs (jobs, notifications) |
| `tabLocal` |          | Stays within current tab                        | UI-only updates, transient state             |

**Configure per action:**

```typescript
defineAction(
	'Job.Create',
	async (ctx, { data }) => {
		// ... implementation
	},
	{ scope: 'crossTab' }
); // explicit (default)

defineAction(
	'UI.UpdateSidebar',
	async (ctx, { data }) => {
		// ... implementation
	},
	{ scope: 'tabLocal' }
); // tab-local only
```

---

## Error Taxonomy

All errors extend `KernelError` and follow a consistent structure:

### Error Codes & Types

| Error Class         | Code           | HTTP Status | Description              | Fields                                        |
| ------------------- | -------------- | ----------- | ------------------------ | --------------------------------------------- |
| `TransportError`    | `Transport`    | 0, 4xx, 5xx | Network/fetch failure    | `status`, `path`, `method`                    |
| `ServerError`       | `Server`       | 400-599     | REST returned WP_Error   | `status`, `path`, `data.code`, `data.message` |
| `PolicyDeniedError` | `PolicyDenied` | 403         | Capability check failed  | `policyKey`, `context`, `userId?`             |
| `ValidationError`   | `Validation`   | 400         | Schema validation failed | `errors: Array<{ path, message }>`            |
| `TimeoutError`      | `Timeout`      | 408         | Request/job timeout      | `timeout`, `elapsed`                          |
| `DeveloperError`    | `Developer`    | -           | API misuse               | `hint`                                        |

### Error Structure

```typescript
interface KernelError extends Error {
	code: ErrorCode; // Stable identifier
	message: string; // Human-readable description
	data?: ErrorData; // Type-specific fields
	context?: ErrorContext; // Where/when error occurred
	requestId?: string; // Correlation ID
	toJSON(): SerializedError; // Wire format
}
```

### Examples

```typescript
// Transport Error (network failure)
new TransportError({
	message: 'Failed to fetch resource',
	status: 0,
	path: '/wpk/v1/jobs/123',
	method: 'GET',
	requestId: 'req_abc123',
});

// Server Error (WP_Error response)
new ServerError({
	message: 'Invalid job data',
	status: 400,
	path: '/wpk/v1/jobs',
	data: {
		code: 'invalid_job_title',
		message: 'Title must be at least 3 characters',
	},
	requestId: 'req_xyz789',
});

// Policy Denied Error
new PolicyDeniedError({
	message: 'User lacks required capability',
	policyKey: 'jobs.manage',
	context: { resource: 'job', action: 'create' },
	userId: 42,
});
```

### Error Handling

```typescript
import { CreateJob } from '@/app/actions/Job/Create';

try {
	await CreateJob({ data: formData });
} catch (error) {
	if (error instanceof PolicyDeniedError) {
		showNotice('You do not have permission to create jobs');
	} else if (error instanceof ValidationError) {
		displayFieldErrors(error.data.errors);
	} else if (error instanceof KernelError) {
		reporter.error(error); // Logs + optional notice
	}
}
```

---

## Cache Key Patterns

Cache keys follow WordPress data store conventions: `[storeName, operation, ...params]`

### Standard Patterns

| Pattern          | Example                               | Description        |
| ---------------- | ------------------------------------- | ------------------ |
| List (no params) | `['job', 'list']`                     | All items          |
| List (filtered)  | `['job', 'list', { status: 'open' }]` | Filtered list      |
| Single item      | `['job', 'item', 123]`                | Specific instance  |
| Related data     | `['job', 'applications', 123]`        | Related collection |

### Invalidation Rules

**Do:**

- ✓ Invalidate exact keys when possible: `thing.invalidate(['thing', 'item', 123])`
- ✓ Use patterns for related data: `thing.cache.invalidate.matching(/^thing,list/)`
- ✓ Invalidate after mutations: `ctx.invalidate()` in actions
- ✓ Use `invalidateAll()` for complex dependencies

**Don't:**

- ✗ Over-invalidate (kills cache benefits)
- ✗ Forget to invalidate after writes (stale data)
- ✗ Rely on cache for authorization (always re-check policies)

### Cache Lifecycle Helpers

```typescript
import { thing } from '@/app/resources/thing';

// Invalidate specific key
thing.invalidate(['thing', 'list']);

// Invalidate by pattern
thing.cache.invalidate.matching(/^thing,list/);

// Invalidate all thing data
thing.cache.invalidate.all();

// Prefetch for performance
await thing.prefetch({ id: 123 });

// Access cache directly (advanced)
const cached = thing.cache.get(['thing', 'item', 123]);
thing.cache.set(['thing', 'item', 123], data);
thing.cache.delete(['thing', 'item', 123]);
```

### Cache Coordination in Actions

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { job } from '@/app/resources/job';

export const CreateJob = defineAction('Job.Create', async (ctx, { data }) => {
	const created = await job.create(data);

	// Invalidate list cache so new item appears
	ctx.invalidate(['job', 'list']);

	// Optionally invalidate filtered variants
	ctx.invalidate(['job', 'list', { status: 'open' }]);

	return created;
});
```

---

## Back-Compat Guarantees (Pre-1.0)

### What Won't Break

✓ **Event names**: Stable across 0.x releases  
✓ **Error codes**: `PolicyDenied`, `Transport`, etc. won't change  
✓ **Cache key patterns**: `[store, operation, ...params]` structure preserved  
✓ **Core API signatures**: `defineResource`, `defineAction`, `definePolicy`

### What May Change

⚠️ **Event payload additions**: New fields may be added (non-breaking)  
⚠️ **Error field additions**: New optional fields in error data  
⚠️ **Internal implementation**: Cache strategies, transport details

### Deprecation Process

1. **Notice phase**: `@wordpress/deprecated` warnings in console
2. **Migration period**: Old + new APIs coexist for 2 minor versions
3. **Codemod (when feasible)**: Automated migration script provided
4. **Removal**: Only at major version bump (0.x → 1.0)

### Semver Interpretation (0.x)

- **0.x.0** (minor): New features, possible breaking changes in edge cases
- **0.x.y** (patch): Bug fixes, performance improvements, non-breaking additions

**After 1.0:**

- Strict semver: breaking changes only in majors (1.x → 2.0)

---

## PHP Bridge Mapping (Sprint 9)

JavaScript events can be mirrored to PHP actions for legacy integrations.

### Mapping Rules

| JS Event             | PHP Action                    | Execution | Available |
| -------------------- | ----------------------------- | --------- | --------- |
| `wpk.resource.error` | `wpk.bridge.resource.error`   | Async     | Sprint 9  |
| `wpk.action.error`   | `wpk.bridge.action.error`     | Async     | Sprint 9  |
| `wpk.policy.denied`  | `wpk.bridge.policy.denied`    | Async     | Sprint 9  |
| `wpk.job.enqueued`   | `wpk.bridge.job.enqueued`     | Async     | Sprint 9  |
| `acme.job.created`   | `wpk.bridge.acme.job.created` | Async     | Sprint 9  |

### Bridge Guarantees

- ✓ All bridged events are **async** (non-blocking)
- ✓ Payload is JSON-serialized (primitives only)
- ✓ `requestId` preserved for correlation
- ✗ No sync PHP callbacks (< 100ms budget enforced)

### PHP Usage (Sprint 9)

```php
// Listen to bridged JS events in PHP
add_action('wpk.bridge.acme.job.created', function($payload) {
  $job_id = $payload['id'];
  // Send notification, trigger webhook, etc.
}, 10, 1);
```

---

## Additional Resources

- **[Event Taxonomy (Internal)]**: Full event documentation with examples
- **[Actions Guide]**: Write-path orchestration patterns
- **[Policies Guide]**: Capability gates and authorization
- **[Error Handling Guide]**: Best practices for error recovery
- **[Cache Guide]**: Performance optimization strategies

---

**Last Updated**: October 6, 2025 (Sprint 4.5 completion)  
**Next Review**: Sprint 9 (PHP Bridge implementation)

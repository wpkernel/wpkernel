# WordPress Data Integration - Implementation Plan

> **Context**: Sprint 4 Extension to add first-class `@wordpress/data` parity via registry plugins and store wrappers.
>
> **Current Status**: Redux middleware complete (Sprint 4); event system complete (Sprint 4); need native WP integration layer.
>
> **Roadmap**: See [[Roadmap PO • v1.0]] § Sprint 4 (Actions) for context.
>
> **Related**: [[Policy]] for policy plugin integration (Sprint 3 extension).

---

## What We Already Have ✅

### 1. Event System (COMPLETE - Sprint 4)

**Location**: `packages/kernel/src/actions/context.ts`

**Capabilities**:

- ✅ **WordPress Hooks integration** - `wp.hooks.doAction()` emission
- ✅ **BroadcastChannel** - Cross-tab event coordination
- ✅ **PHP Bridge hooks** - Via runtime adapter (`runtime.bridge.emit()`)
- ✅ **Scoping** - `crossTab` (default) vs `tabLocal` events
- ✅ **Lifecycle events** - `wpk.action.start/complete/error`
- ✅ **Domain events** - Via `ctx.emit(eventName, payload)`

**Implementation Details**:

```typescript
// Lifecycle events - automatic
emitLifecycleEvent({
	phase: 'start' | 'complete' | 'error',
	actionName,
	requestId,
	namespace,
	scope,
	bridged,
	timestamp,
});
// → Emits to: wp.hooks, runtime.bridge, BroadcastChannel

// Domain events - via ctx.emit()
ctx.emit('job.created', { id: 123 });
// → Emits to same channels with same scoping rules
```

**Multi-Channel Distribution**:

1. **WordPress Hooks** - Always emits if `window.wp.hooks` available
2. **PHP Bridge** - Only if `bridged: true` AND `runtime.bridge.emit` exists
3. **BroadcastChannel** - Only if `scope: 'crossTab'`

**What's Missing**: Nothing! Event system is complete and production-ready.

---

### 2. Redux Middleware (COMPLETE - Sprint 4)

**Location**: `packages/kernel/src/actions/middleware.ts`

**Capabilities**:

- ✅ **Redux-compatible middleware** - `createActionMiddleware()`
- ✅ **Action envelopes** - `invokeAction(action, args, meta)`
- ✅ **Type-safe dispatch** - Full TypeScript inference
- ✅ **Non-blocking** - Standard Redux actions pass through
- ✅ **Async/await** - Returns action promises directly

**Implementation Details**:

```typescript
const middleware = createActionMiddleware();
const store = createStore(reducer, applyMiddleware(middleware));

// Dispatch actions
const envelope = invokeAction(CreateJob, { data });
const result = await store.dispatch(envelope);
```

**What's Missing**: Native `@wordpress/data` integration (need registry plugin wrapper).

---

### 3. Action Context (COMPLETE - Sprint 4)

**Location**: `packages/kernel/src/actions/context.ts`

**Capabilities**:

- ✅ **Full ActionContext** - `.emit()`, `.invalidate()`, `.jobs`, `.policy`, `.reporter`
- ✅ **Runtime adapter** - Pluggable via `global.__WP_KERNEL_ACTION_RUNTIME__`
- ✅ **Namespace resolution** - Auto-detects plugin namespace
- ✅ **Request correlation** - Unique `requestId` per invocation

**What's Missing**: Nothing! Context is complete.

---

### 4. Cache Invalidation (COMPLETE - Sprint 1)

**Location**: `packages/kernel/src/resource/cache.ts`

**Capabilities**:

- ✅ **Pattern-based invalidation** - `invalidate(['post', 'post:list'])`
- ✅ **Event emission** - `cache.invalidated` event (via `doAction`)
- ✅ **Store integration** - Works with `@wordpress/data` stores

**What's Missing**: Nothing! Cache system is complete.

---

## What We Need to Build 🚧

### 1. Registry Plugin Wrapper (`useKernel`)

**Purpose**: Decorate `@wordpress/data` registry with kernel middleware and plugins.

**New File**: `packages/kernel/src/data/registry.ts`

**API Surface**:

```typescript
import type { Registry } from '@wordpress/data';

export function useKernel(
	registry: Registry,
	options?: {
		middleware?: any[];
		reporter?: Reporter;
		namespace?: string;
		policies?: PolicyMap;
	}
): () => void; // Returns cleanup function
```

**Implementation Strategy**:

```typescript
export function useKernel(registry: Registry, opts = {}) {
	// 1. Install action middleware
	registry.__experimentalUseMiddleware(() => [
		createActionMiddleware({
			reporter: opts.reporter,
			namespace: opts.namespace,
		}),
		...(opts.middleware ?? []),
	]);

	// 2. Install events → notices bridge plugin
	registry.__experimentalUseMiddleware(() => [
		kernelEventsPlugin({
			reporter: opts.reporter,
			namespace: opts.namespace,
		}),
	]);

	// 3. (Optional) Install policy plugin
	if (opts.policies) {
		registry.__experimentalUseMiddleware(() => [
			kernelPolicyPlugin(opts.policies),
		]);
	}

	// Return cleanup function
	return () => {
		// Clean up if needed for hot reload
	};
}
```

**Effort**: 4-6 hours (implementation + tests + docs)

---

### 2. Events → Notices Bridge Plugin (`kernelEventsPlugin`)

**Purpose**: Automatically convert action errors to `core/notices` snackbars.

**New File**: `packages/kernel/src/data/plugins/events.ts`

**API Surface** (Internal - used by `useKernel`):

```typescript
function kernelEventsPlugin(options: {
	reporter?: Reporter;
	namespace?: string;
}): ReduxMiddleware;
```

**Implementation Strategy**:

```typescript
export function kernelEventsPlugin({ reporter, namespace }) {
	return (store) => (next) => (action) => {
		const result = next(action);

		// Listen for wpk.action.error events
		const hooks = getHooks();
		if (hooks) {
			hooks.addAction('wpk.action.error', 'kernel/notices', (event) => {
				// Map error to notice severity
				const severity = mapErrorToSeverity(event.error);

				// Create notice in core/notices store
				store.dispatch({
					type: 'CREATE_NOTICE',
					notice: {
						id: event.requestId,
						status: severity,
						content: event.error.message,
						isDismissible: true,
					},
				});

				// Also report to reporter
				if (reporter) {
					reporter.error(event.error.message, {
						action: event.actionName,
						requestId: event.requestId,
					});
				}
			});
		}

		return result;
	};
}

function mapErrorToSeverity(
	error: KernelError
): 'success' | 'info' | 'warning' | 'error' {
	switch (error.code) {
		case 'PolicyDenied':
			return 'warning';
		case 'ValidationError':
			return 'info';
		case 'TransportError':
		case 'ServerError':
		default:
			return 'error';
	}
}
```

**Effort**: 3-4 hours (implementation + tests + docs)

**Note**: This leverages the EXISTING event system - we're just adding a bridge to `core/notices`.

---

### 3. Store Factory Wrapper (`registerKernelStore`)

**Purpose**: One-call store registration with middleware baked in.

**New File**: `packages/kernel/src/data/store.ts`

**API Surface**:

```typescript
export function registerKernelStore<Key extends string>(
	key: Key,
	config: {
		reducer: any;
		actions?: any;
		selectors?: any;
		resolvers?: any;
		controls?: any;
		middleware?: any[];
		devtoolsName?: string;
	}
): Store<Key>;
```

**Implementation Strategy**:

```typescript
import { createReduxStore, register } from '@wordpress/data';

export function registerKernelStore(key, config) {
	const store = createReduxStore(key, {
		...config,
		__experimentalUseMiddleware: () => [...(config.middleware ?? [])],
	});

	register(store);
	return store;
}
```

**Effort**: 2-3 hours (implementation + tests + docs)

**Note**: This is a thin wrapper - middleware is already configured via `useKernel`.

---

### 4. Policy Plugin (`kernelPolicyPlugin`) - OPTIONAL

**Purpose**: Inject policy context into store.

**New File**: `packages/kernel/src/data/plugins/policy.ts`

**Status**: 🚧 Can defer to Sprint 3 (Policy Layer)

**Effort**: 2-3 hours when policy system is ready

---

### 5. Editor Plugin Wrapper (`registerKernelPlugin`) - OPTIONAL

**Purpose**: Wrap `@wordpress/plugins` with Kernel providers.

**New File**: `packages/kernel/src/ui/plugin.tsx` (or in `@geekist/wp-kernel-ui`)

**Status**: 🚧 Can defer to Sprint 5 (UI Layer)

**Effort**: 6-8 hours including React context setup

---

## Implementation Plan

**Milestone**: Sprint 4 Extension (Do NOW)

**Goal**: Provide first-class WordPress data integration so Actions work natively with `@wordpress/data` stores.

**What exists** (from Sprint 4 Actions):

- ✅ Event system (`actions/context.ts`): BroadcastChannel, wp.hooks, PHP bridge
- ✅ Redux middleware (`actions/middleware.ts`): `createActionMiddleware()`, `invokeAction()`
- ✅ ActionContext: `.emit()`, `.invalidate()`, `.jobs`, `.policy`, `.reporter`

**What's needed** (Sprint 4 extension - 2 days):

- ✅ `useKernel(registry)` - Registry plugin
- ✅ `registerKernelStore()` - Store wrapper with actions DSL
- ✅ `kernelEventsPlugin()` - Error → notices bridge

**Package Structure**:

```
packages/kernel/src/
  data/
    registry.ts       # useKernel
    store.ts          # registerKernelStore
    plugins/
      events.ts       # kernelEventsPlugin
    index.ts          # exports
```

**Exports** (`packages/kernel/src/data/index.ts`):

```typescript
export { useKernel } from './registry';
export { registerKernelStore } from './store';
export type { KernelRegistryOptions } from './registry';
```

**Main entry** (`packages/kernel/src/index.ts`):

```typescript
// Add to existing exports
export * from './data';
```

---

## Implementation Scope

### Sprint 4 Extension (Do NOW) - 2 days

> **Roadmap Link**: [[Roadmap PO • v1.0]] § Sprint 4 (Actions layer completion)

**Scope**: Complete `@wordpress/data` integration to provide first-class WordPress parity.

**Deliverables**:

1. ✅ `useKernel()` registry plugin - `packages/kernel/src/data/registry.ts`
2. ✅ `kernelEventsPlugin()` error → notices bridge - `packages/kernel/src/data/plugins/events.ts`
3. ✅ `registerKernelStore()` wrapper - `packages/kernel/src/data/store.ts`
4. ✅ Unit tests - `packages/kernel/src/data/__tests__/`
5. ✅ Integration tests - Real `@wordpress/data` registry tests
6. ✅ API docs - `docs/api/data.md` (new file)
7. ✅ Guide docs - Update `docs/guide/actions.md` with WordPress integration patterns
8. ✅ Update showcase to use new pattern

**Package Structure**:

```
packages/kernel/src/
  data/
    registry.ts       # useKernel
    store.ts          # registerKernelStore
    plugins/
      events.ts       # kernelEventsPlugin
    index.ts          # exports
  index.ts            # add: export * from './data'
```

---

### Sprint 5 or 6 (UI/Block Integration) - 1.5 days

> **Roadmap Link**: [[Roadmap PO • v1.0]] § Sprint 5 (Bindings & Interactivity)

**Scope**: Editor plugin wrapper with React context providers.

**Deliverables**:

1. `KernelProviders` React component - `packages/kernel/src/ui/plugin.tsx` or `@geekist/wp-kernel-ui`
2. `registerKernelPlugin()` wrapper - Wraps `@wordpress/plugins`
3. SlotFill integration
4. E2E tests in showcase editor
5. Update `docs/guide/wordpress-integration.md` with editor plugin patterns

**Defer until**: Sprint 5 or 6 when UI components are in focus.

---

### Sprint 3 (Policy Layer) - 0.5 day

> **Roadmap Link**: [[Roadmap PO • v1.0]] § Sprint 3 (Policies)

**Scope**: Policy plugin for store-level capability hints.

**Deliverables**:

1. `kernelPolicyPlugin()` - `packages/kernel/src/data/plugins/policy.ts`
2. Integration with policy system
3. Update `docs/api/data.md` with policy plugin usage

**Defer until**: Sprint 3 when policy layer ships.

---

## Key Architecture Notes

### Events System is Complete ✅

**We DO NOT need to build**:

- ❌ Event emission infrastructure (already exists)
- ❌ BroadcastChannel setup (already exists)
- ❌ WordPress Hooks integration (already exists)
- ❌ PHP Bridge hooks (already exists in runtime adapter pattern)
- ❌ Cross-tab vs tab-local scoping (already implemented)

**We ONLY need to build**:

- ✅ Bridge from existing events → `core/notices` store
- ✅ Wrapper to install middleware into `@wordpress/data` registry
- ✅ Store factory helper

### Middleware is Complete ✅

**We DO NOT need to build**:

- ❌ Redux middleware (`createActionMiddleware`)
- ❌ Action envelopes (`invokeAction`)
- ❌ Type safety and dispatch logic

**We ONLY need to build**:

- ✅ Helper to install middleware into `@wordpress/data` (`useKernel`)

### Runtime Adapter Pattern is Complete ✅

**We DO NOT need to build**:

- ❌ Runtime configuration system (`global.__WP_KERNEL_ACTION_RUNTIME__`)
- ❌ Reporter interface
- ❌ Jobs interface
- ❌ Policy interface
- ❌ Bridge interface

**These are already pluggable** - host apps set the runtime adapter.

---

## Testing Strategy

### Unit Tests (6 hours)

```typescript
// packages/kernel/src/data/__tests__/registry.test.ts
describe('useKernel', () => {
	it('installs middleware into registry');
	it('installs events plugin');
	it('optionally installs policy plugin');
	it('returns cleanup function');
});

// packages/kernel/src/data/__tests__/store.test.ts
describe('registerKernelStore', () => {
	it('creates and registers store');
	it('passes middleware to store config');
});

// packages/kernel/src/data/plugins/__tests__/events.test.ts
describe('kernelEventsPlugin', () => {
	it('listens to wpk.action.error events');
	it('creates notices with correct severity');
	it('reports errors to reporter');
});
```

### Integration Tests (3 hours)

```typescript
// Test with real @wordpress/data registry
describe('Data Integration', () => {
	it('actions dispatch through registry');
	it('errors create notices in core/notices');
	it('lifecycle events emit correctly');
});
```

### E2E Tests (2 hours)

```typescript
// In showcase app
test('action error shows notice in UI', async ({ page }) => {
	await triggerActionError();
	await expect(page.locator('.notice-error')).toBeVisible();
});
```

---

## Documentation

### API Docs (`docs/api/data.md`) - 2 hours

```markdown
# Data Integration API

## useKernel(registry, options)

Install WP Kernel behavior into @wordpress/data registry.

## registerKernelStore(key, config)

Create and register a store with kernel middleware.

## Example: Bootstrap

...

## Example: Custom Middleware

...
```

### Guide (`docs/guide/wordpress-data.md`) - 3 hours

```markdown
# WordPress Data Integration

## Why @wordpress/data?

## Setting Up

## Registering Stores

## Error Handling & Notices

## Custom Middleware

## Migration from Redux
```

### Internal Docs - 1 hour

Update:

- ✅ **Extensibility Architecture.md** - add data layer section
- ✅ **Actions.md** - reference data integration

---

## Risk Assessment

### ✅ Low Risk

- Registry wrapper (`useKernel`) - straightforward `__experimentalUseMiddleware`
- Store factory - thin wrapper over existing WP APIs
- Events bridge - leverages existing event system

### ⚠️ Medium Risk

- `core/notices` store interaction - need to verify dispatch format
- Multiple registry instances - ensure middleware doesn't leak
- Hot reload cleanup - verify uninstaller works correctly

### Mitigation

- Test with real `@wordpress/data` early
- Validate against latest Gutenberg
- Test in showcase app with editor context

---

## Recommendation

**✅ Proceed with Phase 1 NOW** (2 days)

**Why**:

1. Natural extension of Sprint 4 work
2. Completes the data layer story
3. Unblocks WordPress-native patterns
4. Low implementation risk (building on complete foundation)
5. High value - first-class `@wordpress/data` parity

**What Makes This Easy**:

- Event system is COMPLETE ✅
- Middleware is COMPLETE ✅
- Runtime adapter is COMPLETE ✅
- We're just wrapping existing APIs ✅

**Defer**:

- Editor plugin wrapper → Sprint 5 (UI work)
- Policy plugin → Sprint 3 (policy system)

---

## Success Criteria

### Phase 1 Complete When:

- [ ] `useKernel()` installs middleware in registry
- [ ] `kernelEventsPlugin()` converts errors → notices
- [ ] `registerKernelStore()` creates stores with kernel behavior
- [ ] Unit tests pass (≥95% coverage)
- [ ] Integration tests pass (real `@wordpress/data`)
- [ ] Showcase app uses new pattern
- [ ] API docs published
- [ ] No breaking changes to existing middleware API

---

## Related Documentation

- **[[Actions]]** - Complete actions layer including middleware
- **[[Extensibility Architecture]]** - Seven pillars of extensibility
- **[[Event Taxonomy Quick Reference]]** - Event system (already complete)

---

**Last Updated**: 5 October 2025
**Status**: Ready for implementation (Phase 1)

For the following task, please remember that we have a `types/globals.d.ts`, a `tests/test-globals.d.ts` and stubs in `tests/test-utils/wp.ts`. These are extremely useful for typing and testing.

We have 2 new hook implementations before we wrap up this PR. Please implement the following:

# Sprint 5 Spec - `usePrefetcher` & `useAction`

> **Scope**: UI package only (`@geekist/wp-kernel-ui`).  
> **Target WP**: ≥ 6.8+.  
> **Principles**: Thin React wrappers over existing Kernel APIs; reuse all core functionality from [`packages/kernel/src/resource/define.ts`](../packages/kernel/src/resource/define.ts) and [`packages/kernel/src/actions/define.ts`](../packages/kernel/src/actions/define.ts).

---

## Shared Goals

- **Predictability**: render hooks (`useGet`, `useList`) remain deterministic; side‑effectful work is explicit.
- **Observability**: leverage existing Reporter/event infrastructure-no new event systems.
- **Parity**: React ergonomics mirror the imperative Kernel APIs (`prefetchGet`, `prefetchList`, `invokeAction`) for classic screens.
- **Quality bar**: unit tests ≥ **90%** line/branch coverage for new code.
- **Reuse**: DO NOT REINVENT WHAT EXISTS IN KERNEL-wrap, don't reimplement.

---

## `usePrefetcher` (and friends)

### Why

Prefetching is a **navigation hint**, not a render requirement. We warm caches ahead of likely interactions without changing the current UI. Kernel already provides `prefetchGet` and `prefetchList` via `defineResource()` (see [`packages/kernel/src/resource/define.ts`](../packages/kernel/src/resource/define.ts)). This hook provides thin React adapters.

### Benefits

- **Separation of concerns**: render hooks stay pure; prefetch is advisory.
- **Performance**: hover/visibility triggers + WordPress Data's built-in dedupe minimise waste.
- **Parity**: mirrors existing `prefetch*` Kernel functions for non‑React flows.
- **Safety**: SSR/no‑registry handled by kernel (throws `DeveloperError` only if WordPress Data unavailable).
- **Type safety**: Accepts `ResourceObject` directly-no registry needed, generic types flow through.

### API

```ts
usePrefetcher<TRecord>(resource: ResourceObject<TRecord>): {
  prefetchGet: (id: string | number) => void;
  prefetchList: (query?: Record<string, any>) => void;
}

useHoverPrefetch(
  ref: React.RefObject<HTMLElement>,
  fn: () => void,
  opts?: { delayMs?: number; once?: boolean }
): void

useVisiblePrefetch(
  ref: React.RefObject<Element>,
  fn: () => void,
  opts?: { rootMargin?: string; once?: boolean }
): void

useNextPagePrefetch<TRecord>(
  resource: ResourceObject<TRecord>,
  currentQuery: Record<string, any>,
  opts?: { computeNext?: (q: any) => any; when?: boolean }
): void
```

### Behaviour

- `usePrefetcher`
    - **Wraps** Kernel's existing `resource.prefetchGet` / `resource.prefetchList` (see [`packages/kernel/src/resource/define.ts`](../packages/kernel/src/resource/define.ts)).
    - Accepts `ResourceObject<TRecord>` directly (returned from `defineResource()`).
    - Kernel already handles:
        - WordPress Data `resolveSelect()` for deduplication
        - SSR/no‑registry errors (throws `DeveloperError` if WordPress Data unavailable)
        - Lazy store registration
    - Hook responsibility: provide stable function references across renders.
- `useHoverPrefetch`
    - On `mouseenter`, waits `delayMs` (**150ms** default); cancels on quick leave.
    - `once` default **true** (fires once per mount).
- `useVisiblePrefetch`
    - Uses `IntersectionObserver` with `rootMargin` (**"200px"** default).
    - Fallback to throttled scroll listener when IO unavailable.
    - `once` default **true**.
- `useNextPagePrefetch`
    - Derives `nextQuery` via `computeNext` (default `{ ...q, page: (q.page ?? 1) + 1 }`).
    - Triggers after current list settles (component decides the `when` flag).

### Usage

**Detail on link hover**

```tsx
import { JobResource } from '@/resources/Job';

function JobLink({ id }: { id: number }) {
	const { prefetchGet } = usePrefetcher(JobResource);
	const ref = useRef<HTMLAnchorElement>(null);
	useHoverPrefetch(ref, () => prefetchGet(id), { delayMs: 200 });
	return (
		<a ref={ref} href={`/admin/jobs/${id}`}>
			View
		</a>
	);
}
```

**List on card visibility**

```tsx
import { JobResource } from '@/resources/Job';

const ref = useRef<HTMLDivElement>(null);
const { prefetchList } = usePrefetcher(JobResource);
useVisiblePrefetch(ref, () => prefetchList({ status: 'open', page: 1 }));
return (
	<div ref={ref}>
		<JobsSummary />
	</div>
);
```

**Next page after list settles**

```tsx
import { JobResource } from '@/resources/Job';

function JobsList({ query }: { query: any }) {
	const isSettled = !loading && !error; // from your list state
	useNextPagePrefetch(JobResource, query, { when: isSettled });
	// render DataViews/fallback…
}
```

### Acceptance Criteria

**Functional**

- `usePrefetcher(resource)` accepts `ResourceObject<TRecord>` and returns **stable** `prefetchGet`/`prefetchList` references across renders.
- Calls delegate to Kernel's `resource.prefetchGet` / `resource.prefetchList` methods.
- `useHoverPrefetch`: debounced trigger; cancelled on fast leave; honours `once`.
- `useVisiblePrefetch`: triggers near‑visibility with default margin; IO fallback works; honours `once`.
- `useNextPagePrefetch`: accepts `ResourceObject`, defaults to `{ page+1 }`; respects `when` flag.

**Tests (Jest)** - **≥ 90%** coverage

- Stable references: multiple renders with same `resource` return identical function refs.
- Hover: enter→leave before delay ⇒ no call; enter and hold ⇒ one call; `once:false` allows re‑entry calls.
- Visible: fires once on entry; with `once:false`, re‑fires after leave+re‑enter; fallback path covered.
- Next page: from `{ page: 3 }` prefetches `{ page: 4 }`; `when:false` prevents call.

**Docs**

- `docs/api/`: signature, params, link to [`packages/kernel/src/resource/define.ts`](../packages/kernel/src/resource/define.ts).
- `docs/guide/`: patterns (hover/visible/next‑page), performance tips.
- `README.md` (UI package): short "Prefetching" section linking to the above.

**Non‑goals**

- No automatic prefetch inside `useGet`/`useList`.
- No new event emission (kernel already handles via WordPress Data).
- No custom deduplication (WordPress Data `resolveSelect` handles this).
- No string-based resource registry (use direct `ResourceObject` references).

---

## `useAction`

### Why

While components can call `invokeAction` directly via Redux dispatch (see [`packages/kernel/src/actions/middleware.ts`](../packages/kernel/src/actions/middleware.ts)), UIs need consistent lifecycle management, cancellation, and state tracking. `useAction` provides a standard React interface over Kernel's `defineAction` primitives (see [`packages/kernel/src/actions/define.ts`](../packages/kernel/src/actions/define.ts)).

### Benefits

- **Ergonomics**: one uniform state machine for all actions.
- **Race safety**: built‑in concurrency policies (switch/queue/parallel/drop).
- **Reuse**: leverages Kernel's `invokeAction` and middleware-no reimplementation.
- **Observability**: action lifecycle events already emitted by kernel-hook just tracks local UI state.

### API

```ts
useAction<TInput = unknown, TResult = unknown>(
  action: string | DefinedAction<TInput, TResult>,
  options?: {
    concurrency?: 'parallel' | 'switch' | 'queue' | 'drop';
    dedupeKey?: (input: TInput) => string;
    autoInvalidate?: (result: TResult, input: TInput) => CacheKeyPattern[] | false;
  }
): {
  run: (input: TInput) => Promise<TResult>;
  status: 'idle' | 'running' | 'success' | 'error';
  error?: KernelError;
  result?: TResult;
  inFlight: number;
  cancel: () => void;
  reset: () => void;
}
```

**Note on Cancellation**: `cancel()` provides **hook-level cancellation only**. It transitions the hook state to `idle` and prevents promise resolution from updating state. The underlying kernel action may have already started executing and cannot be aborted mid-execution. Native kernel-level cancellation (via `AbortSignal` propagation to `ActionContext`) is deferred to a future sprint (6.5+).

### Semantics

- **Status** reflects the local hook instance only (global action events via kernel).
- **Execution**: Calls `invokeAction` (see [`packages/kernel/src/actions/middleware.ts`](../packages/kernel/src/actions/middleware.ts)) → Redux middleware → `defineAction` wrapper.
- **Concurrency**
    - `parallel`: all calls run; `inFlight` tracks count.
    - `switch`: starting a new call cancels hook state tracking for the previous one.
    - `queue`: calls execute FIFO.
    - `drop`: ignore new calls while one is running (return the current promise).
- **Dedupe**: when `dedupeKey(input)` matches an in‑flight call, return that promise instead of starting a new one.
- **Cancellation**: `cancel()` transitions hook state to `idle` (see **Note on Cancellation** above for kernel limitations).
- **Errors**: `run()` rejects with `KernelError` (kernel already normalizes in `defineAction`); hook sets `status:'error'` and `error`.
- **Invalidation**: on success, hook calls `ctx.invalidate()` from `ActionContext` (see [`packages/kernel/src/actions/types.ts`](../packages/kernel/src/actions/types.ts)) with patterns returned by `autoInvalidate` callback.
- **SSR**: safe to import; `run()` is client‑only.

### Usage

**Basic submit**

```tsx
const { run, status } = useAction<{ title: string }, Job>('job.create', {
	autoInvalidate: () => [['job', 'list']], // Invalidate all job lists
});
<Button
	disabled={status === 'running'}
	onClick={() => run({ title }).catch(() => {})}
>
	{status === 'running' ? 'Saving…' : 'Save'}
</Button>;
```

**Typeahead (latest wins)**

```tsx
const { run, cancel } = useAction<string, Suggestion[]>('search.suggest', {
	concurrency: 'switch',
	dedupeKey: (q) => q.trim(),
});
useEffect(() => {
	if (!q) {
		cancel();
		return;
	}
	const id = setTimeout(() => run(q), 150);
	return () => clearTimeout(id);
}, [q]);
```

**Bulk queue**

```tsx
const { run } = useAction<Id, void>('job.archive', { concurrency: 'queue' });
async function archiveSelected(ids: Id[]) {
	for (const id of ids) await run(id);
}
```

**Conditional invalidation**

```tsx
const { run } = useAction<JobInput, Job>('job.update', {
	autoInvalidate: (result, input) =>
		result.status === 'open'
			? [
					['job', 'list', 'open'], // Invalidate open jobs list
					['job', 'get', input.id], // Invalidate this specific job
				]
			: false, // Don't invalidate if not open
});
```

**With policy gating**

```tsx
const { can } = usePolicy();
const { run, status } = useAction('job.delete', { concurrency: 'drop' });
<Button
	disabled={!can('jobs.manage') || status === 'running'}
	onClick={() => run(jobId)}
>
	Delete
</Button>;
```

### Acceptance Criteria

**Functional**

- Status transitions: `idle → running → success|error`; `reset()` returns to `idle` and clears `error`/`result`.
- Execution: calls `invokeAction` via Redux dispatch (see [`packages/kernel/src/actions/middleware.ts`](../packages/kernel/src/actions/middleware.ts)).
- Concurrency policies behave as specified for `parallel|switch|queue|drop`.
- Dedupe: identical `dedupeKey` inputs share one in‑flight promise.
- Cancellation: `cancel()` prevents in-flight promise from updating hook state; reverts to `idle` (no separate `cancelled` state).
- Auto‑invalidate: calls `ctx.invalidate()` with `CacheKeyPattern[]` after successful completion; not on error.

**Tests (Jest)** - **≥ 90%** coverage

- Transition tests for success/error and `reset()`.
- Concurrency behaviour for all four modes.
- Dedupe: two `run(A)` with same key → one `invokeAction` call; both await same result.
- `cancel()` prevents hook state updates from in-flight promises.
- Auto‑invalidate: `ctx.invalidate()` called with correct `CacheKeyPattern[]` on success only.
- Multiple hook instances are isolated (no state leaks).
- SSR import produces no side effects.

**Docs**

- `docs/api/`: signature, options (concurrency, dedupeKey, autoInvalidate), return shape, links to [`packages/kernel/src/actions/middleware.ts`](../packages/kernel/src/actions/middleware.ts) and [`packages/kernel/src/actions/define.ts`](../packages/kernel/src/actions/define.ts).
- `docs/guide/`: when to use which concurrency mode; pairing with `KernelNotice`; policy gating patterns; cancellation semantics and kernel limitations.
- `README.md` (UI package): short "Actions in React" section with a submit example.

**Non‑goals**

- No new event emission (kernel middleware already emits lifecycle events).
- No implicit policy gating; use `usePolicy()` to control UI.
- No automatic retries/backoff (consider future middleware option).
- No global action state; hook instance is local by design.
- No native `AbortSignal` propagation to kernel (deferred to future sprint).

---

## Documentation Requirements (for both)

- Place API references under **`docs/api/`** (`usePrefetcher.md`, `useAction.md`).
- Link to corresponding Kernel implementations:
    - Prefetch: [`packages/kernel/src/resource/define.ts`](../packages/kernel/src/resource/define.ts)
    - Actions: [`packages/kernel/src/actions/define.ts`](../packages/kernel/src/actions/define.ts), [`packages/kernel/src/actions/middleware.ts`](../packages/kernel/src/actions/middleware.ts), [`packages/kernel/src/actions/types.ts`](../packages/kernel/src/actions/types.ts)
    - Cache invalidation: [`packages/kernel/src/resource/cache.ts`](../packages/kernel/src/resource/cache.ts)
- Author practical guides under **`docs/guide/`** (`prefetching.md`, `actions.md`) with patterns and pitfalls.
- Add concise sections to the **UI package `README.md`** with links to the detailed docs.
- Each doc page includes: purpose, benefits, signatures, parameter tables, return values, SSR notes, cancellation semantics, and at least **two** copy‑paste examples.

## Testing Requirements (for both)

- Unit tests at **≥ 90% coverage** (lines & branches) for new files.
- Mock Kernel functions (`resource.prefetchGet`, `resource.prefetchList`, `invokeAction`) rather than reimplementing their logic.
- Include edge‑case tests:
    - Prefetch: hover debounce, visibility observer, stable references
    - Actions: cancel/queue, dedupe, concurrency modes, invalidation callback execution
- Where UI behaviour is observable, include one integration flow that demonstrates the hook working with `KernelNotice` and/or list refresh.

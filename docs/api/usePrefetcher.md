# `usePrefetcher` and friends

React helpers that wrap the resource prefetch utilities exposed by
`defineResource`. They let you warm the kernel cache from UI affordances
without doing any bespoke store plumbing or duplicating cache keys.

These hooks delegate to the resource runtime implemented in
`packages/kernel/src/resource/define.ts` and the cache helpers in
`packages/kernel/src/resource/cache.ts`. They do **not** bypass any of the
rules enforced there; the hooks simply stabilise the callback references so
you can attach them to events.

## `usePrefetcher(resource)`

```ts
import type { ResourceObject } from '@geekist/wp-kernel';
import { usePrefetcher } from '@geekist/wp-kernel-ui';

function usePrefetcher<TRecord>(resource: ResourceObject<TRecord>): {
	prefetchGet: (id: string | number) => void;
	prefetchList: (query?: Record<string, unknown>) => void;
} {}
```

- **`resource`** – the `ResourceObject` returned by `defineResource`.
- Returns stable `prefetchGet` and `prefetchList` callbacks. They mirror
  `resource.prefetchGet` and `resource.prefetchList`, are safe to pass to refs,
  and swallow the returned promise because prefetching is advisory.

### Example: hover to warm a detail view

```tsx
import { useRef } from 'react';
import { usePrefetcher, useHoverPrefetch } from '@geekist/wp-kernel-ui';
import { job } from '@/resources/job';

export function JobLink({ id }: { id: number }) {
	const { prefetchGet } = usePrefetcher(job);
	const anchorRef = useRef<HTMLAnchorElement>(null);

	useHoverPrefetch(anchorRef, () => prefetchGet(id), { delayMs: 200 });

	return (
		<a ref={anchorRef} href={`/admin/jobs/${id}`}>
			View
		</a>
	);
}
```

### Example: prepare a first page before route change

```tsx
import { useRef } from 'react';
import { usePrefetcher, useVisiblePrefetch } from '@geekist/wp-kernel-ui';
import { testimonial } from '@/resources/testimonial';

export function TestimonialsSummary() {
	const { prefetchList } = usePrefetcher(testimonial);
	const sectionRef = useRef<HTMLDivElement>(null);

	useVisiblePrefetch(sectionRef, () => prefetchList({ page: 1 }), {
		rootMargin: '150px',
	});

	return <div ref={sectionRef}>{/* ... */}</div>;
}
```

## `useHoverPrefetch(ref, fn, options?)`

```ts
useHoverPrefetch(
	ref: React.RefObject<HTMLElement>,
	fn: () => void,
	options?: {
		delayMs?: number; // defaults to 150
		once?: boolean; // defaults to true
	}
): void;
```

Adds a `mouseenter` handler that runs the provided callback after the configured
delay (150 ms by default). Moving the pointer out of the element cancels the
timer. Set `once: false` if you want to re-run the callback for every hover.

## `useVisiblePrefetch(ref, fn, options?)`

```ts
useVisiblePrefetch(
	ref: React.RefObject<Element>,
	fn: () => void,
	options?: {
		rootMargin?: string; // defaults to "200px"
		once?: boolean; // defaults to true
	}
): void;
```

Observes the referenced element and invokes the callback once it is inside the
viewport plus the provided `rootMargin`. When `IntersectionObserver` is not
available (older browsers, certain test environments) it falls back to a
capturing `scroll`/`resize` listener throttled with `requestAnimationFrame`.

## `useNextPagePrefetch(resource, currentQuery, options?)`

```ts
useNextPagePrefetch(
	resource: ResourceObject<any, Record<string, unknown>>,
	currentQuery: Record<string, unknown>,
	options?: {
		computeNext?: (query: Record<string, unknown>) => Record<string, unknown>;
		when?: boolean;
	}
): void;
```

- Computes a "next page" query (by default `page + 1`) and issues a
  `prefetchList` after the current list has settled.
- `computeNext` lets you derive cursor-based or filter-aware queries.
- Gate the behaviour with `when` so you only prefetch after the current list
  finished loading.

```tsx
const { prefetchList } = usePrefetcher(job);
useNextPagePrefetch(job, currentQuery, {
	when: status === 'success',
	computeNext: (query) => ({ ...query, cursor: query.cursor?.next }),
});
```

## Notes

- These helpers rely on the store registration performed by
  `defineResource`-they do not talk to the transport directly.
- The kernel throws a `KernelError('DeveloperError')` if `@wordpress/data`
  is not present. This mirrors the imperative `prefetch*` functions.
- Prefetching is **advisory**. Use it to reduce wait time, not to enforce data
  loading. Render hooks (`resource.useList`, `resource.useGet`) remain the
  canonical read path.

## References

- Resource runtime – [`packages/kernel/src/resource/define.ts`](../packages/kernel/src/resource/define.ts)
- Cache helpers – [`packages/kernel/src/resource/cache.ts`](../packages/kernel/src/resource/cache.ts)

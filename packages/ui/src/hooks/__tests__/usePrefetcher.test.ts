import type { ResourceObject } from '@geekist/wp-kernel';
import { renderHook } from '../testing/test-utils';
import { usePrefetcher } from '../usePrefetcher';

type TestRecord = { id: number; name: string };

describe('usePrefetcher', () => {
	function createResource(): ResourceObject<TestRecord> {
		return {
			name: 'test',
			storeKey: 'test/resource',
			cacheKeys: {} as never,
			routes: {} as never,
			prefetchGet: jest.fn().mockResolvedValue(undefined),
			prefetchList: jest.fn().mockResolvedValue(undefined),
		} as unknown as ResourceObject<TestRecord>;
	}

	it('calls resource prefetchers when invoked', () => {
		const resource = createResource();
		const { result } = renderHook(() => usePrefetcher(resource));

		result.current.prefetchGet(42);
		expect(resource.prefetchGet).toHaveBeenCalledWith(42);

		const query = { page: 2 };
		result.current.prefetchList(query);
		expect(resource.prefetchList).toHaveBeenCalledWith(query);
	});

	it('no-ops gracefully when prefetch functions are absent', () => {
		const resource = {
			name: 'empty',
			storeKey: 'empty',
			cacheKeys: {} as never,
			routes: {} as never,
		} as unknown as ResourceObject<TestRecord>;

		const { result } = renderHook(() => usePrefetcher(resource));

		expect(() => result.current.prefetchGet(1)).not.toThrow();
		expect(() => result.current.prefetchList({})).not.toThrow();
	});

	it('keeps callback references stable between renders with same resource', () => {
		const resource = createResource();
		const { result, rerender } = renderHook(
			(res?: ResourceObject<TestRecord>) => usePrefetcher(res ?? resource)
		);

		const initialGet = result.current.prefetchGet;
		const initialList = result.current.prefetchList;

		rerender(resource);

		expect(result.current.prefetchGet).toBe(initialGet);
		expect(result.current.prefetchList).toBe(initialList);
	});
});

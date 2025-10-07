import type { ResourceObject } from '@geekist/wp-kernel';
import { renderHook } from '../testing/test-utils';
import { useNextPagePrefetch } from '../useNextPagePrefetch';

describe('useNextPagePrefetch', () => {
	function createResource(): ResourceObject<any, any> {
		return {
			name: 'jobs',
			storeKey: 'jobs/store',
			cacheKeys: {} as never,
			routes: {} as never,
			prefetchList: jest.fn(),
		} as unknown as ResourceObject<any, any>;
	}

	it('prefetches the next page with default computation', () => {
		const resource = createResource();
		renderHook(() =>
			useNextPagePrefetch(
				resource,
				{ page: 1, status: 'open' },
				{ when: true }
			)
		);

		expect(resource.prefetchList).toHaveBeenCalledWith({
			page: 2,
			status: 'open',
		});
	});

	it('respects the when flag', () => {
		const resource = createResource();
		renderHook(() =>
			useNextPagePrefetch(resource, { page: 3 }, { when: false })
		);

		expect(resource.prefetchList).not.toHaveBeenCalled();
	});

	it('supports custom computeNext callbacks', () => {
		const resource = createResource();
		const prefetchList = resource.prefetchList as jest.Mock;
		const computeNext = jest.fn((query: { cursor: string }) => ({
			cursor: `${query.cursor}-next`,
		}));

		renderHook(() =>
			useNextPagePrefetch(
				resource,
				{ cursor: 'abc123' },
				{ when: true, computeNext }
			)
		);

		expect(computeNext).toHaveBeenCalledWith({ cursor: 'abc123' });
		expect(prefetchList).toHaveBeenCalledWith({
			cursor: 'abc123-next',
		});
	});

	it('defaults to incrementing page number when query is missing or invalid', () => {
		const resource = createResource();
		const prefetchList = resource.prefetchList as jest.Mock;

		renderHook(() =>
			useNextPagePrefetch(resource, { status: 'active' }, {})
		);

		expect(prefetchList).toHaveBeenCalledWith({
			status: 'active',
			page: 2,
		});

		prefetchList.mockClear();

		renderHook(() =>
			useNextPagePrefetch(resource, { page: 'not-a-number' }, {})
		);

		expect(prefetchList).toHaveBeenCalledWith({
			page: 2,
		});
	});

	it('skips prefetch when computeNext returns a falsey value', () => {
		const resource = createResource();
		const prefetchList = resource.prefetchList as jest.Mock;
		const computeNext = jest.fn(() => null);

		renderHook(() =>
			useNextPagePrefetch(resource, { page: 1 }, { computeNext })
		);

		expect(computeNext).toHaveBeenCalled();
		expect(prefetchList).not.toHaveBeenCalled();
	});
});

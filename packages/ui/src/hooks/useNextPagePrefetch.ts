import { useEffect } from 'react';
import type { ResourceObject } from '@geekist/wp-kernel';
import { useStableCallback } from './internal/useStableCallback';
import { usePrefetcher } from './usePrefetcher';

export interface NextPagePrefetchOptions<TQuery> {
	computeNext?: (query: TQuery) => TQuery;
	when?: boolean;
}

const defaultComputeNext = <TQuery extends Record<string, unknown>>(
	query: TQuery
): TQuery => {
	const currentPage = Number(query?.page ?? 1);
	return {
		...query,
		page: Number.isFinite(currentPage) ? currentPage + 1 : 2,
	};
};

export function useNextPagePrefetch<
	TRecord,
	TQuery extends Record<string, unknown>,
>(
	resource: ResourceObject<TRecord, TQuery>,
	currentQuery: TQuery,
	options: NextPagePrefetchOptions<TQuery> = {}
): void {
	const { prefetchList } = usePrefetcher(resource);
	const computeNext = useStableCallback(
		options.computeNext ?? defaultComputeNext<TQuery>
	);
	const shouldRun = options.when ?? true;

	useEffect(() => {
		if (!shouldRun) {
			return;
		}

		const nextQuery = computeNext(currentQuery);
		if (!nextQuery) {
			return;
		}
		prefetchList(nextQuery);
	}, [computeNext, currentQuery, prefetchList, shouldRun]);
}

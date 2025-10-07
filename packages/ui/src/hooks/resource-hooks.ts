import { KernelError } from '@geekist/wp-kernel/error';
import type { ResourceObject, ListResponse } from '@geekist/wp-kernel/resource';

type WordPressStoreSelector<T, TQuery = unknown> = {
	getItem?: (id: string | number) => T | undefined;
	getList?: (query?: TQuery) => ListResponse<T> | undefined;
	getListStatus?: (query?: TQuery) => string | undefined;
	isResolving?: (method: string, args: unknown[]) => boolean;
	hasFinishedResolution?: (method: string, args: unknown[]) => boolean;
	getItemError?: (id: string | number) => Error | undefined;
	getListError?: (query?: TQuery) => string | undefined;
};

type WordPressSelectFunction<T, TQuery = unknown> = (
	storeKey: string
) => WordPressStoreSelector<T, TQuery> | undefined;

export interface UseResourceItemResult<T> {
	data: T | undefined;
	isLoading: boolean;
	error: string | undefined;
}

export interface UseResourceListResult<T> {
	data: ListResponse<T> | undefined;
	isLoading: boolean;
	error: string | undefined;
}

function resolveWpGlobal(): WPGlobal['wp'] | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	return (window as Window & WPGlobal).wp;
}

function ensureUseSelect<T, TQuery>(
	resource: ResourceObject<T, TQuery>,
	method: 'useGet' | 'useList'
) {
	const wp = resolveWpGlobal();
	if (!wp?.data?.useSelect) {
		throw new KernelError('DeveloperError', {
			message: `${method} requires @wordpress/data to be loaded`,
			context: {
				resource: resource.name,
				method,
			},
		});
	}

	return wp.data;
}

function createUseGet<T, TQuery>(resource: ResourceObject<T, TQuery>) {
	return (id: string | number): UseResourceItemResult<T> => {
		const wpData = ensureUseSelect(resource, 'useGet');

		return wpData.useSelect(
			(select: WordPressSelectFunction<T>) => {
				void resource.store;

				const storeSelect = select(resource.storeKey);
				const data = storeSelect?.getItem?.(id);
				const isResolving = storeSelect?.isResolving?.('getItem', [id]);
				const hasResolved = storeSelect?.hasFinishedResolution?.(
					'getItem',
					[id]
				);
				const error = storeSelect?.getItemError?.(id);

				return {
					data,
					isLoading: Boolean(isResolving || !hasResolved),
					error: error?.message,
				};
			},
			[id]
		);
	};
}

function createUseList<T, TQuery>(resource: ResourceObject<T, TQuery>) {
	return (query?: TQuery): UseResourceListResult<T> => {
		const wpData = ensureUseSelect(resource, 'useList');

		return wpData.useSelect(
			(select: WordPressSelectFunction<T, TQuery>) => {
				void resource.store;

				const storeSelect = select(resource.storeKey);
				const data = storeSelect?.getList?.(query);
				const status = storeSelect?.getListStatus?.(query) ?? 'idle';
				const isResolving =
					storeSelect?.isResolving?.('getList', [query]) ?? false;
				const hasResolved = storeSelect?.hasFinishedResolution?.(
					'getList',
					[query]
				);
				const error = storeSelect?.getListError?.(query);

				const resolvedByStatus =
					status === 'success' || status === 'error';
				const isLoading =
					status === 'loading' ||
					((hasResolved === false || status === 'idle') &&
						!resolvedByStatus);

				return {
					data,
					isLoading: isLoading || isResolving,
					error,
				};
			},
			[query]
		);
	};
}

/**
 * Attach `useGet` and `useList` React helpers to a resource definition.
 *
 * The hooks wrap `@wordpress/data.useSelect()` to expose resource data with
 * loading and error states that mirror resolver status. They are registered on
 * demand when the UI bundle is evaluated so resource modules remain tree-shake
 * friendly for non-React contexts.
 *
 * @param resource - Resource definition to augment with hooks
 */
export function attachResourceHooks<T, TQuery>(
	resource: ResourceObject<T, TQuery>
): ResourceObject<T, TQuery> {
	if (resource.routes.get) {
		resource.useGet = createUseGet(resource);
	}

	if (resource.routes.list) {
		resource.useList = createUseList(resource);
	}

	return resource;
}

// Register the hook attachment function on globalThis
// Type defined in types/global.d.ts as GlobalThis.__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__
if (typeof globalThis !== 'undefined') {
	(
		globalThis as typeof globalThis & {
			__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__?: <T, TQuery>(
				resource: ResourceObject<T, TQuery>
			) => void;
		}
	).__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__ = <HookEntity, HookQuery>(
		resource: ResourceObject<HookEntity, HookQuery>
	) => {
		attachResourceHooks(resource);
	};
}

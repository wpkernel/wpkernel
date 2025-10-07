/**
 * Resource React Hooks Attachment
 *
 * Provides React hooks (useGet, useList) for kernel resources by integrating
 * with WordPress data stores. Hooks are attached to ResourceObject instances
 * at module load time or queued for late attachment if resources are defined
 * before this UI bundle loads.
 *
 * @see Product Specification § 4.1 Resources
 * @module resource-hooks
 */
import { KernelError } from '@geekist/wp-kernel/error';
import type { ResourceObject, ListResponse } from '@geekist/wp-kernel/resource';

/**
 * WordPress data store selector shape
 * Internal type representing the store selectors we expect from wp.data
 *
 * @internal
 */
type WordPressStoreSelector<T, TQuery = unknown> = {
	getItem?: (id: string | number) => T | undefined;
	getList?: (query?: TQuery) => ListResponse<T> | undefined;
	getListStatus?: (query?: TQuery) => string | undefined;
	isResolving?: (method: string, args: unknown[]) => boolean;
	hasFinishedResolution?: (method: string, args: unknown[]) => boolean;
	getItemError?: (id: string | number) => Error | undefined;
	getListError?: (query?: TQuery) => string | undefined;
};

/**
 * WordPress select function shape
 * Internal type for wp.data.useSelect callback signature
 *
 * @internal
 */
type WordPressSelectFunction<T, TQuery = unknown> = (
	storeKey: string
) => WordPressStoreSelector<T, TQuery> | undefined;

/**
 * Result shape for single-item resource hooks
 *
 * @template T - Entity type returned by the resource
 */
export interface UseResourceItemResult<T> {
	/** The fetched entity, or undefined if not yet loaded */
	data: T | undefined;
	/** True if the data is currently being fetched or resolved */
	isLoading: boolean;
	/** Error message if the fetch failed, undefined otherwise */
	error: string | undefined;
}

/**
 * Result shape for list resource hooks
 *
 * @template T - Entity type in the list
 */
export interface UseResourceListResult<T> {
	/** The fetched list response with items and metadata, or undefined if not yet loaded */
	data: ListResponse<T> | undefined;
	/** True if the data is currently being fetched or resolved */
	isLoading: boolean;
	/** Error message if the fetch failed, undefined otherwise */
	error: string | undefined;
}

/**
 * Resolve WordPress global in a SSR-safe way
 *
 * @internal
 * @return WordPress global object or undefined if not available
 */
function resolveWpGlobal(): WPGlobal['wp'] | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	return (window as Window & WPGlobal).wp;
}

/**
 * Ensure WordPress data useSelect hook is available
 *
 * @internal
 * @param resource - The resource requiring useSelect
 * @param method   - The hook method name for error messaging
 * @throws When @wordpress/data is not loaded
 * @return WordPress data module
 */
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

/**
 * Create a React hook for fetching single entities from a resource
 *
 * @internal
 * @template T - Entity type
 * @template TQuery - Query parameter type
 * @param    resource - The resource object to create hook for
 * @return Hook function that accepts an entity ID and returns loading state + data
 */
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

/**
 * Create a React hook for fetching entity lists from a resource
 *
 * @internal
 * @template T - Entity type in the list
 * @template TQuery - Query parameter type
 * @param    resource - The resource object to create hook for
 * @return Hook function that accepts query params and returns loading state + list data
 */
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
 * @template T - Entity type
 * @template TQuery - Query parameter type
 * @param    resource - Resource definition to augment with hooks
 * @return The same resource object with hooks attached
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

/**
 * Global hook registration and pending resource processing
 *
 * When this module loads, it registers the hook attachment function on globalThis
 * and processes any resources that were defined before the UI bundle loaded.
 *
 * This enables late binding of React hooks to resources, ensuring that resources
 * defined in data modules (before React UI is imported) still receive useGet/useList
 * when the UI package eventually loads.
 *
 * @see types/global.d.ts for __WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__ type definition
 * @see packages/kernel/src/resource/define.ts for resource queuing logic
 */
if (typeof globalThis !== 'undefined') {
	(
		globalThis as typeof globalThis & {
			__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__?: <T, TQuery>(
				resource: ResourceObject<T, TQuery>
			) => void;
			__WP_KERNEL_UI_PROCESS_PENDING_RESOURCES__?: () => ResourceObject<
				unknown,
				unknown
			>[];
		}
	).__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__ = <HookEntity, HookQuery>(
		resource: ResourceObject<HookEntity, HookQuery>
	) => {
		attachResourceHooks(resource);
	};

	// Process any resources that were created before this UI bundle loaded
	const processPending = (
		globalThis as typeof globalThis & {
			__WP_KERNEL_UI_PROCESS_PENDING_RESOURCES__?: () => ResourceObject<
				unknown,
				unknown
			>[];
		}
	).__WP_KERNEL_UI_PROCESS_PENDING_RESOURCES__;

	if (processPending) {
		const pending = processPending();
		pending.forEach((resource) => {
			attachResourceHooks(resource);
		});
	}
}

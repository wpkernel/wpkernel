/**
 * Grouped API factories
 *
 * Creates grouped namespace properties for power users.
 * These organize resource methods into logical groups:
 * - select.* - Pure selectors (no fetching)
 * - use.* - React hooks
 * - get.* - Explicit fetching (bypass cache)
 * - mutate.* - CRUD operations
 * - cache.* - Cache control
 * - storeApi.* - Store access
 * - events.* - Event names
 *
 * @see Product Specification § 4.1 Resources (Phase 2.2)
 */
import { KernelError } from '../error/index';
import { invalidate as globalInvalidate } from './cache';
import type { ResourceConfig, ResourceObject, CacheKeys } from './types';
import { detectNamespace, WPK_NAMESPACE } from '../namespace/index';

/**
 * Create select namespace getter
 *
 * Pure selectors that read from the store without triggering fetches.
 * Returns undefined if neither get nor list routes are configured.
 *
 * @param config - Resource configuration
 * @return Getter descriptor for select namespace
 */
export function createSelectGetter<T, TQuery>(
	config: ResourceConfig<T, TQuery>
) {
	return function (this: ResourceObject<T, TQuery>) {
		if (!config.routes.get && !config.routes.list) {
			return undefined;
		}

		return {
			item: (id: string | number): T | undefined => {
				// Trigger lazy store registration
				void this.store;

				const wpData = getWPData();
				if (!wpData?.select) {
					return undefined;
				}

				const storeSelect = wpData.select(this.storeKey);
				return (
					storeSelect as { getItem?: (id: string | number) => T }
				)?.getItem?.(id);
			},

			items: (): T[] => {
				// Trigger lazy store registration
				void this.store;

				const wpData = getWPData();
				if (!wpData?.select) {
					return [];
				}

				const storeSelect = wpData.select(this.storeKey);
				const state = (
					storeSelect as {
						getState?: () => {
							items: Record<string | number, T>;
						};
					}
				)?.getState?.();
				return state?.items ? (Object.values(state.items) as T[]) : [];
			},

			list: (query?: TQuery): T[] => {
				// Trigger lazy store registration
				void this.store;

				const wpData = getWPData();
				if (!wpData?.select) {
					return [];
				}

				const storeSelect = wpData.select(this.storeKey);
				return (
					(
						storeSelect as {
							getItems?: (query?: TQuery) => T[];
						}
					)?.getItems?.(query) || []
				);
			},
		};
	};
}

/**
 * Create use namespace getter
 *
 * React hooks that integrate with @wordpress/data.
 * Aliases to thin-flat useGet/useList methods.
 *
 * @return Getter descriptor for use namespace
 */
export function createUseGetter<T, TQuery>() {
	return function (this: ResourceObject<T, TQuery>) {
		if (!this.useGet && !this.useList) {
			return undefined;
		}

		return {
			item: this.useGet!,
			list: this.useList!,
		};
	};
}

/**
 * Create get namespace getter
 *
 * Explicit fetching methods that bypass cache and always hit the server.
 * Aliases to thin-flat fetch/fetchList methods.
 *
 * @param config - Resource configuration
 * @return Getter descriptor for get namespace
 */
export function createGetGetter<T, TQuery>(config: ResourceConfig<T, TQuery>) {
	return function (this: ResourceObject<T, TQuery>) {
		if (!config.routes.get && !config.routes.list) {
			return undefined;
		}

		return {
			item: this.fetch!,
			list: this.fetchList!,
		};
	};
}

/**
 * Create mutate namespace getter
 *
 * CRUD operations (create, update, remove).
 * Returns undefined if no mutation routes are configured.
 *
 * @param config - Resource configuration
 * @return Getter descriptor for mutate namespace
 */
export function createMutateGetter<T, TQuery>(
	config: ResourceConfig<T, TQuery>
) {
	return function (this: ResourceObject<T, TQuery>) {
		if (
			!config.routes.create &&
			!config.routes.update &&
			!config.routes.remove
		) {
			return undefined;
		}

		return {
			create: this.create!,
			update: this.update!,
			remove: this.remove! as (id: string | number) => Promise<void>,
		};
	};
}

/**
 * Create cache namespace getter
 *
 * Cache control methods for prefetching and invalidation.
 * Always available (not conditional on routes).
 *
 * @param config    - Resource configuration
 * @param cacheKeys - Cache key generators
 * @return Getter descriptor for cache namespace
 */
export function createCacheGetter<T, TQuery>(
	config: ResourceConfig<T, TQuery>,
	cacheKeys: Required<CacheKeys>
) {
	return function (this: ResourceObject<T, TQuery>) {
		return {
			prefetch: {
				item:
					this.prefetchGet ||
					(async () => {
						throw new KernelError('NotImplementedError', {
							message: `Resource "${config.name}" does not have a "get" route`,
						});
					}),
				list:
					this.prefetchList ||
					(async () => {
						throw new KernelError('NotImplementedError', {
							message: `Resource "${config.name}" does not have a "list" route`,
						});
					}),
			},
			invalidate: {
				item: (id: string | number) => {
					this.invalidate([[...cacheKeys.get(id)]]);
				},
				list: (query?: TQuery) => {
					this.invalidate([[...cacheKeys.list(query)]]);
				},
				all: () => {
					// Invalidate all cache keys for this resource
					globalInvalidate([[config.name]], {
						storeKey: this.storeKey,
					});
				},
			},
			key: this.key,
		};
	};
}

/**
 * Create storeApi namespace getter
 *
 * Direct access to @wordpress/data store internals.
 * Provides store key and descriptor.
 *
 * @return Getter descriptor for storeApi namespace
 */
export function createStoreApiGetter<T, TQuery>() {
	return function (this: ResourceObject<T, TQuery>) {
		const store = this.store;
		return {
			key: this.storeKey,
			get descriptor() {
				return store;
			},
		};
	};
}

/**
 * Create events namespace getter
 *
 * Canonical event names for the resource.
 * Follows pattern: {namespace}.{resourceName}.{action}
 *
 * @param config - Resource configuration with resolved namespace and name
 * @return Getter descriptor for events namespace
 */
export function createEventsGetter<T, TQuery>(
	config: ResourceConfig<T, TQuery>
) {
	return function () {
		// Use namespace from config, or detect from environment with WPK_NAMESPACE fallback
		const namespace =
			config.namespace ||
			detectNamespace({
				fallback: WPK_NAMESPACE,
				runtime: 'frontend', // Ensure we check all detection methods
			}).namespace;
		const resourceName = config.name;

		return {
			created: `${namespace}.${resourceName}.created`,
			updated: `${namespace}.${resourceName}.updated`,
			removed: `${namespace}.${resourceName}.removed`,
		};
	};
}

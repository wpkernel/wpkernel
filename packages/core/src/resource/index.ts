/**
 * Resource system exports
 *
 * Core primitives for defining typed REST resources with automatic
 * client generation, store keys, and cache management.
 */

/**
 * Defines a new WPKernel resource.
 *
 * This function is the primary entry point for creating resource definitions,
 * which include routes, identity, storage, and UI configurations.
 *
 * @category Resource
 */
export { defineResource } from './define';

export {
	/**
	 * Interpolates path parameters into a route path.
	 *
	 * @category Resource
	 * @param    path   - The route path containing parameters (e.g., '/posts/:id').
	 * @param    params - An object containing key-value pairs for path parameters.
	 * @returns The interpolated path.
	 */
	interpolatePath,
	/**
	 * Extracts path parameters from a URL based on a route path.
	 *
	 * @category Resource
	 * @param    path - The route path containing parameters (e.g., '/posts/:id').
	 * @param    url  - The URL to extract parameters from (e.g., '/posts/123').
	 * @returns An object containing the extracted path parameters.
	 */
	extractPathParams,
	/**
	 * Invalidates a specific cache key or a pattern of cache keys.
	 *
	 * @category Resource
	 * @param    key     - The cache key or pattern to invalidate.
	 * @param    options - Options for invalidation, such as whether to match exactly.
	 */
	invalidate,
	/**
	 * Invalidates all cache keys for a given resource.
	 *
	 * @category Resource
	 * @param    resourceName - The name of the resource whose cache keys should be invalidated.
	 */
	invalidateAll,
	/**
	 * Normalizes a cache key by ensuring it starts with the resource name and is properly formatted.
	 *
	 * @category Resource
	 * @param    resourceName - The name of the resource.
	 * @param    key          - The cache key to normalize.
	 * @returns The normalized cache key.
	 */
	normalizeCacheKey,
	/**
	 * Checks if a given cache key matches a pattern.
	 *
	 * @category Resource
	 * @param    key     - The cache key to check.
	 * @param    pattern - The pattern to match against.
	 * @returns `true` if the key matches the pattern, `false` otherwise.
	 */
	matchesCacheKey,
	/**
	 * Finds all cache keys that match a given pattern.
	 *
	 * @category Resource
	 * @param    pattern - The pattern to match against.
	 * @returns An array of matching cache keys.
	 */
	findMatchingKeys,
	/**
	 * Finds all cache keys that match any of the given patterns.
	 *
	 * @category Resource
	 * @param    patterns - An array of patterns to match against.
	 * @returns An array of matching cache keys.
	 */
	findMatchingKeysMultiple,
} from './cache';
export type { InvalidateOptions, CacheKeyPattern, PathParams } from './cache';
export type {
	AnyFn,
	ResourceRoute,
	ResourceRoutes,
	ResourceIdentityConfig,
	ResourcePostMetaDescriptor,
	ResourceStorageConfig,
	ResourceStoreOptions,
	CacheKeyFn,
	CacheKeys,
	ResourceQueryParamDescriptor,
	ResourceQueryParams,
	ResourceConfig,
	ResourceCapabilityDescriptor,
	ResourceCapabilityMap,
	RouteCapabilityKeys,
	ListResponse,
	ResourceClient,
	ResourceObject,
	ResourceListStatus,
	ResourceUIConfig,
	ResourceAdminUIConfig,
	ResourceDataViewsMenuConfig,
} from './types';

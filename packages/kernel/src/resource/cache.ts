import { createReporter } from '../reporter';
import { WPK_EVENTS, WPK_SUBSYSTEM_NAMESPACES } from '../namespace/constants';

/**
 * Internal state shape exposed by the __getInternalState selector.
 * Mirrors reducer slices we care about for invalidation.
 */
type InternalState = {
	lists?: Record<string, unknown>;
	listMeta?: Record<string, unknown>;
	errors?: Record<string, unknown>;
};

/**
 * Dispatch interface for stores with invalidation capabilities.
 */
interface DispatchWithInvalidate {
	invalidate?: (keys: string[]) => void;
	invalidateResolution?: (type: string) => void;
	invalidateAll?: () => void;
	[key: string]: unknown;
}

/**
 * Convert input pattern(s) into an array form.
 * Accepts a single pattern or an array of patterns.
 * @param patterns
 */
const cacheReporter = createReporter({
	namespace: WPK_SUBSYSTEM_NAMESPACES.CACHE,
	channel: 'console',
	level: 'warn',
});

function toPatternsArray(
	patterns: CacheKeyPattern | CacheKeyPattern[]
): CacheKeyPattern[] {
	// Check if patterns is an array of patterns by testing if first element is an array
	// If patterns is empty or first element is not an array, it's a single pattern
	if (
		Array.isArray(patterns) &&
		patterns.length > 0 &&
		Array.isArray(patterns[0])
	) {
		return patterns as CacheKeyPattern[];
	}
	// Otherwise, wrap single pattern
	return [patterns as CacheKeyPattern];
}

/**
 * Safely get __getInternalState selector from a store registry.
 * Returns a function when present, otherwise undefined.
 * @param dataRegistry
 * @param storeKey
 */
function getInternalStateSelector(
	dataRegistry: ReturnType<NonNullable<typeof getWPData>>,
	storeKey: string
): (() => InternalState) | undefined {
	const select = dataRegistry?.select(storeKey) as
		| { __getInternalState?: () => InternalState }
		| undefined;

	if (select && typeof select.__getInternalState === 'function') {
		return select.__getInternalState as () => InternalState;
	}
	return undefined;
}

/**
 * Build a map from normalized cache key to the raw reducer key.
 * We normalise list and listMeta keys to `<resource>:list:<queryKey>` and pass errors through.
 * @param state
 * @param resourceName
 */
function buildNormalizedToRawMap(
	state: InternalState,
	resourceName: string
): Map<string, string> {
	const normalizedToRaw = new Map<string, string>();

	const listKeys = Object.keys(state.lists || {});
	for (const queryKey of listKeys) {
		const normalized = normalizeCacheKey([resourceName, 'list', queryKey]);
		normalizedToRaw.set(normalized, queryKey);
	}

	const listMetaKeys = Object.keys(state.listMeta || {});
	for (const queryKey of listMetaKeys) {
		const normalized = normalizeCacheKey([resourceName, 'list', queryKey]);
		// Preserve mapping from lists if already present
		if (!normalizedToRaw.has(normalized)) {
			normalizedToRaw.set(normalized, queryKey);
		}
	}

	const errorKeys = Object.keys(state.errors || {});
	for (const errorKey of errorKeys) {
		normalizedToRaw.set(errorKey, errorKey);
	}

	return normalizedToRaw;
}

/**
 * Compute the set of normalized keys that match any pattern.
 * Performs exact or prefix (pattern + ':') matching.
 * @param allNormalizedKeys
 * @param patternsArray
 */
function findMatchingNormalizedKeys(
	allNormalizedKeys: string[],
	patternsArray: CacheKeyPattern[]
): string[] {
	return allNormalizedKeys.filter((cacheKey) =>
		patternsArray.some((pattern) => {
			const normalizedPattern = normalizeCacheKey(pattern);
			if (normalizedPattern === '') {
				return false;
			}
			return (
				cacheKey === normalizedPattern ||
				cacheKey.startsWith(normalizedPattern + ':')
			);
		})
	);
}

/**
 * Process matched keys and dispatch actual invalidate + resolution actions.
 * @param dispatch
 * @param matchingNormalizedKeys
 * @param normalizedToRaw
 * @param resourceName
 * @param invalidatedKeysSet
 */
function invalidateStoreMatches(
	dispatch: DispatchWithInvalidate,
	matchingNormalizedKeys: string[],
	normalizedToRaw: Map<string, string>,
	resourceName: string,
	invalidatedKeysSet: Set<string>
): void {
	// Dispatch invalidate action with raw reducer keys
	if (typeof dispatch.invalidate === 'function') {
		const rawKeysForInvalidate = matchingNormalizedKeys.map(
			(k) => normalizedToRaw.get(k) ?? k
		);
		dispatch.invalidate(rawKeysForInvalidate);
	}

	// Invalidate resolution state so resolveSelect() knows to refetch
	if (typeof dispatch.invalidateResolution === 'function') {
		const listPrefix = normalizeCacheKey([resourceName, 'list']);
		const itemPrefix = normalizeCacheKey([resourceName, 'item']);

		const hasListKeys = matchingNormalizedKeys.some((k) =>
			k.startsWith(listPrefix)
		);
		if (hasListKeys) {
			dispatch.invalidateResolution('getList');
		}

		const hasItemKeys = matchingNormalizedKeys.some((k) =>
			k.startsWith(itemPrefix)
		);
		if (hasItemKeys) {
			dispatch.invalidateResolution('getItem');
		}
	}

	// Track invalidated keys
	matchingNormalizedKeys.forEach((k) => invalidatedKeysSet.add(k));
}

/**
 * Orchestrate invalidation for a single store key.
 * Encapsulates selector access, mapping construction, pattern matching, and dispatch.
 * @param dataRegistry
 * @param storeKey
 * @param patternsArray
 * @param invalidatedKeysSet
 */
function processStoreInvalidation(
	dataRegistry: ReturnType<NonNullable<typeof getWPData>>,
	storeKey: string,
	patternsArray: CacheKeyPattern[],
	invalidatedKeysSet: Set<string>
): void {
	// Verify store exposes the expected dispatch API
	const dispatch = dataRegistry?.dispatch(storeKey) as
		| DispatchWithInvalidate
		| undefined;
	if (
		!dispatch ||
		typeof dispatch !== 'object' ||
		typeof dispatch.invalidate !== 'function'
	) {
		return;
	}

	const getInternalState = getInternalStateSelector(dataRegistry, storeKey);
	if (!getInternalState) {
		if (process.env.NODE_ENV === 'development') {
			cacheReporter.warn(
				`Store ${storeKey} does not expose __getInternalState selector`
			);
		}
		return;
	}

	const state = getInternalState();
	const resourceName = storeKey.split('/').pop() || storeKey;

	// Build mapping of normalized -> raw keys
	const normalizedToRaw = buildNormalizedToRawMap(state, resourceName);
	const allNormalizedKeys = Array.from(normalizedToRaw.keys());

	// Compute matches and perform invalidations
	const matchingNormalizedKeys = findMatchingNormalizedKeys(
		allNormalizedKeys,
		patternsArray
	);

	if (matchingNormalizedKeys.length > 0) {
		invalidateStoreMatches(
			dispatch,
			matchingNormalizedKeys,
			normalizedToRaw,
			resourceName,
			invalidatedKeysSet
		);
	}
}
import { KernelError } from '../error/index';

/**
 * Cache key utilities for resource store invalidation
 *
 * Provides deterministic cache key generation and pattern matching
 * for invalidating cached data in resource stores.
 *
 * @see Product Specification § 4.3 Actions
 */

/**
 * Cache key pattern - array of primitives (strings, numbers, booleans)
 * Null and undefined values are filtered out during normalization.
 *
 * @example
 * ```ts
 * ['thing', 'list']                    // Matches all 'thing' lists
 * ['thing', 'list', 'active']          // Matches lists filtered by 'active'
 * ['thing', 'get', 123]                // Matches get query for item 123
 * ```
 */
export type CacheKeyPattern = (string | number | boolean | null | undefined)[];

/**
 * Normalize a cache key pattern to a string representation.
 * Filters out null/undefined values and joins with colons.
 *
 * @param pattern - Cache key pattern array
 * @return Normalized string key
 *
 * @example
 * ```ts
 * normalizeCacheKey(['thing', 'list'])           // → 'thing:list'
 * normalizeCacheKey(['thing', 'list', null, 1])  // → 'thing:list:1'
 * normalizeCacheKey(['thing', 'get', 123])       // → 'thing:get:123'
 * ```
 */
export function normalizeCacheKey(pattern: CacheKeyPattern): string {
	return pattern
		.filter((segment) => segment !== null && segment !== undefined)
		.join(':');
}

/**
 * Check if a cache key matches a pattern.
 * Supports prefix matching: pattern ['thing', 'list'] matches keys starting with 'thing:list'.
 *
 * @param key     - The cache key to test (already normalized string)
 * @param pattern - The pattern to match against
 * @return True if the key matches the pattern
 *
 * @example
 * ```ts
 * matchesCacheKey('thing:list', ['thing', 'list'])              // → true
 * matchesCacheKey('thing:list:active', ['thing', 'list'])       // → true (prefix match)
 * matchesCacheKey('thing:list:active:1', ['thing', 'list'])     // → true (prefix match)
 * matchesCacheKey('thing:get:123', ['thing', 'list'])           // → false
 * matchesCacheKey('thing:list', ['thing', 'list', 'active'])    // → false
 * ```
 */
export function matchesCacheKey(
	key: string,
	pattern: CacheKeyPattern
): boolean {
	const normalizedPattern = normalizeCacheKey(pattern);

	// Empty pattern matches nothing (safety check)
	if (normalizedPattern === '') {
		return false;
	}

	// Exact match
	if (key === normalizedPattern) {
		return true;
	}

	// Prefix match: key starts with pattern followed by ':'
	// This ensures 'thing:list' matches 'thing:list:active' but not 'thing:listing'
	return key.startsWith(normalizedPattern + ':');
}

/**
 * Find all cache keys in a collection that match the given pattern.
 *
 * @param keys    - Collection of cache keys (typically from store state)
 * @param pattern - Pattern to match against
 * @return Array of matching cache keys
 *
 * @example
 * ```ts
 * const keys = ['thing:list:active', 'thing:list:inactive', 'thing:get:123'];
 * findMatchingKeys(keys, ['thing', 'list'])  // → ['thing:list:active', 'thing:list:inactive']
 * findMatchingKeys(keys, ['thing', 'get'])   // → ['thing:get:123']
 * ```
 */
export function findMatchingKeys(
	keys: string[],
	pattern: CacheKeyPattern
): string[] {
	return keys.filter((key) => matchesCacheKey(key, pattern));
}

/**
 * Find all cache keys matching any of the provided patterns.
 *
 * @param keys     - Collection of cache keys
 * @param patterns - Array of patterns to match against
 * @return Array of matching cache keys (deduplicated)
 *
 * @example
 * ```ts
 * const keys = ['thing:list:active', 'job:list:open', 'thing:get:123'];
 * findMatchingKeysMultiple(keys, [['thing', 'list'], ['job', 'list']])
 * // → ['thing:list:active', 'job:list:open']
 * ```
 */
export function findMatchingKeysMultiple(
	keys: string[],
	patterns: CacheKeyPattern[]
): string[] {
	const matchedKeys = new Set<string>();

	for (const pattern of patterns) {
		const matches = findMatchingKeys(keys, pattern);
		matches.forEach((key) => matchedKeys.add(key));
	}

	return Array.from(matchedKeys);
}

/**
 * REST path interpolation utilities
 *
 * Handles dynamic path segments like :id, :slug in REST routes.
 *
 * @example
 * ```ts
 * interpolatePath('/my-plugin/v1/things/:id', { id: 123 })
 * // => '/my-plugin/v1/things/123'
 *
 * interpolatePath('/my-plugin/v1/things/:id/comments/:commentId', { id: 1, commentId: 42 })
 * // => '/my-plugin/v1/things/1/comments/42'
 * ```
 */

/**
 * Path parameter values (string, number, or boolean)
 */
export type PathParams = Record<string, string | number | boolean>;

/**
 * Interpolate dynamic segments in a REST path
 *
 * Replaces `:paramName` patterns with values from the params object.
 * Throws DeveloperError if required params are missing.
 *
 * @param path   - REST path with :param placeholders
 * @param params - Parameter values to interpolate
 * @return Interpolated path
 * @throws DeveloperError if required params are missing
 *
 * @example
 * ```ts
 * interpolatePath('/my-plugin/v1/things/:id', { id: 123 })
 * // => '/my-plugin/v1/things/123'
 *
 * interpolatePath('/my-plugin/v1/things/:id', {}) // throws DeveloperError
 * ```
 */
export function interpolatePath(path: string, params: PathParams = {}): string {
	// Find all :param patterns
	const paramPattern = /:([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
	const matches = Array.from(path.matchAll(paramPattern));

	// Track which params are required
	const requiredParams = matches
		.map((match) => match[1])
		.filter((p): p is string => p !== undefined);
	const missingParams = requiredParams.filter(
		(param) =>
			!(param in params) ||
			params[param] === null ||
			params[param] === undefined
	);

	if (missingParams.length > 0) {
		throw new KernelError('DeveloperError', {
			message: `Missing required path parameters: ${missingParams.join(', ')}`,
			data: {
				validationErrors: [],
				path,
				requiredParams,
				providedParams: Object.keys(params),
				missingParams,
			},
			context: {
				path,
			},
		});
	}

	// Replace :param with values
	let interpolated = path;
	for (const [fullMatch, paramName] of matches) {
		if (paramName) {
			const value = params[paramName];
			interpolated = interpolated.replace(fullMatch, String(value));
		}
	}

	return interpolated;
}

/**
 * Extract parameter names from a path
 *
 * @param path - REST path with :param placeholders
 * @return Array of parameter names
 *
 * @example
 * ```ts
 * extractPathParams('/my-plugin/v1/things/:id')
 * // => ['id']
 *
 * extractPathParams('/my-plugin/v1/things/:id/comments/:commentId')
 * // => ['id', 'commentId']
 * ```
 */
export function extractPathParams(path: string): string[] {
	const paramPattern = /:([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
	const matches = Array.from(path.matchAll(paramPattern));
	return matches
		.map((match) => match[1])
		.filter((p): p is string => p !== undefined);
}

/**
 * Cache invalidation helper for resource stores
 *
 * Provides a centralized way to invalidate cached data across
 * all registered resource stores based on cache key patterns.
 *
 * @see Product Specification § 4.3 Actions
 */

/**
 * Options for invalidate function
 */
export interface InvalidateOptions {
	/**
	 * Store key to target (e.g., 'my-plugin/thing')
	 * If not provided, invalidates across all registered stores
	 */
	storeKey?: string;

	/**
	 * Whether to emit the cache.invalidated event
	 * @default true
	 */
	emitEvent?: boolean;
}

/**
 * Registry to track resource store keys
 * This is populated when resources are defined via defineResource
 */
const registeredStoreKeys = new Set<string>();

/**
 * Register a store key for invalidation tracking
 * Called internally by defineResource
 *
 * @internal
 * @param storeKey - The store key to register (e.g., 'my-plugin/thing')
 */
export function registerStoreKey(storeKey: string): void {
	registeredStoreKeys.add(storeKey);
}

/**
 * Get all registered store keys matching the given prefix
 *
 * @param prefix - Prefix to filter by (e.g., 'my-plugin/')
 * @return Array of matching store keys
 */
function getMatchingStoreKeys(prefix: string = ''): string[] {
	const keysArray = Array.from(registeredStoreKeys);
	if (!prefix) {
		return keysArray;
	}
	return keysArray.filter((key) => key.startsWith(prefix));
}

/**
 * Invalidate cached data matching the given patterns.
 * Deletes matching cache entries and marks selectors as stale.
 *
 * This is the primary cache invalidation API used by Actions to ensure
 * UI reflects updated data after write operations.
 *
 * @param patterns - Cache key patterns to invalidate
 * @param options  - Invalidation options
 *
 * @example
 * ```ts
 * // Invalidate all list queries for 'thing' resource
 * invalidate(['thing', 'list']);
 *
 * // Invalidate specific query
 * invalidate(['thing', 'list', 'active']);
 *
 * // Invalidate across multiple resources
 * invalidate([
 *   ['thing', 'list'],
 *   ['job', 'list']
 * ]);
 *
 * // Target specific store
 * invalidate(['thing', 'list'], { storeKey: 'my-plugin/thing' });
 * ```
 */
export function invalidate(
	patterns: CacheKeyPattern | CacheKeyPattern[],
	options: InvalidateOptions = {}
): void {
	const { storeKey, emitEvent = true } = options;

	// Normalise patterns input
	const patternsArray = toPatternsArray(patterns);

	// Resolve data registry (noop in tests / node)
	const dataRegistry = getWPData();
	if (!dataRegistry) {
		return;
	}

	// Determine which stores to touch
	const storeKeys = storeKey ? [storeKey] : getMatchingStoreKeys();

	// Accumulate invalidated keys for event emission
	const invalidatedKeysSet = new Set<string>();

	// Process each store with defensive error handling
	for (const key of storeKeys) {
		try {
			processStoreInvalidation(
				dataRegistry,
				key,
				patternsArray,
				invalidatedKeysSet
			);
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				cacheReporter.warn(
					`Failed to invalidate cache for store ${key}:`,
					error
				);
			}
		}
	}

	// Emit event if requested
	if (emitEvent && invalidatedKeysSet.size > 0) {
		emitCacheInvalidatedEvent(Array.from(invalidatedKeysSet));
	}
}

/**
 * Emit the cache.invalidated event
 *
 * @param keys - The cache keys that were invalidated
 */
function emitCacheInvalidatedEvent(keys: string[]): void {
	if (typeof window === 'undefined') {
		return;
	}

	// Use the global wp object with proper typing fallback
	const wp = (
		window as Window & {
			wp?: {
				hooks?: { doAction: (event: string, data: unknown) => void };
			};
		}
	).wp;

	if (wp?.hooks?.doAction) {
		wp.hooks.doAction(WPK_EVENTS.CACHE_INVALIDATED, { keys });
	}
}

/**
 * Invalidate all caches in a specific store
 *
 * @param storeKey - The store key to invalidate (e.g., 'my-plugin/thing')
 *
 * @example
 * ```ts
 * // Clear all cached data for 'thing' resource
 * invalidateAll('my-plugin/thing');
 * ```
 */
export function invalidateAll(storeKey: string): void {
	const dataRegistry = getWPData();
	if (!dataRegistry) {
		return;
	}

	try {
		const dispatch = dataRegistry.dispatch(storeKey) as
			| DispatchWithInvalidate
			| undefined;
		if (
			dispatch &&
			typeof dispatch === 'object' &&
			typeof dispatch.invalidateAll === 'function'
		) {
			dispatch.invalidateAll();

			// Emit event
			emitCacheInvalidatedEvent([`${storeKey}:*`]);
		}
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			cacheReporter.warn(
				`Failed to invalidate all caches for store ${storeKey}:`,
				error
			);
		}
	}
}

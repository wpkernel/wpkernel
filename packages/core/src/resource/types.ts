/**
 * Resource system types
 *
 * Defines the contract for resource definitions and their generated clients.
 * Resources are the canonical way to declare typed REST endpoints with
 * automatic store registration and cache management.
 *
 * @see Product Specification § 4.1 Resources
 */
import type { CacheKeyPattern } from './cache';
import type { Reporter } from '../reporter';
import type { HttpMethod } from '../http/types';

/**
 * Route definition for a single REST operation
 *
 * @example
 * ```ts
 * { path: '/my-plugin/v1/things/:id', method: 'GET' }
 * ```
 */
export type ResourceRoute = {
	/** REST API path (may include :id, :slug patterns) */
	path: string;
	/** HTTP method */
	method: HttpMethod;
	/** Optional capability identifier used by tooling to map to capability checks */
	capability?: string;
};

/**
 * Extracts the capability string from a given ResourceRoute type.
 *
 * @template TRoute - The type of the resource route.
 * @category Capability
 */
export type ExtractRouteCapability<TRoute> = TRoute extends {
	capability?: infer TCapability;
}
	? NonNullable<TCapability> extends string
		? NonNullable<TCapability>
		: never
	: never;

/**
 * Capability keys referenced across all configured routes.
 */
export type RouteCapabilityKeys<TRoutes> = Extract<
	{
		[TKey in keyof TRoutes]: ExtractRouteCapability<
			NonNullable<TRoutes[TKey]>
		>;
	}[keyof TRoutes],
	string
>;

/**
 * Identifier configuration for CLI-generated helpers.
 *
 * Runtime ignores this by default but accepts the fields so configs remain compatible.
 */
export type ResourceIdentityConfig =
	| {
			type: 'number';
			param?: 'id';
	  }
	| {
			type: 'string';
			param?: 'id' | 'slug' | 'uuid';
	  };

/**
 * Descriptor for post meta fields when using WordPress persistence adapters.
 *
 * Included for forward compatibility with CLI-generated registration code.
 */
export type ResourcePostMetaDescriptor = {
	type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
	single?: boolean;
};

/**
 * High-level storage configuration for CLI-driven persistence.
 *
 * The runtime does not consume these properties directly; they exist so resource
 * definitions remain type-safe when enriched via generators.
 */
export type ResourceStorageConfig =
	| { mode: 'transient' }
	| {
			mode: 'wp-post';
			postType?: string;
			statuses?: string[];
			supports?: ('title' | 'editor' | 'excerpt' | 'custom-fields')[];
			meta?: Record<string, ResourcePostMetaDescriptor>;
			taxonomies?: Record<
				string,
				{
					taxonomy: string;
					hierarchical?: boolean;
					register?: boolean;
				}
			>;
	  }
	| {
			mode: 'wp-taxonomy';
			taxonomy: string;
			hierarchical?: boolean;
	  }
	| {
			mode: 'wp-option';
			option: string;
	  };

/**
 * Shallow admin UI configuration.
 *
 * Public config does *not* describe DataViews internals or menu wiring.
 * Those are inferred from schema/storage/capabilities + layout manifest.
 */
export interface ResourceAdminUIConfig {
	/**
	 * Selected admin view implementation.
	 * 'dataviews' is the canonical value; others reserved for future.
	 */
	view?: 'dataviews' | string;

	/**
	 * Reserved for future extensions / internal tagging.
	 */
	[key: string]: unknown;
}

/**
 * Top-level UI metadata attached to a resource.
 */
export interface ResourceUIConfig {
	admin?: ResourceAdminUIConfig;
	[key: string]: unknown;
}

/**
 * Standard CRUD routes for a resource
 *
 * All routes are optional. At minimum, define the operations your resource supports.
 *
 * @example
 * ```ts
 * {
 *   list: { path: '/my-plugin/v1/things', method: 'GET' },
 *   get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
 *   create: { path: '/my-plugin/v1/things', method: 'POST' },
 *   update: { path: '/my-plugin/v1/things/:id', method: 'PUT' },
 *   remove: { path: '/my-plugin/v1/things/:id', method: 'DELETE' }
 * }
 * ```
 */
export type ResourceRoutes = {
	/** Fetch a list/collection of resources */
	list?: ResourceRoute;
	/** Fetch a single resource by identifier */
	get?: ResourceRoute;
	/** Create a new resource */
	create?: ResourceRoute;
	/** Update an existing resource */
	update?: ResourceRoute;
	/** Delete a resource */
	remove?: ResourceRoute;
};

/**
 * Cache key generator function
 *
 * Generates a unique key for caching resource data in the store.
 * Keys should be deterministic based on query parameters.
 *
 * @param params - Query parameters or identifier
 * @return Array of cache key segments
 *
 * @example
 * ```ts
 * (params) => ['thing', 'list', params?.q, params?.cursor]
 * (id) => ['thing', 'get', id]
 * ```
 */
export type CacheKeyFn<TParams = unknown> = (
	params?: TParams
) => (string | number | boolean | null | undefined)[];

/**
 * Cache key generators for all CRUD operations
 *
 * @example
 * ```ts
 * {
 *   list: (q) => ['thing', 'list', q?.search, q?.page],
 *   get: (id) => ['thing', 'get', id]
 * }
 * ```
 */
export type CacheKeys<TListParams = unknown> = {
	/** Cache key for list operations */
	list?: CacheKeyFn<TListParams>;
	/** Cache key for single-item fetch */
	get?: CacheKeyFn<string | number>;
	/** Cache key for create operations (typically not cached) */
	create?: CacheKeyFn<unknown>;
	/** Cache key for update operations */
	update?: CacheKeyFn<string | number>;
	/** Cache key for delete operations */
	remove?: CacheKeyFn<string | number>;
};

/**
 * Descriptor for query parameters exposed by a resource.
 *
 * Used by tooling to generate REST argument metadata.
 */
export type ResourceQueryParamDescriptor = {
	type: 'string' | 'enum';
	optional?: boolean;
	enum?: readonly string[];
	description?: string;
};

/**
 * Declarative map of supported query parameters for the resource.
 *
 * Tooling uses this to derive REST argument schemas, filters, and documentation.
 * The runtime treats this as metadata and does not enforce it directly.
 *
 * @category Resource
 */
export type ResourceQueryParams = Record<string, ResourceQueryParamDescriptor>;

/**
 * Capability descriptor for object-level or resource-level checks.
 */
export type ResourceCapabilityDescriptor = {
	/** WordPress capability to check (e.g., 'edit_posts') */
	capability: string;
	/** Whether this applies to the resource collection or individual objects */
	appliesTo: 'resource' | 'object';
	/** Optional parameter binding for object-level checks (e.g., 'id', 'postId') */
	binding?: string;
};

/**
 * Capability map for a resource.
 *
 * Maps capability keys to WordPress capabilities. Values can be:
 * - String: Simple WordPress capability (e.g., 'edit_posts')
 * - Object: Detailed descriptor with appliesTo and optional binding
 */
export type ResourceCapabilityMap<
	TRoutes extends ResourceRoutes = ResourceRoutes,
> = Partial<
	Record<RouteCapabilityKeys<TRoutes>, string | ResourceCapabilityDescriptor>
>;

/**
 * Complete resource definition configuration
 *
 * @template T - The resource entity type (e.g., Thing)
 * @template TQuery - Query parameters type for list operations (e.g., { q?: string })
 *
 * @example
 * ```ts
 * const thing = defineResource<Thing, { q?: string }>({
 *   name: 'thing',
 *   routes: {
 *     list: { path: '/my-plugin/v1/things', method: 'GET' },
 *     get: { path: '/my-plugin/v1/things/:id', method: 'GET' }
 *   },
 *   cacheKeys: {
 *     list: (q) => ['thing', 'list', q?.q],
 *     get: (id) => ['thing', 'get', id]
 *   },
 *   schema: import('./thing.schema.json')
 * })
 * ```
 */
export type ResourceStoreOptions<T, TQuery = unknown> = {
	/**
	 * Function to extract ID from an item.
	 * Defaults to (item) => item.id
	 */
	getId?: (item: T) => string | number;

	/**
	 * Function to generate query key from query params.
	 * Defaults to JSON.stringify
	 */
	getQueryKey?: (query?: TQuery) => string;

	/**
	 * Initial state overrides for the store.
	 */
	initialState?: Partial<ResourceState<T>>;
};

/**
 * Declarative configuration for a resource.
 *
 * This is consumed by `defineResource()` to:
 * - describe REST routes and capabilities
 * - configure cache keys and store behavior
 * - attach optional UI and persistence metadata for generators and tooling
 *
 * @typeParam T        - Entity shape returned by the resource (e.g. `Job`).
 * @typeParam TQuery   - Query shape for list operations (e.g. `{ search?: string }`).
 * @typeParam _TTypes  - Internal tuple preserved for helper typing; not intended for direct use.
 *
 * @category Resource
 */
export type ResourceConfig<
	T = unknown,
	TQuery = unknown,
	TRoutes extends ResourceRoutes = ResourceRoutes,
	// Type parameters used by defineResource function signature, not directly in this interface

	_TTypes = [T, TQuery, TRoutes],
> = {
	/**
	 * Unique resource name (lowercase, singular recommended)
	 *
	 * Used for store keys, event names, and debugging
	 */
	name: string;

	/**
	 * REST route definitions
	 *
	 * Define only the operations your resource supports
	 */
	routes: TRoutes;

	/**
	 * Optional identifier hints used by tooling.
	 *
	 * The runtime ignores this field; CLI tooling can derive store defaults and route helpers.
	 */
	identity?: ResourceIdentityConfig;

	/**
	 * Optional persistence strategy metadata.
	 *
	 * The runtime ignores this field; CLI tooling can emit registration scaffolding.
	 */
	storage?: ResourceStorageConfig;

	/**
	 * Optional overrides for store configuration.
	 *
	 * Provided for forward compatibility with CLI-generated descriptors.
	 */
	store?: ResourceStoreOptions<T, TQuery>;

	/**
	 * Cache key generators
	 *
	 * Optional. If omitted, default cache keys based on resource name will be used
	 */
	cacheKeys?: CacheKeys<TQuery>;

	/**
	 * Namespace for events and store keys
	 *
	 * Optional. If omitted, namespace will be auto-detected from plugin context.
	 * For explicit control, provide a namespace string.
	 *
	 * @example
	 * ```ts
	 * namespace: 'my-plugin'  // Explicit namespace
	 * // OR
	 * name: 'my-plugin:job'   // Shorthand namespace:name format
	 * ```
	 */
	namespace?: string;

	/**
	 * JSON Schema for runtime validation
	 *
	 * Optional. Provides runtime type safety and validation errors
	 *
	 * @example
	 * ```ts
	 * schema: import('../../contracts/thing.schema.json')
	 * ```
	 */
	schema?: Promise<unknown> | unknown | string;

	/**
	 * Optional query parameter descriptors for tooling.
	 */
	queryParams?: ResourceQueryParams;

	/**
	 * Optional reporter override for resource instrumentation.
	 *
	 * When provided, the resource will emit debug/info/error logs through this
	 * reporter instead of creating a child reporter from the WPKernel instance.
	 */
	reporter?: Reporter;

	/**
	 * Optional UI metadata surfaced to runtime integrations (e.g., DataViews).
	 */
	ui?: ResourceUIConfig;

	/**
	 * Optional inline capability mappings.
	 *
	 * Maps capability keys (from route definitions) to WordPress capabilities.
	 * Each resource can define its own capability mappings inline, and these
	 * will be collected by the CLI during code generation.
	 *
	 * @example
	 * ```ts
	 * capabilities: {
	 *   'book.create': 'edit_posts',
	 *   'book.update': 'edit_others_posts',
	 *   'book.delete': { capability: 'delete_posts', appliesTo: 'object', binding: 'id' }
	 * }
	 * ```
	 */
	capabilities?: ResourceCapabilityMap<TRoutes>;
};

/**
 * Admin menu metadata for a generated DataViews screen.
 *
 * When provided under `ui.admin.dataviews.screen.menu`, the CLI can emit
 * matching PHP shims to register the screen in the WordPress admin menu.
 *
 * @category Resource
 */
export interface ResourceDataViewsMenuConfig {
	slug: string;
	title: string;
	capability?: string;
	parent?: string;
	position?: number;
	[key: string]: unknown;
}

/**
 * List response with pagination metadata
 *
 * @template T - The resource entity type
 */
export type ListResponse<T> = {
	/** Array of resource entities */
	items: T[];
	/** Total count of items (if available) */
	total?: number;
	/** Pagination cursor for next page */
	nextCursor?: string;
	/** Whether there are more pages */
	hasMore?: boolean;
};

/**
 * Client methods for REST operations
 *
 * Generated automatically by defineResource based on configured routes.
 * All methods return Promises with typed responses.
 *
 * @template T - The resource entity type
 * @template TQuery - Query parameters type for list operations
 */
export type ResourceClient<T = unknown, TQuery = unknown> = {
	/**
	 * Fetch a list of resources
	 *
	 * @param query - Query parameters (filters, pagination, etc.)
	 * @return Promise resolving to list response
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error
	 */
	fetchList?: (query?: TQuery) => Promise<ListResponse<T>>;

	/**
	 * Fetch a single resource by ID
	 *
	 * @param id - Resource identifier
	 * @return Promise resolving to resource entity
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error (including 404)
	 */
	fetch?: (id: string | number) => Promise<T>;

	/**
	 * Create a new resource
	 *
	 * @param data - Resource data to create
	 * @return Promise resolving to created resource
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error (including validation errors)
	 */
	create?: (data: Partial<T>) => Promise<T>;

	/**
	 * Update an existing resource
	 *
	 * @param id   - Resource identifier
	 * @param data - Partial resource data to update
	 * @return Promise resolving to updated resource
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error (including 404, validation errors)
	 */
	update?: (id: string | number, data: Partial<T>) => Promise<T>;

	/**
	 * Delete a resource
	 *
	 * @param id - Resource identifier
	 * @return Promise resolving to void or deleted resource
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error (including 404)
	 */
	remove?: (id: string | number) => Promise<void | T>;

	/**
	 * Optional UI metadata carried over from ResourceConfig.ui.
	 */
	ui?: ResourceUIConfig;
};

/**
 * Complete resource object returned by defineResource
 *
 * Combines client methods, store key, cache key generators, and metadata.
 * Provides both thin-flat API (direct methods) and grouped API (namespaces).
 *
 * @template T - The resource entity type
 * @template TQuery - Query parameters type for list operations
 *
 * @example
 * ```ts
 * const thing = defineResource<Thing, { q?: string }>({ ... });
 *
 * // Use client methods (thin-flat API)
 * const items = await thing.fetchList({ q: 'search' });
 * const item = await thing.fetch(123);
 *
 * // Use React hooks
 * const { data, isLoading } = thing.useGet(123);
 * const { data: items } = thing.useList({ q: 'search' });
 *
 * // Prefetch data
 * await thing.prefetchGet(123);
 * await thing.prefetchList({ q: 'search' });
 *
 * // Instance-based invalidation (include resource name as first segment)
 * thing.invalidate(['thing', 'list']); // Invalidate all lists
 * thing.invalidate(['thing', 'list', 'active']); // Invalidate specific query
 *
 * // Generate cache keys
 * const key = thing.key('list', { q: 'search' });
 *
 * // Use in store selectors
 * const storeKey = thing.storeKey; // 'my-plugin/thing'
 *
 * // Access @wordpress/data store (lazy-loaded, auto-registered)
 * const store = thing.store;
 * const item = select(store).getItem(123);
 * ```
 */
export type ResourceObject<
	T = unknown,
	TQuery = unknown,
	TRoutes extends ResourceRoutes = ResourceRoutes,
> = {
	/**
	 * Resource name
	 */
	name: string;

	/**
	 * WordPress data store key (e.g., 'my-plugin/thing')
	 *
	 * Used for store registration and selectors
	 */
	storeKey: string;

	/**
	 * Lazy-loaded @wordpress/data store
	 *
	 * Automatically registered on first access.
	 * Returns the store descriptor compatible with select/dispatch.
	 *
	 * @example
	 * ```ts
	 * import { select } from '@wordpress/data';
	 * const item = select(thing.store).getItem(123);
	 * ```
	 */
	readonly store: unknown; // Type is unknown because @wordpress/data types are complex

	/**
	 * Cache key generators for all operations
	 *
	 * Use these to generate cache keys for invalidation
	 */
	cacheKeys: Required<CacheKeys<TQuery>>;

	/**
	 * REST route definitions (normalized)
	 */
	routes: TRoutes;

	/**
	 * Reporter instance used for resource instrumentation.
	 */
	reporter: Reporter;

	// Thin-flat API: React hooks
	/**
	 * React hook to fetch a single item
	 *
	 * Uses @wordpress/data's useSelect under the hood.
	 * Automatically handles loading states and re-fetching.
	 * Requires the `@wpkernel/ui` package to register hooks.
	 *
	 * @param id - Item identifier
	 * @return Hook result with data, isLoading, error
	 *
	 * @example
	 * ```ts
	 * function ThingView({ id }: { id: number }) {
	 *   const { data: thing, isLoading } = thing.useGet(id);
	 *   if (isLoading) return <Spinner />;
	 *   return <div>{thing.title}</div>;
	 * }
	 * ```
	 */
	useGet?: (id: string | number) => {
		data: T | undefined;
		isLoading: boolean;
		error: string | undefined;
	};

	/**
	 * React hook to fetch a list of items
	 *
	 * Uses @wordpress/data's useSelect under the hood.
	 * Automatically handles loading states and re-fetching.
	 * Requires the `@wpkernel/ui` package to register hooks.
	 *
	 * @param query - Query parameters
	 * @return Hook result with data, isLoading, error
	 *
	 * @example
	 * ```ts
	 * function ThingList({ status }: { status: string }) {
	 *   const { data, isLoading } = thing.useList({ status });
	 *   if (isLoading) return <Spinner />;
	 *   return <List items={data?.items} />;
	 * }
	 * ```
	 */
	useList?: (query?: TQuery) => {
		data: ListResponse<T> | undefined;
		isLoading: boolean;
		error: string | undefined;
	};

	// Thin-flat API: Prefetch methods
	/**
	 * Prefetch a single item into the cache
	 *
	 * Useful for optimistic loading or preloading data before navigation.
	 * Does not return the data, only ensures it's in the cache.
	 *
	 * @param id - Item identifier
	 * @return Promise resolving when prefetch completes
	 *
	 * @example
	 * ```ts
	 * // Prefetch on hover
	 * <Link onMouseEnter={() => thing.prefetchGet(123)}>
	 *   View Thing
	 * </Link>
	 * ```
	 */
	prefetchGet?: (id: string | number) => Promise<void>;

	/**
	 * Prefetch a list of items into the cache
	 *
	 * Useful for optimistic loading or preloading data before navigation.
	 * Does not return the data, only ensures it's in the cache.
	 *
	 * @param query - Query parameters
	 * @return Promise resolving when prefetch completes
	 *
	 * @example
	 * ```ts
	 * // Prefetch on app mount
	 * useEffect(() => {
	 *   thing.prefetchList({ status: 'active' });
	 * }, []);
	 * ```
	 */
	prefetchList?: (query?: TQuery) => Promise<void>;

	// Thin-flat API: Cache management
	/**
	 * Invalidate cached data for this resource
	 *
	 * Instance method alternative to global `invalidate()` function.
	 * Automatically scoped to this resource's store.
	 *
	 * @param patterns - Cache key patterns to invalidate
	 *
	 * @example
	 * ```ts
	 * // After creating a thing
	 * await thing.create(data);
	 * thing.invalidate([['thing', 'list']]); // Invalidate all lists
	 *
	 * // After updating
	 * await thing.update(id, data);
	 * thing.invalidate([['thing', 'get', id]]); // Invalidate specific item
	 * thing.invalidate([['thing', 'list']]); // Also invalidate lists
	 * ```
	 */
	invalidate: (patterns: CacheKeyPattern | CacheKeyPattern[]) => void;

	/**
	 * Generate a cache key for this resource
	 *
	 * Useful for manual cache management or debugging.
	 *
	 * @param operation - Operation name ('list', 'get', etc.)
	 * @param params    - Parameters for the operation
	 * @return Cache key array
	 *
	 * @example
	 * ```ts
	 * const key = thing.key('list', { status: 'active' });
	 * // => ['thing', 'list', '{"status":"active"}']
	 *
	 * const key2 = thing.key('get', 123);
	 * // => ['thing', 'get', 123]
	 * ```
	 */
	key: (
		operation: 'list' | 'get' | 'create' | 'update' | 'remove',
		params?: TQuery | string | number | Partial<T>
	) => (string | number | boolean)[];

	// Grouped API (power users)
	/**
	 * Grouped API: Pure selectors (no fetching)
	 *
	 * Access cached data without triggering network requests.
	 * Ideal for computed values and derived state.
	 */
	select?: {
		/**
		 * Get cached item by ID (no fetch)
		 * @param id - Item identifier
		 * @return Cached item or undefined
		 */
		item: (id: string | number) => T | undefined;

		/**
		 * Get all cached items (no fetch)
		 * @return Array of all cached items
		 */
		items: () => T[];

		/**
		 * Get cached list by query (no fetch)
		 * @param query - Query parameters
		 * @return Array of items matching query or empty array
		 */
		list: (query?: TQuery) => T[];
	};

	/**
	 * Grouped API: Explicit data fetching (bypass cache)
	 *
	 * Direct network calls that always hit the server.
	 * Useful for refresh actions or real-time data requirements.
	 */
	get?: {
		/**
		 * Get item from server (bypass cache)
		 *
		 * Always fetches fresh data from the server, ignoring cache.
		 * Use for explicit refresh actions or real-time requirements.
		 *
		 * @param id - Item identifier
		 * @return Promise resolving to the item
		 */
		item: (id: string | number) => Promise<T>;

		/**
		 * Get list from server (bypass cache)
		 *
		 * Always fetches fresh data from the server, ignoring cache.
		 * Use for explicit refresh actions or real-time requirements.
		 *
		 * @param query - Optional query parameters
		 * @return Promise resolving to list response
		 */
		list: (query?: TQuery) => Promise<ListResponse<T>>;
	};

	/**
	 * Grouped API: Mutations (CRUD operations)
	 *
	 * Write operations that modify server state.
	 */
	mutate?: {
		/**
		 * Create new item
		 */
		create: (data: Partial<T>) => Promise<T>;

		/**
		 * Update existing item
		 */
		update: (id: string | number, data: Partial<T>) => Promise<T>;

		/**
		 * Delete item
		 */
		remove: (id: string | number) => Promise<void>;
	};

	/**
	 * Grouped API: Cache control
	 *
	 * Fine-grained cache management operations.
	 */
	cache: {
		/**
		 * Prefetch operations (eager loading)
		 */
		prefetch: {
			/**
			 * Prefetch single item into cache
			 */
			item: (id: string | number) => Promise<void>;

			/**
			 * Prefetch list into cache
			 */
			list: (query?: TQuery) => Promise<void>;
		};

		/**
		 * Cache invalidation operations
		 */
		invalidate: {
			/**
			 * Invalidate cached item by ID
			 */
			item: (id: string | number) => void;

			/**
			 * Invalidate cached list by query
			 */
			list: (query?: TQuery) => void;

			/**
			 * Invalidate all cached data for this resource
			 */
			all: () => void;
		};

		/**
		 * Generate cache key
		 */
		key: (
			operation: 'list' | 'get' | 'create' | 'update' | 'remove',
			params?: TQuery | string | number | Partial<T>
		) => (string | number | boolean)[];
	};

	/**
	 * Grouped API: Store access
	 *
	 * Direct access to @wordpress/data store internals.
	 */
	storeApi: {
		/**
		 * Store key for @wordpress/data
		 */
		key: string;

		/**
		 * Store descriptor (lazy-loaded)
		 */
		descriptor: unknown;
	};

	/**
	 * Grouped API: Event names
	 *
	 * Canonical event names for this resource.
	 */
	events?: {
		/**
		 * Fired when item is created
		 */
		created: string;

		/**
		 * Fired when item is updated
		 */
		updated: string;

		/**
		 * Fired when item is removed
		 */
		removed: string;
	};
} & ResourceClient<T, TQuery>;

/**
 * State shape for a resource store.
 *
 * @template T - The resource entity type
 */
export type ResourceListStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Normalized state shape for a resource store.
 *
 * Tracks items, list mappings, list metadata, and per-key errors in a form
 * consumable by `@wordpress/data` selectors and resolvers.
 *
 * @typeParam T - Entity shape stored in the resource.
 *
 * @category Resource
 */
export type ResourceState<T> = {
	/**
	 * Map of items by ID.
	 */
	items: Record<string | number, T>;

	/**
	 * List queries and their results.
	 * Key is stringified query params, value is array of IDs.
	 */
	lists: Record<string, (string | number)[]>;

	/**
	 * List metadata (total count, pagination, etc).
	 */
	listMeta: Record<
		string,
		{
			total?: number;
			hasMore?: boolean;
			nextCursor?: string;
			status?: ResourceListStatus;
		}
	>;

	/**
	 * Error messages by cache key.
	 */
	errors: Record<string, string>;
};

/**
 * Generic function type accepting any arguments and returning unknown.
 * Used internally for flexible action type definitions.
 * @public
 */
export type AnyFn = (...args: never[]) => unknown;

/**
 * Actions for a resource store.
 *
 * @template T - The resource entity type
 */
export type ResourceActions<T> = {
	/**
	 * Receive a single item.
	 *
	 * @param item - The item to store
	 */
	receiveItem: (item: T) => void;

	/**
	 * Receive multiple items from a list query.
	 *
	 * @param queryKey - Stringified query parameters
	 * @param items    - Array of items
	 * @param meta     - List metadata (total, hasMore, nextCursor)
	 */
	receiveItems: (
		queryKey: string,
		items: T[],
		meta?: {
			total?: number;
			hasMore?: boolean;
			nextCursor?: string;
			status?: ResourceListStatus;
		}
	) => void;

	/**
	 * Store an error for a given cache key.
	 *
	 * @param cacheKey - The cache key that failed
	 * @param error    - Error message
	 */
	receiveError: (cacheKey: string, error: string) => void;

	/**
	 * Clear cached data for specific cache keys.
	 *
	 * @param cacheKeys - Array of cache keys to invalidate
	 */
	invalidate: (cacheKeys: string[]) => void;

	/**
	 * Clear all cached data for this resource.
	 */
	invalidateAll: () => void;

	/**
	 * Update the status of a list query.
	 *
	 * @param queryKey - Stringified query parameters
	 * @param status   - Loading status
	 */
	setListStatus: (queryKey: string, status: ResourceListStatus) => void;
} & Record<string, AnyFn>;

/**
 * Selectors for a resource store.
 *
 * @template T - The resource entity type
 * @template TQuery - The query parameter type for list operations
 */
export type ResourceSelectors<T, TQuery = unknown> = {
	/**
	 * Get a single item by ID.
	 *
	 * @param state - Store state
	 * @param id    - Item ID
	 * @return The item or undefined if not found
	 */
	getItem: (state: ResourceState<T>, id: string | number) => T | undefined;

	/**
	 * Get items from a list query.
	 *
	 * @param state - Store state
	 * @param query - Query parameters
	 * @return Array of items
	 */
	getItems: (state: ResourceState<T>, query?: TQuery) => T[];

	/**
	 * Get list response with metadata.
	 *
	 * @param state - Store state
	 * @param query - Query parameters
	 * @return List response with items and metadata
	 */
	getList: (state: ResourceState<T>, query?: TQuery) => ListResponse<T>;

	/**
	 * Get the status for a list query.
	 *
	 * @param state - Store state
	 * @param query - Query parameters
	 * @return List status
	 */
	getListStatus: (
		state: ResourceState<T>,
		query?: TQuery
	) => ResourceListStatus;

	/**
	 * Get the error message for a list query, if any.
	 *
	 * @param state - Store state
	 * @param query - Query parameters
	 * @return Error message or undefined
	 */
	getListError: (
		state: ResourceState<T>,
		query?: TQuery
	) => string | undefined;

	/**
	 * Check if a selector is currently resolving.
	 *
	 * Note: This is provided by @wordpress/data's resolution system.
	 * We include it here for type completeness.
	 *
	 * @param state        - Store state
	 * @param selectorName - Name of the selector
	 * @param args         - Arguments passed to the selector
	 * @return True if resolving
	 */
	isResolving: (
		state: ResourceState<T>,
		selectorName: string,
		args?: unknown[]
	) => boolean;

	/**
	 * Check if a selector has started resolution.
	 *
	 * Note: This is provided by @wordpress/data's resolution system.
	 * We include it here for type completeness.
	 *
	 * @param state        - Store state
	 * @param selectorName - Name of the selector
	 * @param args         - Arguments passed to the selector
	 * @return True if resolution has started
	 */
	hasStartedResolution: (
		state: ResourceState<T>,
		selectorName: string,
		args?: unknown[]
	) => boolean;

	/**
	 * Check if a selector has finished resolution.
	 *
	 * Note: This is provided by @wordpress/data's resolution system.
	 * We include it here for type completeness.
	 *
	 * @param state        - Store state
	 * @param selectorName - Name of the selector
	 * @param args         - Arguments passed to the selector
	 * @return True if resolution has finished
	 */
	hasFinishedResolution: (
		state: ResourceState<T>,
		selectorName: string,
		args?: unknown[]
	) => boolean;

	/**
	 * Get error for a cache key.
	 *
	 * @param state    - Store state
	 * @param cacheKey - The cache key
	 * @return Error message or undefined
	 */
	getError: (state: ResourceState<T>, cacheKey: string) => string | undefined;

	/**
	 * Internal selector to get the entire state.
	 * Used by cache invalidation system to find matching cache keys.
	 *
	 * @internal
	 * @param state - Store state
	 * @return The complete resource state
	 */
	__getInternalState: (state: ResourceState<T>) => ResourceState<T>;
};

/**
 * Resolvers for a resource store.
 *
 * @template _T - The resource entity type (unused, for type inference in store creation)
 * @template TQuery - The query parameter type for list operations
 */
export type ResourceResolvers<_T, TQuery = unknown> = {
	/**
	 * Resolver for getItem selector.
	 * Fetches a single item by ID if not already in state.
	 *
	 * @param id - Item ID
	 */
	getItem: (id: string | number) => Generator<unknown, void, unknown>;

	/**
	 * Resolver for getItems selector.
	 * Fetches a list of items if not already in state.
	 *
	 * @param query - Query parameters
	 */
	getItems: (query?: TQuery) => Generator<unknown, void, unknown>;

	/**
	 * Resolver for getList selector.
	 * Same as getItems but includes metadata.
	 *
	 * @param query - Query parameters
	 */
	getList: (query?: TQuery) => Generator<unknown, void, unknown>;
} & Record<string, AnyFn>;

/**
 * Store configuration for a resource.
 *
 * @template T - The resource entity type
 * @template TQuery - The query parameter type for list operations
 */
export type ResourceStoreConfig<T, TQuery = unknown> = {
	/**
	 * The resource object this store is for.
	 */
	resource: ResourceObject<T, TQuery>;

	/**
	 * Reporter instance used for store instrumentation.
	 */
	reporter?: Reporter;
} & ResourceStoreOptions<T, TQuery>;

/**
 * Complete store descriptor returned by createStore.
 *
 * @template T - The resource entity type
 * @template TQuery - The query parameter type for list operations
 */
export type ResourceStore<T, TQuery = unknown> = {
	/**
	 * Store key for registration with @wordpress/data.
	 */
	storeKey: string;

	/**
	 * State selectors.
	 */
	selectors: ResourceSelectors<T, TQuery>;

	/**
	 * State actions.
	 */
	actions: ResourceActions<T>;

	/**
	 * Resolvers for async data fetching.
	 */
	resolvers: ResourceResolvers<T, TQuery>;

	/**
	 * Reducer function for state updates.
	 */
	reducer: (
		state: ResourceState<T> | undefined,
		action: unknown
	) => ResourceState<T>;

	/**
	 * Initial state.
	 */
	initialState: ResourceState<T>;

	/**
	 * Controls for handling async operations in generators.
	 */
	controls?: Record<string, (action: unknown) => unknown>;
};

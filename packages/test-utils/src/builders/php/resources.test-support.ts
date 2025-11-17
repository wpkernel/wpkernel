import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type {
	ResourceIdentityConfig,
	ResourceStorageConfig,
} from '@wpkernel/core/resource';
import type {
	IRResourceCacheKeyLike,
	IRResourceLike,
	IRRouteLike,
	IRv1Like,
	IRWarningLike,
	WPKConfigV1Like,
} from '../../types.js';
import { loadDefaultLayout } from '../../layout.test-support.js';

type ResourceCacheKeys<TCacheKey extends IRResourceCacheKeyLike> = {
	readonly list: TCacheKey;
	readonly get: TCacheKey;
	readonly create?: TCacheKey;
	readonly update?: TCacheKey;
	readonly remove?: TCacheKey;
};

type WpPostStorageConfigLike = Extract<
	ResourceStorageConfig,
	{ mode: 'wp-post' }
>;
type WpTaxonomyStorageConfigLike = Extract<
	ResourceStorageConfig,
	{ mode: 'wp-taxonomy' }
>;
type WpOptionStorageConfigLike = Extract<
	ResourceStorageConfig,
	{ mode: 'wp-option' }
>;
type TransientStorageConfigLike = Extract<
	ResourceStorageConfig,
	{ mode: 'transient' }
>;

const DEFAULT_CACHE_KEYS = {
	list: { segments: ['books', 'list'] as const, source: 'default' as const },
	get: { segments: ['books', 'get'] as const, source: 'default' as const },
	create: {
		segments: ['books', 'create'] as const,
		source: 'default' as const,
	},
	update: {
		segments: ['books', 'update'] as const,
		source: 'default' as const,
	},
	remove: {
		segments: ['books', 'remove'] as const,
		source: 'default' as const,
	},
} as const;

export interface MakeWpPostResourceOptions<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TIdentity = ResourceIdentityConfig,
	TStorage extends WpPostStorageConfigLike = WpPostStorageConfigLike,
	TWarning extends IRWarningLike = IRWarningLike,
> {
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: readonly TRoute[];
	readonly cacheKeys?: ResourceCacheKeys<TCacheKey>;
	readonly identity?: TIdentity;
	readonly storage?: Partial<TStorage>;
	readonly hash?: string;
	readonly warnings?: readonly TWarning[];
}

export function makeWpPostRoutes(): IRRouteLike[] {
	return [
		{
			method: 'GET',
			path: '/wpk/v1/books',
			capability: undefined,
			hash: 'list',
			transport: 'local',
		},
		{
			method: 'GET',
			path: '/wpk/v1/books/:slug',
			capability: undefined,
			hash: 'get',
			transport: 'local',
		},
		{
			method: 'POST',
			path: '/wpk/v1/books',
			capability: undefined,
			hash: 'create',
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/wpk/v1/books/:slug',
			capability: undefined,
			hash: 'update',
			transport: 'local',
		},
		{
			method: 'DELETE',
			path: '/wpk/v1/books/:slug',
			capability: undefined,
			hash: 'remove',
			transport: 'local',
		},
	];
}

export function makeWpPostResource<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TIdentity = ResourceIdentityConfig,
	TStorage extends WpPostStorageConfigLike = WpPostStorageConfigLike,
	TWarning extends IRWarningLike = IRWarningLike,
>(
	options: MakeWpPostResourceOptions<
		TRoute,
		TCacheKey,
		TIdentity,
		TStorage,
		TWarning
	> = {}
): IRResourceLike<
	TRoute,
	TCacheKey,
	TIdentity,
	TStorage,
	unknown,
	unknown,
	TWarning
> {
	const storage = {
		mode: 'wp-post',
		postType: 'book',
		statuses: ['draft', 'publish'],
		supports: ['title'],
		meta: {
			status: { type: 'string', single: true },
			tags: { type: 'array', single: false },
		},
		taxonomies: {
			genres: { taxonomy: 'book_genre' },
		},
		...options.storage,
	} as TStorage;

	const cacheKeys = (options.cacheKeys ??
		DEFAULT_CACHE_KEYS) as ResourceCacheKeys<TCacheKey>;
	const routes = (options.routes ?? makeWpPostRoutes()) as readonly TRoute[];
	const identity = (options.identity ?? {
		type: 'string',
		param: 'slug',
	}) as TIdentity;
	const warnings = (options.warnings ?? []) as readonly TWarning[];

	return {
		name: options.name ?? 'books',
		schemaKey: options.schemaKey ?? 'book',
		schemaProvenance: 'manual',
		routes,
		cacheKeys,
		identity,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-hash',
		warnings,
	} as IRResourceLike<
		TRoute,
		TCacheKey,
		TIdentity,
		TStorage,
		unknown,
		unknown,
		TWarning
	>;
}

export interface MakeWpTaxonomyResourceOptions<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TIdentity = ResourceIdentityConfig,
	TStorage extends WpTaxonomyStorageConfigLike = WpTaxonomyStorageConfigLike,
	TWarning extends IRWarningLike = IRWarningLike,
> {
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: readonly TRoute[];
	readonly cacheKeys?: ResourceCacheKeys<TCacheKey>;
	readonly identity?: TIdentity;
	readonly storage?: Partial<TStorage>;
	readonly hash?: string;
	readonly warnings?: readonly TWarning[];
}

export function makeWpTaxonomyResource<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TIdentity = ResourceIdentityConfig,
	TStorage extends WpTaxonomyStorageConfigLike = WpTaxonomyStorageConfigLike,
	TWarning extends IRWarningLike = IRWarningLike,
>(
	options: MakeWpTaxonomyResourceOptions<
		TRoute,
		TCacheKey,
		TIdentity,
		TStorage,
		TWarning
	> = {}
): IRResourceLike<
	TRoute,
	TCacheKey,
	TIdentity,
	TStorage,
	unknown,
	unknown,
	TWarning
> {
	const storage = {
		mode: 'wp-taxonomy',
		taxonomy: 'job_category',
		hierarchical: true,
		...options.storage,
	} as TStorage;

	const defaultRoutes: IRRouteLike[] = [
		{
			method: 'GET',
			path: '/wpk/v1/job-categories',
			capability: undefined,
			hash: 'taxonomy-list',
			transport: 'local',
		},
		{
			method: 'GET',
			path: '/wpk/v1/job-categories/:slug',
			capability: undefined,
			hash: 'taxonomy-get',
			transport: 'local',
		},
	];

	const cacheKeys = (options.cacheKeys ?? {
		list: { segments: ['jobCategories', 'list'], source: 'default' },
		get: { segments: ['jobCategories', 'get'], source: 'default' },
		create: { segments: [], source: 'default' },
		update: { segments: [], source: 'default' },
		remove: { segments: [], source: 'default' },
	}) as ResourceCacheKeys<TCacheKey>;
	const routes = (options.routes ?? defaultRoutes) as readonly TRoute[];
	const identity = (options.identity ?? {
		type: 'string',
		param: 'slug',
	}) as TIdentity;
	const warnings = (options.warnings ?? []) as readonly TWarning[];

	return {
		name: options.name ?? 'jobCategories',
		schemaKey: options.schemaKey ?? 'jobCategory',
		schemaProvenance: 'manual',
		routes,
		cacheKeys,
		identity,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'taxonomy-resource',
		warnings,
	} as IRResourceLike<
		TRoute,
		TCacheKey,
		TIdentity,
		TStorage,
		unknown,
		unknown,
		TWarning
	>;
}

export interface MakeWpOptionResourceOptions<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TStorage extends WpOptionStorageConfigLike = WpOptionStorageConfigLike,
	TWarning extends IRWarningLike = IRWarningLike,
> {
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: readonly TRoute[];
	readonly cacheKeys?: ResourceCacheKeys<TCacheKey>;
	readonly storage?: Partial<TStorage>;
	readonly hash?: string;
	readonly warnings?: readonly TWarning[];
}

export function makeWpOptionResource<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TStorage extends WpOptionStorageConfigLike = WpOptionStorageConfigLike,
	TWarning extends IRWarningLike = IRWarningLike,
>(
	options: MakeWpOptionResourceOptions<
		TRoute,
		TCacheKey,
		TStorage,
		TWarning
	> = {}
): IRResourceLike<
	TRoute,
	TCacheKey,
	ResourceIdentityConfig | undefined,
	TStorage,
	unknown,
	unknown,
	TWarning
> {
	const storage = {
		mode: 'wp-option',
		option: 'demo_option',
		...options.storage,
	} as TStorage;

	const defaultRoutes: IRRouteLike[] = [
		{
			method: 'GET',
			path: '/wpk/v1/demo-option',
			capability: undefined,
			hash: 'wp-option-get',
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/wpk/v1/demo-option',
			capability: undefined,
			hash: 'wp-option-update',
			transport: 'local',
		},
	];

	const cacheKeys = (options.cacheKeys ?? {
		list: { segments: ['demoOption', 'list'], source: 'default' },
		get: { segments: ['demoOption', 'get'], source: 'default' },
		update: { segments: ['demoOption', 'update'], source: 'default' },
		remove: { segments: ['demoOption', 'remove'], source: 'default' },
	}) as ResourceCacheKeys<TCacheKey>;
	const routes = (options.routes ?? defaultRoutes) as readonly TRoute[];
	const warnings = (options.warnings ?? []) as readonly TWarning[];

	return {
		name: options.name ?? 'demoOption',
		schemaKey: options.schemaKey ?? 'demoOption',
		schemaProvenance: 'manual',
		routes,
		cacheKeys,
		identity: undefined,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'wp-option-resource',
		warnings,
	} as IRResourceLike<
		TRoute,
		TCacheKey,
		ResourceIdentityConfig | undefined,
		TStorage,
		unknown,
		unknown,
		TWarning
	>;
}

export interface MakeTransientResourceOptions<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TStorage extends TransientStorageConfigLike = TransientStorageConfigLike,
	TIdentity = ResourceIdentityConfig | undefined,
	TWarning extends IRWarningLike = IRWarningLike,
> {
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: readonly TRoute[];
	readonly cacheKeys?: ResourceCacheKeys<TCacheKey>;
	readonly storage?: Partial<TStorage>;
	readonly hash?: string;
	readonly identity?: TIdentity;
	readonly warnings?: readonly TWarning[];
}

export function makeTransientResource<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TStorage extends TransientStorageConfigLike = TransientStorageConfigLike,
	TIdentity = ResourceIdentityConfig | undefined,
	TWarning extends IRWarningLike = IRWarningLike,
>(
	options: MakeTransientResourceOptions<
		TRoute,
		TCacheKey,
		TStorage,
		TIdentity,
		TWarning
	> = {}
): IRResourceLike<
	TRoute,
	TCacheKey,
	TIdentity,
	TStorage,
	unknown,
	unknown,
	TWarning
> {
	const storage = {
		mode: 'transient',
		...options.storage,
	} as TStorage;

	const defaultRoutes: IRRouteLike[] = [
		{
			method: 'GET',
			path: '/wpk/v1/job-cache',
			capability: undefined,
			hash: 'transient-get',
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/wpk/v1/job-cache',
			capability: undefined,
			hash: 'transient-set',
			transport: 'local',
		},
		{
			method: 'DELETE',
			path: '/wpk/v1/job-cache',
			capability: undefined,
			hash: 'transient-delete',
			transport: 'local',
		},
	];

	const cacheKeys = (options.cacheKeys ?? {
		list: { segments: ['jobCache', 'list'], source: 'default' },
		get: { segments: ['jobCache', 'get'], source: 'default' },
		create: { segments: [], source: 'default' },
		update: { segments: ['jobCache', 'update'], source: 'default' },
		remove: { segments: ['jobCache', 'remove'], source: 'default' },
	}) as ResourceCacheKeys<TCacheKey>;
	const routes = (options.routes ?? defaultRoutes) as readonly TRoute[];
	const warnings = (options.warnings ?? []) as readonly TWarning[];

	return {
		name: options.name ?? 'jobCache',
		schemaKey: options.schemaKey ?? 'jobCache',
		schemaProvenance: 'manual',
		routes,
		cacheKeys,
		identity: options.identity as TIdentity,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'transient-resource',
		warnings,
	} as IRResourceLike<
		TRoute,
		TCacheKey,
		TIdentity,
		TStorage,
		unknown,
		unknown,
		TWarning
	>;
}

export interface MakePhpIrFixtureOptions<
	TRoute extends IRRouteLike = IRRouteLike,
	TResource extends IRResourceLike<TRoute> = IRResourceLike<TRoute>,
> {
	readonly resources?: readonly TResource[];
}

export function makePhpIrFixture<
	TRoute extends IRRouteLike = IRRouteLike,
	TResource extends IRResourceLike<TRoute> = IRResourceLike<TRoute>,
>(
	options: MakePhpIrFixtureOptions<TRoute, TResource> = {}
): IRv1Like<WPKConfigV1Like, unknown, TRoute, TResource> {
	const layout = loadDefaultLayout();
	const resources =
		options.resources ??
		([
			makeWpPostResource(),
			makeWpTaxonomyResource(),
			makeWpOptionResource(),
			makeTransientResource(),
		] as unknown as readonly TResource[]);

	return {
		meta: {
			version: 1,
			namespace: 'demo-plugin',
			sanitizedNamespace: 'DemoPlugin',
			origin: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			sourcePath: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
		},
		config: {
			version: 1,
			namespace: 'demo-plugin',
			schemas: {},
			resources: {},
		},
		schemas: [],
		resources,
		capabilities: [],
		capabilityMap: {
			sourcePath: undefined,
			definitions: [],
			fallback: {
				capability: 'manage_options',
				appliesTo: 'resource',
			},
			missing: [],
			unused: [],
			warnings: [],
		},
		blocks: [],
		php: {
			namespace: 'Demo\\Plugin',
			autoload: 'inc/',
			outputDir: layout.resolve('php.generated'),
		},
		layout,
	} as IRv1Like<WPKConfigV1Like, unknown, TRoute, TResource>;
}

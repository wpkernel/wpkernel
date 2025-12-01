import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type {
	ResourceIdentityConfig,
	ResourceStorageConfig,
} from '@wpkernel/core/resource';
import type {
	IRHashProvenance,
	IRResource,
	IRRoute,
	IRv1,
	IRWarning,
} from '../../src/ir/publicTypes';
import { loadDefaultLayout } from '../layout.test-support.js';
import { makeResource } from './fixtures.test-support.js';

type WpPostStorageConfig = Extract<ResourceStorageConfig, { mode: 'wp-post' }>;
type WpTaxonomyStorageConfig = Extract<
	ResourceStorageConfig,
	{ mode: 'wp-taxonomy' }
>;
type WpOptionStorageConfig = Extract<
	ResourceStorageConfig,
	{ mode: 'wp-option' }
>;
type TransientStorageConfig = Extract<
	ResourceStorageConfig,
	{ mode: 'transient' }
>;

const makeHash = (value: string): IRHashProvenance => ({
	algo: 'sha256',
	inputs: [],
	value,
});

const normaliseHash = (hash: IRHashProvenance | string): IRHashProvenance =>
	typeof hash === 'string' ? makeHash(hash) : hash;

const DEFAULT_POST_CACHE_KEYS: IRResource['cacheKeys'] = {
	list: { segments: ['books', 'list'], source: 'default' },
	get: { segments: ['books', 'get'], source: 'default' },
	create: { segments: ['books', 'create'], source: 'default' },
	update: { segments: ['books', 'update'], source: 'default' },
	remove: { segments: ['books', 'remove'], source: 'default' },
};

const DEFAULT_TAXONOMY_CACHE_KEYS: IRResource['cacheKeys'] = {
	list: { segments: ['jobCategories', 'list'], source: 'default' },
	get: { segments: ['jobCategories', 'get'], source: 'default' },
	create: { segments: [], source: 'default' },
	update: { segments: [], source: 'default' },
	remove: { segments: [], source: 'default' },
};

const DEFAULT_OPTION_CACHE_KEYS: IRResource['cacheKeys'] = {
	list: { segments: ['demoOption', 'list'], source: 'default' },
	get: { segments: ['demoOption', 'get'], source: 'default' },
	create: { segments: [], source: 'default' },
	update: { segments: ['demoOption', 'update'], source: 'default' },
	remove: { segments: ['demoOption', 'remove'], source: 'default' },
};

const DEFAULT_TRANSIENT_CACHE_KEYS: IRResource['cacheKeys'] = {
	list: { segments: ['jobCache', 'list'], source: 'default' },
	get: { segments: ['jobCache', 'get'], source: 'default' },
	create: { segments: [], source: 'default' },
	update: { segments: ['jobCache', 'update'], source: 'default' },
	remove: { segments: ['jobCache', 'remove'], source: 'default' },
};

export function makeWpPostRoutes(): IRRoute[] {
	return [
		{
			method: 'GET',
			path: '/wpk/v1/books',
			hash: makeHash('list'),
			transport: 'local',
		},
		{
			method: 'GET',
			path: '/wpk/v1/books/:slug',
			hash: makeHash('get'),
			transport: 'local',
		},
		{
			method: 'POST',
			path: '/wpk/v1/books',
			hash: makeHash('create'),
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/wpk/v1/books/:slug',
			hash: makeHash('update'),
			transport: 'local',
		},
		{
			method: 'DELETE',
			path: '/wpk/v1/books/:slug',
			hash: makeHash('remove'),
			transport: 'local',
		},
	];
}

export interface MakeWpPostResourceOptions {
	readonly namespace?: string;
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: IRRoute[];
	readonly cacheKeys?: IRResource['cacheKeys'];
	readonly identity?: ResourceIdentityConfig;
	readonly storage?: Partial<WpPostStorageConfig>;
	readonly hash?: IRHashProvenance | string;
	readonly warnings?: IRWarning[];
}

export function makeWpPostResource(
	options: MakeWpPostResourceOptions = {}
): IRResource {
	const namespace = options.namespace ?? 'Demo\\Plugin';
	const storage: WpPostStorageConfig = {
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
	};

	const base = makeResource({
		namespace,
		name: options.name ?? 'books',
		schemaKey: options.schemaKey ?? 'book',
	});

	return {
		...base,
		routes: options.routes ?? makeWpPostRoutes(),
		cacheKeys: options.cacheKeys ?? { ...DEFAULT_POST_CACHE_KEYS },
		identity: options.identity ?? { type: 'string', param: 'slug' },
		storage,
		hash: normaliseHash(options.hash ?? 'resource:books'),
		warnings: options.warnings ?? [],
	};
}

export interface MakeWpTaxonomyResourceOptions {
	readonly namespace?: string;
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: IRRoute[];
	readonly cacheKeys?: IRResource['cacheKeys'];
	readonly identity?: ResourceIdentityConfig;
	readonly storage?: Partial<WpTaxonomyStorageConfig>;
	readonly hash?: IRHashProvenance | string;
	readonly warnings?: IRWarning[];
}

export function makeWpTaxonomyResource(
	options: MakeWpTaxonomyResourceOptions = {}
): IRResource {
	const namespace = options.namespace ?? 'Demo\\Plugin';
	const storage: WpTaxonomyStorageConfig = {
		mode: 'wp-taxonomy',
		taxonomy: 'job_category',
		hierarchical: true,
		...options.storage,
	};

	const defaultRoutes: IRRoute[] = [
		{
			method: 'GET',
			path: '/wpk/v1/job-categories',
			hash: makeHash('taxonomy-list'),
			transport: 'local',
		},
		{
			method: 'GET',
			path: '/wpk/v1/job-categories/:slug',
			hash: makeHash('taxonomy-get'),
			transport: 'local',
		},
	];

	const base = makeResource({
		namespace,
		name: options.name ?? 'jobCategories',
		schemaKey: options.schemaKey ?? 'jobCategory',
	});

	return {
		...base,
		routes: options.routes ?? defaultRoutes,
		cacheKeys: options.cacheKeys ?? { ...DEFAULT_TAXONOMY_CACHE_KEYS },
		identity: options.identity ?? { type: 'string', param: 'slug' },
		storage,
		hash: normaliseHash(options.hash ?? 'taxonomy-resource'),
		warnings: options.warnings ?? [],
	};
}

export interface MakeWpOptionResourceOptions {
	readonly namespace?: string;
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: IRRoute[];
	readonly cacheKeys?: IRResource['cacheKeys'];
	readonly storage?: Partial<WpOptionStorageConfig>;
	readonly hash?: IRHashProvenance | string;
	readonly warnings?: IRWarning[];
}

export function makeWpOptionResource(
	options: MakeWpOptionResourceOptions = {}
): IRResource {
	const namespace = options.namespace ?? 'Demo\\Plugin';
	const storage: WpOptionStorageConfig = {
		mode: 'wp-option',
		option: 'demo_option',
		...options.storage,
	};

	const defaultRoutes: IRRoute[] = [
		{
			method: 'GET',
			path: '/wpk/v1/demo-option',
			hash: makeHash('wp-option-get'),
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/wpk/v1/demo-option',
			hash: makeHash('wp-option-update'),
			transport: 'local',
		},
	];

	const base = makeResource({
		namespace,
		name: options.name ?? 'demoOption',
		schemaKey: options.schemaKey ?? 'demoOption',
	});

	return {
		...base,
		routes: options.routes ?? defaultRoutes,
		cacheKeys: options.cacheKeys ?? { ...DEFAULT_OPTION_CACHE_KEYS },
		storage,
		identity: undefined,
		hash: normaliseHash(options.hash ?? 'wp-option-resource'),
		warnings: options.warnings ?? [],
	};
}

export interface MakeTransientResourceOptions {
	readonly namespace?: string;
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: IRRoute[];
	readonly cacheKeys?: IRResource['cacheKeys'];
	readonly storage?: Partial<TransientStorageConfig>;
	readonly hash?: IRHashProvenance | string;
	readonly identity?: ResourceIdentityConfig;
	readonly warnings?: IRWarning[];
}

export function makeTransientResource(
	options: MakeTransientResourceOptions = {}
): IRResource {
	const namespace = options.namespace ?? 'Demo\\Plugin';
	const storage: TransientStorageConfig = {
		mode: 'transient',
		...options.storage,
	};

	const defaultRoutes: IRRoute[] = [
		{
			method: 'GET',
			path: '/wpk/v1/job-cache',
			hash: makeHash('transient-get'),
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/wpk/v1/job-cache',
			hash: makeHash('transient-set'),
			transport: 'local',
		},
		{
			method: 'DELETE',
			path: '/wpk/v1/job-cache',
			hash: makeHash('transient-delete'),
			transport: 'local',
		},
	];

	const base = makeResource({
		namespace,
		name: options.name ?? 'jobCache',
		schemaKey: options.schemaKey ?? 'jobCache',
	});

	return {
		...base,
		routes: options.routes ?? defaultRoutes,
		cacheKeys: options.cacheKeys ?? { ...DEFAULT_TRANSIENT_CACHE_KEYS },
		identity: options.identity,
		storage,
		hash: normaliseHash(options.hash ?? 'transient-resource'),
		warnings: options.warnings ?? [],
	};
}

export interface MakePhpIrFixtureOptions {
	readonly resources?: IRResource[];
	readonly namespace?: string;
}

export function makePhpIrFixture(options: MakePhpIrFixtureOptions = {}): IRv1 {
	const layout = loadDefaultLayout();
	const namespace = options.namespace ?? 'demo-plugin';
	const resources = options.resources ?? [
		makeWpPostResource(),
		makeWpTaxonomyResource(),
		makeWpOptionResource(),
		makeTransientResource(),
	];

	return {
		meta: {
			version: 1,
			namespace,
			sanitizedNamespace: namespace,
			origin: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			sourcePath: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			plugin: {
				name: 'Demo Plugin',
				description:
					'Bootstrap loader for the Demo Plugin WPKernel integration.',
				version: '0.1.0',
				requiresAtLeast: '6.7',
				requiresPhp: '8.1',
				textDomain: 'demo-plugin',
				author: 'WPKernel Contributors',
				license: 'GPL-2.0-or-later',
			},
			features: [],
			ids: {
				algorithm: 'sha256',
				resourcePrefix: 'res:',
				schemaPrefix: 'sch:',
				blockPrefix: 'blk:',
				capabilityPrefix: 'cap:',
			},
			redactions: [],
			limits: {
				maxConfigKB: 0,
				maxSchemaKB: 0,
				policy: 'truncate',
			},
		},
		schemas: [],
		resources: [...resources],
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
		artifacts: {
			pluginLoader: undefined,
			controllers: Object.create(null),
			resources: Object.create(null),
			uiResources: Object.create(null),
			blocks: Object.create(null),
			schemas: Object.create(null),
		},
	} satisfies IRv1;
}

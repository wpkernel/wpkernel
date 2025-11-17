import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { ResourcePostMetaDescriptor } from '@wpkernel/core/resource';
import type {
	IRResourceLike,
	IRRouteLike,
	IRWarningLike,
	IRv1Like,
	WPKConfigV1Like,
} from './types.js';
import { loadDefaultLayout } from './layout.test-support.js';

const testLayout = loadDefaultLayout();

export interface MakeWPKernelConfigFixtureOptions {
	readonly namespace?: string;
	readonly schemas?: WPKConfigV1Like['schemas'];
	readonly resources?: WPKConfigV1Like['resources'];
	readonly adapters?: WPKConfigV1Like['adapters'];
}

export function makeWPKernelConfigFixture(
	options: MakeWPKernelConfigFixtureOptions = {}
): WPKConfigV1Like {
	const typesRoot = testLayout.resolve('php.generated');
	const defaultSchemas: WPKConfigV1Like['schemas'] = {
		job: {
			path: './contracts/job.schema.json',
			generated: {
				types: `./${typesRoot}/../types/job.d.ts`,
			},
		},
	};
	const defaultResources: WPKConfigV1Like['resources'] = {};

	const {
		namespace = 'demo-namespace',
		schemas,
		resources,
		adapters,
	} = options;

	return {
		version: 1,
		namespace,
		schemas: schemas ?? defaultSchemas,
		resources: resources ?? defaultResources,
		...(adapters ? { adapters } : {}),
	} satisfies WPKConfigV1Like;
}

export interface PrinterIRSchema {
	readonly key: string;
	readonly sourcePath: string;
	readonly hash: string;
	readonly schema: unknown;
	readonly provenance: 'manual' | 'auto';
	readonly generatedFrom?: {
		readonly type: 'storage';
		readonly resource: string;
	};
}

export interface PrinterIRCapabilityReference {
	readonly resource: string;
	readonly route: string;
	readonly transport: string;
}

export interface PrinterIRCapabilityHint {
	readonly key: string;
	readonly source: 'resource' | 'config';
	readonly references: PrinterIRCapabilityReference[];
}

export interface PrinterIRCapabilityDefinition {
	readonly key: string;
	readonly capability: string;
	readonly appliesTo: 'resource' | 'object';
	readonly binding?: string;
	readonly source: 'map' | 'fallback';
}

export interface PrinterIRCapabilityMap {
	readonly sourcePath?: string;
	readonly definitions: PrinterIRCapabilityDefinition[];
	readonly fallback: {
		readonly capability: string;
		readonly appliesTo: 'resource' | 'object';
	};
	readonly missing: string[];
	readonly unused: string[];
	readonly warnings: IRWarningLike[];
}

export interface PrinterIRBlock {
	readonly key: string;
	readonly directory: string;
	readonly hasRender: boolean;
	readonly manifestSource: string;
}

export interface PrinterPhpProject {
	readonly namespace: string;
	readonly autoload: string;
	readonly outputDir: string;
}

export type PrinterIr = IRv1Like<
	WPKConfigV1Like,
	PrinterIRSchema,
	IRRouteLike,
	IRResourceLike,
	PrinterIRCapabilityHint,
	PrinterIRCapabilityMap,
	PrinterIRBlock,
	PrinterPhpProject
>;

export interface MakePrinterIrFixtureOptions {
	readonly config?: WPKConfigV1Like;
	readonly schemas?: PrinterIRSchema[];
	readonly resources?: IRResourceLike[];
	readonly capabilityMap?: PrinterIRCapabilityMap;
	readonly capabilities?: PrinterIr['capabilities'];
	readonly blocks?: PrinterIRBlock[];
	readonly php?: PrinterPhpProject;
	readonly meta?: Partial<PrinterIr['meta']>;
	readonly diagnostics?: PrinterIr['diagnostics'];
}

/* eslint-disable complexity */
export function makePrinterIrFixture({
	config = makeWPKernelConfigFixture(),
	schemas = makeDefaultSchemas(),
	resources = makeDefaultResources(),
	capabilityMap = makeDefaultCapabilityMap(),
	capabilities = [],
	blocks = [],
	php = {
		namespace: 'Demo\\Namespace',
		autoload: 'inc/',
		outputDir: testLayout.resolve('php.generated'),
	},
	meta: metaOverrides = {},
	diagnostics,
}: MakePrinterIrFixtureOptions = {}): PrinterIr {
	const {
		namespace = 'demo-namespace',
		sourcePath = WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
		origin = WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
		sanitizedNamespace = 'Demo\\Namespace',
		...restMeta
	} = metaOverrides;

	const meta: PrinterIr['meta'] = {
		version: 1,
		namespace,
		sourcePath,
		origin,
		sanitizedNamespace,
		...restMeta,
	};

	return {
		meta,
		config,
		schemas,
		resources,
		capabilities,
		capabilityMap,
		blocks,
		php,
		...(diagnostics ? { diagnostics } : {}),
	} satisfies PrinterIr;
}
/* eslint-enable complexity */

export function makeDefaultSchemas(): PrinterIRSchema[] {
	const jobSchema: PrinterIRSchema = {
		key: 'job',
		sourcePath: 'contracts/job.schema.json',
		hash: 'hash-job',
		schema: {
			type: 'object',
			required: ['id', 'status'],
			properties: {
				id: {
					type: 'integer',
					description: 'Identifier',
					minimum: 0,
				},
				log_path: {
					type: 'string',
					description: 'Windows log path for debugging',
					examples: ['C\\logs\\'],
				},
				title: { type: 'string', description: 'Title' },
				status: {
					type: 'string',
					enum: ['draft', 'published'],
				},
			},
		},
		provenance: 'manual',
	};

	const taskSchema: PrinterIRSchema = {
		key: 'auto:task',
		sourcePath: '[storage:task]',
		hash: 'hash-task',
		schema: {
			type: 'object',
			required: ['slug', 'status'],
			properties: {
				slug: { type: 'string' },
				status: { type: 'string' },
				tags: {
					type: 'array',
					items: { type: 'string', enum: [] },
				},
			},
		},
		provenance: 'auto',
		generatedFrom: { type: 'storage', resource: 'task' },
	};

	const literalSchema: PrinterIRSchema = {
		key: 'literal',
		sourcePath: 'schemas/literal.schema.json',
		hash: 'hash-literal',
		schema: {
			type: 'object',
			properties: {
				uuid: { type: 'string', format: 'uuid' },
				title: { type: 'string' },
			},
		},
		provenance: 'manual',
	};

	const fallbackSchema: PrinterIRSchema = {
		key: 'auto:',
		sourcePath: '[storage:fallback]',
		hash: 'hash-fallback',
		schema: {
			type: 'object',
			properties: {
				id: { type: 'integer' },
			},
		},
		provenance: 'auto',
		generatedFrom: { type: 'storage', resource: 'job' },
	};

	return [jobSchema, taskSchema, literalSchema, fallbackSchema];
}

function makeDefaultCapabilityMap(): PrinterIRCapabilityMap {
	return {
		sourcePath: 'src/capability-map.ts',
		definitions: [
			{
				key: 'jobs.create',
				capability: 'manage_options',
				appliesTo: 'resource',
				source: 'map',
			},
		],
		fallback: {
			capability: 'manage_options',
			appliesTo: 'resource',
		},
		missing: [],
		unused: [],
		warnings: [],
	} satisfies PrinterIRCapabilityMap;
}

function makeDefaultResources(): IRResourceLike[] {
	const jobResource = makeJobResource();
	const taskResource = makeTaskResource();
	const optionResource = makeWpOptionResource();
	const transientResource = makeTransientResource();
	const literalResource = makeLiteralResource();
	const orphanResource = makeOrphanResource();
	const remoteResource = makeRemoteResource();

	return [
		jobResource,
		taskResource,
		optionResource,
		transientResource,
		literalResource,
		orphanResource,
		remoteResource,
	];
}

export interface MakeResourceOptions {
	readonly name?: string;
	readonly routes?: IRRouteLike[];
	readonly hash?: string;
	readonly identity?: IRResourceLike['identity'];
}

type ExtendedPostMetaDescriptor = ResourcePostMetaDescriptor & {
	readonly items?: ResourcePostMetaDescriptor;
	readonly enum?: readonly string[];
};
type WpPostStorage = {
	readonly mode: 'wp-post';
	readonly postType?: string;
	readonly statuses?: readonly string[];
	readonly supports?: readonly string[];
	readonly meta?: Record<string, ExtendedPostMetaDescriptor>;
	readonly taxonomies?: Record<
		string,
		{ taxonomy: string; hierarchical?: boolean }
	>;
};
type ExtendedWpPostStorage = WpPostStorage & {
	readonly cacheTtl?: number;
	readonly retryLimit?: number;
	readonly revision?: bigint;
	readonly meta?: Record<string, ExtendedPostMetaDescriptor>;
};
type WpOptionStorage = {
	readonly mode: 'wp-option';
	readonly option: string;
};
type TransientStorage = { readonly mode: 'transient' };

export interface MakeWpOptionResourceOptions extends MakeResourceOptions {
	readonly cacheKeys?: IRResourceLike['cacheKeys'];
	readonly storage?: Partial<WpOptionStorage>;
}

export interface MakeTransientResourceOptions extends MakeResourceOptions {
	readonly cacheKeys?: IRResourceLike['cacheKeys'];
	readonly storage?: Partial<TransientStorage>;
}

export function makeJobResource(
	options: MakeResourceOptions = {}
): IRResourceLike {
	const cacheKeys: IRResourceLike['cacheKeys'] = {
		list: { segments: ['job', 'list'] as const, source: 'config' },
		get: {
			segments: ['job', 'get', '__wpk_id__'] as const,
			source: 'default',
		},
		create: { segments: ['job', 'create'] as const, source: 'config' },
		update: { segments: ['job', 'update'] as const, source: 'config' },
		remove: { segments: ['job', 'remove'] as const, source: 'config' },
	} satisfies IRResourceLike['cacheKeys'];

	const queryParams: NonNullable<IRResourceLike['queryParams']> = {
		search: {
			type: 'string',
			description: 'Search term',
			optional: true,
		},
		log_path: {
			type: 'string',
			description: 'Windows log path for debugging',
		},
		status: {
			type: 'enum',
			enum: ['draft', 'published'] as const,
		},
		state: {
			type: 'enum',
			enum: ['draft', 'published'] as const,
		},
	};

	const storage: ExtendedWpPostStorage = {
		mode: 'wp-post',
		postType: 'job',
		cacheTtl: 900,
	};

	return {
		name: options.name ?? 'job',
		schemaKey: 'job',
		schemaProvenance: 'manual',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: '/jobs',
				hash: 'route-job-list',
				transport: 'local',
			},
			{
				method: 'GET',
				path: '/jobs/:id',
				hash: 'route-job-get',
				transport: 'local',
			},
			{
				method: 'POST',
				path: '/jobs',
				hash: 'route-job-create',
				transport: 'local',
				capability: 'jobs.create',
			},
			{
				method: 'PUT',
				path: '/jobs/:id',
				hash: 'route-job-update',
				transport: 'local',
			},
		],
		cacheKeys,
		identity: options.identity ?? { type: 'number', param: 'id' },
		storage,
		queryParams,
		ui: undefined,
		hash: options.hash ?? 'resource-job',
		warnings: [],
	} satisfies IRResourceLike;
}

export function makeTaskResource(
	options: MakeResourceOptions = {}
): IRResourceLike {
	const cacheKeys: IRResourceLike['cacheKeys'] = {
		list: { segments: ['task', 'list'] as const, source: 'config' },
		get: {
			segments: ['task', 'get', '__wpk_id__'] as const,
			source: 'default',
		},
	};

	const storage: ExtendedWpPostStorage = {
		mode: 'wp-post',
		postType: 'task',
		supports: ['title', 'editor'],
		retryLimit: 2,
		revision: BigInt(3),
		meta: {
			status: { type: 'string', single: true },
			tags: {
				type: 'array',
				single: false,
				items: { type: 'string' },
			},
		},
	};

	return {
		name: options.name ?? 'task',
		schemaKey: 'auto:task',
		schemaProvenance: 'auto',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: '/tasks/:slug',
				hash: 'route-task-list',
				transport: 'local',
			},
		],
		cacheKeys,
		identity: options.identity ?? { type: 'string', param: 'slug' },
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-task',
		warnings: [],
	} satisfies IRResourceLike;
}

export function makeWpOptionResource(
	options: MakeWpOptionResourceOptions = {}
): IRResourceLike {
	const storage: WpOptionStorage = {
		mode: 'wp-option',
		option: 'demo_option',
		...options.storage,
	};

	const defaultRoutes: IRRouteLike[] = [
		{
			method: 'GET',
			path: '/demo-namespace/demo-option',
			hash: 'route-option-get',
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/demo-namespace/demo-option',
			hash: 'route-option-update',
			transport: 'local',
		},
	];

	const cacheKeys = options.cacheKeys ?? {
		list: { segments: ['demoOption', 'list'], source: 'default' },
		get: { segments: ['demoOption', 'get'], source: 'default' },
		update: { segments: ['demoOption', 'update'], source: 'default' },
		remove: { segments: ['demoOption', 'remove'], source: 'default' },
	};

	return {
		name: options.name ?? 'demoOption',
		schemaKey: 'demoOption',
		schemaProvenance: 'manual',
		routes: options.routes ?? defaultRoutes,
		cacheKeys,
		identity: options.identity,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-option',
		warnings: [],
	} satisfies IRResourceLike;
}

export function makeTransientResource(
	options: MakeTransientResourceOptions = {}
): IRResourceLike {
	const storage: TransientStorage = {
		mode: 'transient',
		...options.storage,
	};

	const defaultRoutes: IRRouteLike[] = [
		{
			method: 'GET',
			path: '/demo-namespace/job-cache',
			hash: 'route-transient-get',
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/demo-namespace/job-cache',
			hash: 'route-transient-set',
			transport: 'local',
		},
		{
			method: 'DELETE',
			path: '/demo-namespace/job-cache',
			hash: 'route-transient-delete',
			transport: 'local',
		},
	];

	const cacheKeys = options.cacheKeys ?? {
		list: { segments: ['jobCache', 'list'], source: 'default' },
		get: { segments: ['jobCache', 'get'], source: 'default' },
		create: { segments: [], source: 'default' },
		update: { segments: ['jobCache', 'update'], source: 'default' },
		remove: { segments: ['jobCache', 'remove'], source: 'default' },
	};

	return {
		name: options.name ?? 'jobCache',
		schemaKey: 'jobCache',
		schemaProvenance: 'manual',
		routes: options.routes ?? defaultRoutes,
		cacheKeys,
		identity: options.identity,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-transient',
		warnings: [],
	} satisfies IRResourceLike;
}

export function makeLiteralResource(
	options: MakeResourceOptions = {}
): IRResourceLike {
	const cacheKeys: IRResourceLike['cacheKeys'] = {
		list: { segments: ['literal', 'list'] as const, source: 'config' },
		get: {
			segments: ['literal', 'get', '__wpk_id__'] as const,
			source: 'default',
		},
	};

	return {
		name: options.name ?? 'literal',
		schemaKey: 'literal',
		schemaProvenance: 'manual',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: '/demo-namespace/literal',
				hash: 'route-literal-get',
				transport: 'local',
			},
		],
		cacheKeys,
		identity: options.identity,
		storage: undefined,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-literal',
		warnings: [],
	} satisfies IRResourceLike;
}

export function makeOrphanResource(
	options: MakeResourceOptions = {}
): IRResourceLike {
	const cacheKeys: IRResourceLike['cacheKeys'] = {
		list: { segments: ['orphan', 'list'] as const, source: 'config' },
		get: { segments: ['orphan', 'get'] as const, source: 'default' },
	};

	return {
		name: options.name ?? 'orphan',
		schemaKey: 'missing',
		schemaProvenance: 'manual',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: '/demo-namespace/orphan',
				hash: 'route-orphan-get',
				transport: 'local',
			},
		],
		cacheKeys,
		identity: options.identity,
		storage: undefined,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-orphan',
		warnings: [
			{
				code: 'schema_missing',
				message: 'Schema not found',
			},
		],
	} satisfies IRResourceLike;
}

export function makeRemoteResource(
	options: MakeResourceOptions = {}
): IRResourceLike {
	const cacheKeys: IRResourceLike['cacheKeys'] = {
		list: { segments: ['remote', 'list'] as const, source: 'config' },
		get: { segments: ['remote', 'get'] as const, source: 'default' },
	};

	return {
		name: options.name ?? 'remote',
		schemaKey: 'remote',
		schemaProvenance: 'manual',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: '/remote',
				hash: 'route-remote-get',
				transport: 'remote',
			},
		],
		cacheKeys,
		identity: options.identity,
		storage: undefined,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-remote',
		warnings: [],
	} satisfies IRResourceLike;
}

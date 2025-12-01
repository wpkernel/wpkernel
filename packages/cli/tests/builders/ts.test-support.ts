import path from 'node:path';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { ResourceConfig } from '@wpkernel/core/resource';
import type {
	BuildIrOptions,
	IRHashProvenance,
	IRResource,
	IRv1,
} from '../../src/ir/publicTypes';
export { withWorkspace } from './builder-harness.test-support.js';
export {
	buildReporter,
	buildOutput,
	normalise,
	prefixRelative,
} from './builder-harness.test-support.js';
export type {
	BuilderHarnessContext,
	WorkspaceFactoryOptions,
} from './builder-harness.test-support.js';
import { loadDefaultLayout } from '../layout.test-support.js';
type TestArtifactsPlan = {
	pluginLoader?: unknown;
	controllers: Record<string, unknown>;
	resources: Record<
		string,
		{
			modulePath: string;
			typeDefPath: string;
			typeSource: 'inferred' | 'schema';
			schemaKey?: string;
		}
	>;
	uiResources: Record<string, unknown>;
	blocks: Record<string, unknown>;
	schemas: Record<string, unknown>;
	js?: IRv1['artifacts']['js'];
	php?: IRv1['artifacts']['php'];
};
import {
	buildControllerClassName,
	buildPluginMetaFixture,
} from '../ir/meta.test-support.js';
import { type WPKernelConfigV1 } from '../../src/config';

const makeHash = (value: string): IRHashProvenance => ({
	algo: 'sha256',
	inputs: [],
	value,
});

export interface WPKernelConfigSourceOptions {
	readonly namespace?: string;
	readonly resourceKey?: string;
	readonly resourceName?: string;
	readonly dataviews?: {
		readonly view?: string;
	} | null;
}

export function buildWPKernelConfigSource(
	options: WPKernelConfigSourceOptions = {}
): string {
	const {
		namespace = 'demo-namespace',
		resourceKey = 'job',
		resourceName = 'job',
		dataviews = {},
	} = options;

	const includeDataViews = dataviews !== null;
	const dataviewsAssignment = includeDataViews
		? `                        ui: { admin: { view: 'dataviews' } },
`
		: '';

	return `
const toTrimmedString = (value: unknown): string | undefined => {
        if (typeof value !== 'string') {
                return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
};

export const wpkConfig = {
        version: 1,
        namespace: '${namespace}',
        schemas: {},
        resources: {
                ${resourceKey}: {
                        name: '${resourceName}',
                        schema: 'auto',
                        routes: {},
                        cacheKeys: {},
${dataviewsAssignment}                },
        },
};
`;
}

export interface DataViewsConfigOverrides {
	readonly view?: string | null;
}

export function buildDataViewsConfig(
	overrides: DataViewsConfigOverrides = {}
): { view?: string } {
	if (overrides.view === null) {
		return {};
	}
	return { view: overrides.view ?? 'dataviews' };
}

export interface BuilderArtifactOptions {
	readonly namespace?: string;
	readonly resourceKey?: string;
	readonly resourceName?: string;
	readonly dataviews?: { view?: string } | null;
	readonly sourcePath: string;
}

export interface BuilderArtifacts {
	readonly config: WPKernelConfigV1;
	readonly ir: IRv1;
	readonly options: BuildIrOptions;
}

export function buildBuilderArtifacts(
	options: BuilderArtifactOptions
): BuilderArtifacts {
	const layout = loadDefaultLayout();
	const {
		namespace = 'demo-namespace',
		resourceKey = 'job',
		resourceName = resourceKey,
		dataviews = buildDataViewsConfig(),
		sourcePath,
	} = options;

	const resourceConfig: ResourceConfig = {
		name: resourceName,
		schema: 'auto',
		routes: {},
		cacheKeys: {},
		...(dataviews ? { ui: { admin: { view: 'dataviews' } } } : {}),
	} as ResourceConfig;

	const config: WPKernelConfigV1 = {
		version: 1,
		namespace,
		schemas: {},
		resources: {
			[resourceKey]: resourceConfig,
		},
	};

	const irResource: IRResource = {
		id: `${resourceKey}:resource`,
		name: resourceName,
		controllerClass: buildControllerClassName(namespace, resourceName),
		schemaKey: resourceKey,
		schemaProvenance: 'manual',
		routes: [
			{
				method: 'GET',
				path: `/${namespace}/v1/${resourceName}`,
				capability: undefined,
				hash: {
					algo: 'sha256',
					inputs: ['method', 'path'],
					value: `${resourceName}-list`,
				},
				transport: 'local',
			},
		],
		cacheKeys: {
			list: { segments: [resourceKey, 'list'], source: 'config' },
			get: { segments: [resourceKey, 'get'], source: 'config' },
		},
		hash: makeHash('demo-hash'),
		warnings: [],
	} as IRResource;

	const sanitizedNamespace = toPascalCase(namespace);
	const pluginMeta = buildPluginMetaFixture({ namespace });

	const ir: IRv1 = {
		meta: {
			version: 1,
			namespace,
			origin: 'typescript',
			sourcePath: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			sanitizedNamespace,
			plugin: pluginMeta,
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
		resources: [
			{
				...irResource,
				ui:
					resourceConfig.ui?.admin?.view === 'dataviews'
						? {
								admin: { view: 'dataviews' },
							}
						: resourceConfig.ui,
			} as IRResource,
		],
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
			namespace: sanitizedNamespace,
			autoload: 'inc/',
			outputDir: layout.resolve('php.generated'),
		},
		layout,
		artifacts: buildArtifactsPlan({
			layout,
			resourceId: irResource.id,
			resourceName,
			resourceKey,
		}) as unknown as IRv1['artifacts'],
		ui:
			resourceConfig.ui?.admin?.view === 'dataviews'
				? {
						loader: undefined,
						resources: [
							{
								resource: resourceKey,
								preferencesKey: `${namespace}/dataviews/${resourceName}`,
								dataviews: {
									fields: [],
									defaultView: { type: 'table' },
									mapQuery: (view: Record<string, unknown>) =>
										view ?? {},
									preferencesKey: `${namespace}/dataviews/${resourceName}`,
								},
							},
						],
					}
				: { resources: [] },
	} as IRv1;

	const buildOptions: BuildIrOptions = {
		config,
		namespace,
		origin: 'typescript',
		sourcePath,
	} as BuildIrOptions;

	return { ir, options: buildOptions, config } satisfies BuilderArtifacts;
}

function toPascalCase(value: string): string {
	return value
		.split(/[^a-zA-Z0-9]+/u)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join('');
}

function buildArtifactsPlan(options: {
	layout: IRv1['layout'];
	resourceId: string;
	resourceName: string;
	resourceKey: string;
}): TestArtifactsPlan {
	const resourceModule = path.posix.join(
		options.layout.resolve('ui.resources.applied'),
		`${options.resourceKey}.ts`
	);
	const typeDefPath = path.posix.join(
		options.layout.resolve('ui.resources.applied'),
		'../types',
		`${options.resourceKey}.d.ts`
	);
	const appDir = path.posix.join(
		options.layout.resolve('ui.applied'),
		'app',
		options.resourceKey
	);
	const generatedAppDir = path.posix.join(
		options.layout.resolve('ui.generated'),
		'app',
		options.resourceKey
	);
	const uiGeneratedRoot = options.layout.resolve('ui.generated');
	const blocksGenerated = options.layout.resolve('blocks.generated');
	return {
		pluginLoader: undefined,
		controllers: Object.create(null),
		resources: {
			[options.resourceId]: {
				modulePath: resourceModule,
				typeDefPath,
				typeSource: 'inferred',
			},
		},
		uiResources: {
			[options.resourceId]: {
				appDir,
				generatedAppDir,
				pagePath: path.posix.join(appDir, 'page.tsx'),
				formPath: path.posix.join(appDir, 'form.tsx'),
				configPath: path.posix.join(appDir, 'config.tsx'),
			},
		},
		blocks: Object.create(null),
		schemas: Object.create(null),
		js: {
			capabilities: {
				modulePath: path.posix.join(uiGeneratedRoot, 'capabilities.ts'),
				declarationPath: path.posix.join(
					uiGeneratedRoot,
					'capabilities.d.ts'
				),
			},
			index: {
				modulePath: path.posix.join(uiGeneratedRoot, 'index.ts'),
				declarationPath: path.posix.join(uiGeneratedRoot, 'index.d.ts'),
			},
			uiRuntimePath: path.posix.join(uiGeneratedRoot, 'runtime.ts'),
			uiEntryPath: path.posix.join(uiGeneratedRoot, 'index.tsx'),
			blocksRegistrarPath: path.posix.join(
				blocksGenerated,
				'auto-register.ts'
			),
		},
	};
}

import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { ResourceConfig } from '@wpkernel/core/resource';
import type {
	BuildIrOptions,
	IRHashProvenance,
	IRResource,
	IRv1,
} from '../../src/ir/publicTypes';
import type { WPKernelConfigV1 } from '../../src/config/types';
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
import {
	buildControllerClassName,
	buildPluginMetaFixture,
} from '../ir/meta.test-support.js';

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
	// readonly config: WPKernelConfigV1;
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
	} as WPKernelConfigV1;

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
		config,
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

	return { ir, options: buildOptions } satisfies BuilderArtifacts;
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

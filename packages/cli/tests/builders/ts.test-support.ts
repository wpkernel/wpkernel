import path from 'node:path';
import type { ResourceConfig } from '@wpkernel/core/resource';
import type {
	IRArtifactsPlan,
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
import {
	buildControllerClassName,
	buildPluginMetaFixture,
} from '../ir/meta.test-support.js';
import { type WPKernelConfigV1 } from '../../src/config';
import { toPascalCase } from '../../src/utils';
import { buildTestArtifactsPlan, makeIr } from '../ir.test-support';
import { makeResource, makeRoute } from './fixtures.test-support.js';

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
	return { view: overrides.view ?? 'dataview' };
}

export interface BuilderArtifactOptions {
	readonly namespace?: string;
	readonly resourceKey?: string;
	readonly resourceName?: string;
	readonly dataviews?: { view?: string } | null;
	readonly sourcePath: string;
}

export interface BuilderArtifacts {
	readonly config?: WPKernelConfigV1;
	readonly ir: IRv1;
	readonly options: {
		readonly namespace: string;
		readonly origin: string;
		readonly sourcePath: string;
	};
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
		...(dataviews ? { ui: { admin: { view: 'dataview' } } } : {}),
	} as ResourceConfig;

	const config: WPKernelConfigV1 = {
		version: 1,
		namespace,
		schemas: {},
		resources: {
			[resourceKey]: resourceConfig,
		},
	};

	const sanitizedNamespace = toPascalCase(namespace);
	const pluginMeta = buildPluginMetaFixture({ namespace });
	const irResource: IRResource = makeResource({
		id: `${resourceKey}:resource`,
		name: resourceName,
		controllerClass: buildControllerClassName(namespace, resourceName),
		schemaKey: resourceKey,
		routes: [
			makeRoute({
				path: `/${namespace}/v1/${resourceName}`,
				hash: {
					algo: 'sha256',
					inputs: ['method', 'path'],
					value: `${resourceName}-list`,
				},
			}),
		],
		cacheKeys: {
			list: { segments: [resourceKey, 'list'], source: 'config' },
			get: { segments: [resourceKey, 'get'], source: 'config' },
			create: { segments: [resourceKey, 'create'], source: 'config' },
			update: { segments: [resourceKey, 'update'], source: 'config' },
			remove: { segments: [resourceKey, 'remove'], source: 'config' },
		},
		hash: makeHash('demo-hash'),
		ui:
			resourceConfig.ui?.admin?.view === 'dataviews'
				? {
						admin: { view: 'dataviews' },
					}
				: resourceConfig.ui,
	}) as IRResource;

	const ir: IRv1 = makeIr({
		namespace,
		layout,
		meta: {
			origin: 'typescript',
			sourcePath,
			sanitizedNamespace,
			plugin: pluginMeta,
			features: [],
		},
		resources: [irResource],
		php: {
			namespace: sanitizedNamespace,
			autoload: 'inc/',
			outputDir: layout.resolve('php.generated'),
		},
		artifacts: buildArtifactsPlan({
			resourceId: irResource.id,
			resourceName,
			resourceKey,
			layout,
		}),
		ui:
			resourceConfig.ui?.admin?.view === 'dataviews'
				? {
						loader: undefined,
						resources: [
							{
								resource: resourceKey,
								menu: {
									slug: resourceName,
									title: resourceName,
								},
							},
						],
					}
				: { resources: [] },
	});

	const buildOptions = {
		namespace,
		origin: 'typescript',
		sourcePath,
	};

	return { ir, options: buildOptions, config } satisfies BuilderArtifacts;
}

function buildArtifactsPlan(options: {
	layout: IRv1['layout'];
	resourceId: string;
	resourceName: string;
	resourceKey: string;
}): IRArtifactsPlan {
	const base = buildTestArtifactsPlan(options.layout);
	const appApplied = options.layout.resolve('app.applied');
	const appGenerated = options.layout.resolve('app.generated');
	const typesGenerated = options.layout.resolve('types.generated');

	return {
		...base,
		resources: {
			[options.resourceId]: {
				modulePath: path.posix.join(
					appGenerated,
					options.resourceName,
					'resource.ts'
				),
				typeDefPath: path.posix.join(
					typesGenerated,
					`${options.resourceName}.d.ts`
				),
				typeSource: 'inferred',
				schemaKey: options.resourceKey,
			},
		},
		surfaces: {
			[options.resourceId]: {
				resource: options.resourceName,
				appDir: path.posix.join(appApplied, options.resourceName),
				generatedAppDir: path.posix.join(
					appGenerated,
					options.resourceName
				),
				pagePath: path.posix.join(
					appApplied,
					options.resourceName,
					'page.tsx'
				),
				formPath: path.posix.join(
					appApplied,
					options.resourceName,
					'form.tsx'
				),
				configPath: path.posix.join(
					appApplied,
					options.resourceName,
					'config.tsx'
				),
			},
		},
	};
}

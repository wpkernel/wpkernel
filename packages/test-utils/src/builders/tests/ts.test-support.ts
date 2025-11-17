import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type {
	ResourceConfig,
	ResourceDataViewsScreenConfig,
	ResourceDataViewsUIConfig,
} from '@wpkernel/core/resource';
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
import type {
	BuildIrOptionsLike,
	IRResourceLike,
	IRv1Like,
	WPKConfigV1Like,
} from '../../types.js';
import { loadDefaultLayout } from '../../layout.test-support.js';

export interface WPKernelConfigSourceOptions {
	readonly namespace?: string;
	readonly resourceKey?: string;
	readonly resourceName?: string;
	readonly dataviews?: {
		readonly screen?: Partial<ResourceDataViewsScreenConfig>;
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
	const camelResourceKey = toCamelCase(resourceKey);
	const identifier = `${camelResourceKey}DataViewsConfig`;

	const screenBlock = includeDataViews
		? buildScreenBlock(dataviews?.screen ?? {})
		: undefined;

	const dataViewsDeclaration = includeDataViews
		? `const ${identifier}: ResourceDataViewConfig<unknown, unknown> = {
        fields: [
                { id: 'title', label: 'Title' },
                { id: 'status', label: 'Status' },
        ],
        defaultView: {
                type: 'table',
                fields: ['title', 'status'],
        },
        mapQuery: (viewState: Record<string, unknown>) => {
                const search = toTrimmedString(viewState.search);
                return search ? { q: search } : {};
        },
        search: true,
        searchLabel: 'Search jobs',
        perPageSizes: [10, 25, 50],
        defaultLayouts: {
                table: { columns: ['title', 'status'] },
        },
        views: [
                {
                        id: 'all',
                        label: 'All jobs',
                        view: { type: 'table', fields: ['title', 'status'] },
                        isDefault: true,
                },
                {
                        id: 'draft',
                        label: 'Draft jobs',
                        view: {
                                type: 'table',
                                fields: ['title', 'status'],
                                filters: { status: ['draft'] },
                        },
                        description: 'Jobs awaiting publication.',
                },
        ],
        preferencesKey: 'jobs/admin',
        screen: ${screenBlock ?? '{}'},
};

`
		: '';

	const dataviewsAssignment = includeDataViews
		? `                        ui: { admin: { dataviews: ${identifier} } },
`
		: '';

	return `import type { ResourceDataViewConfig } from '@wpkernel/ui/dataviews';

const toTrimmedString = (value: unknown): string | undefined => {
        if (typeof value !== 'string') {
                return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
};

${dataViewsDeclaration}export const wpkConfig = {
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

export interface DataViewsConfigOverrides
	extends Partial<Omit<ResourceDataViewsUIConfig, 'screen'>> {
	readonly screen?: Partial<ResourceDataViewsScreenConfig> | null;
}

export function buildDataViewsConfig(
	overrides: DataViewsConfigOverrides = {}
): ResourceDataViewsUIConfig {
	const { screen: screenOverrides, ...rest } = overrides;

	const baseScreen: ResourceDataViewsScreenConfig = {
		component: 'JobsAdminScreen',
		route: '/admin/jobs',
		menu: {
			slug: 'jobs-admin',
			title: 'Jobs',
			capability: 'manage_options',
			parent: 'admin.php',
			position: 25,
		},
	};

	const screenConfig =
		screenOverrides === null
			? undefined
			: {
					...baseScreen,
					...(screenOverrides ?? {}),
				};

	const base: ResourceDataViewsUIConfig = {
		fields: [
			{ id: 'title', label: 'Title' },
			{ id: 'status', label: 'Status' },
		],
		defaultView: { type: 'table', fields: ['title', 'status'] },
		mapQuery: (viewState: Record<string, unknown>) => {
			const search = (viewState as { search?: string }).search ?? '';
			return search.trim().length > 0 ? { q: search.trim() } : {};
		},
		search: true,
		searchLabel: 'Search jobs',
		perPageSizes: [10, 25, 50],
		defaultLayouts: {
			table: { columns: ['title', 'status'] },
		},
		views: [
			{
				id: 'all',
				label: 'All jobs',
				view: { type: 'table', fields: ['title', 'status'] },
				isDefault: true,
			},
			{
				id: 'draft',
				label: 'Draft jobs',
				view: {
					type: 'table',
					fields: ['title', 'status'],
					filters: { status: ['draft'] },
				},
				description: 'Jobs awaiting publication.',
			},
		],
		preferencesKey: 'jobs/admin',
		...(screenConfig ? { screen: screenConfig } : {}),
	} satisfies ResourceDataViewsUIConfig;

	return {
		...base,
		...rest,
		...(screenConfig ? { screen: screenConfig } : {}),
	} satisfies ResourceDataViewsUIConfig;
}

export interface BuilderArtifactOptions {
	readonly namespace?: string;
	readonly resourceKey?: string;
	readonly resourceName?: string;
	readonly dataviews?: ResourceDataViewsUIConfig | null;
	readonly sourcePath: string;
}

export interface BuilderArtifacts<
	TConfig extends WPKConfigV1Like = WPKConfigV1Like,
	TIr extends IRv1Like<TConfig> = IRv1Like<TConfig>,
	TOptions extends BuildIrOptionsLike<TConfig> = BuildIrOptionsLike<TConfig>,
> {
	readonly config: TConfig;
	readonly ir: TIr;
	readonly options: TOptions;
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
		...(dataviews
			? {
					ui: { admin: { dataviews } },
				}
			: {}),
	} as ResourceConfig;

	const config: WPKConfigV1Like = {
		version: 1,
		namespace,
		schemas: {},
		resources: {
			[resourceKey]: resourceConfig,
		},
	} as WPKConfigV1Like;

	const irResource: IRResourceLike = {
		name: resourceName,
		schemaKey: resourceKey,
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: [resourceKey, 'list'], source: 'config' },
			get: { segments: [resourceKey, 'get'], source: 'config' },
		},
		hash: 'demo-hash',
		warnings: [],
	} as IRResourceLike;

	const sanitizedNamespace = toPascalCase(namespace);

	const ir: IRv1Like = {
		meta: {
			version: 1,
			namespace,
			origin: 'typescript',
			sourcePath: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			sanitizedNamespace,
		},
		config,
		schemas: [],
		resources: [irResource],
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
	} as IRv1Like;

	const buildOptions: BuildIrOptionsLike = {
		config,
		namespace,
		origin: 'typescript',
		sourcePath,
	} as BuildIrOptionsLike;

	return { config, ir, options: buildOptions } satisfies BuilderArtifacts;
}

function buildScreenBlock(
	overrides: Partial<ResourceDataViewsScreenConfig>
): string {
	const screen: ResourceDataViewsScreenConfig = {
		component: 'JobsAdminScreen',
		route: '/admin/jobs',
		...overrides,
	};

	const lines: string[] = [`component: '${screen.component}',`];
	if (screen.route) {
		lines.push(`route: '${screen.route}',`);
	}
	if (screen.resourceImport) {
		lines.push(`resourceImport: '${screen.resourceImport}',`);
	}
	if (screen.resourceSymbol) {
		lines.push(`resourceSymbol: '${screen.resourceSymbol}',`);
	}
	if (screen.wpkernelImport) {
		lines.push(`wpkernelImport: '${screen.wpkernelImport}',`);
	}
	if (screen.wpkernelSymbol) {
		lines.push(`wpkernelSymbol: '${screen.wpkernelSymbol}',`);
	}
	if (screen.menu) {
		const menuLines: string[] = [];
		for (const [key, value] of Object.entries(screen.menu)) {
			if (typeof value === 'string') {
				menuLines.push(`${key}: '${value}',`);
				continue;
			}

			menuLines.push(`${key}: ${JSON.stringify(value)},`);
		}

		lines.push(`menu: {
                ${menuLines.join('\n                ')}
        },`);
	}

	return `{
        ${lines.join('\n        ')}
}`;
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

function toCamelCase(value: string): string {
	const pascal = toPascalCase(value);
	if (pascal.length === 0) {
		return pascal;
	}
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

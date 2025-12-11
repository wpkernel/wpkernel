import path from 'node:path';
import type {
	IRv1,
	IRCapabilityMap,
	IRPhpProject,
	IRBlock,
	IRCapabilityHint,
	IRResource,
	IRSchema,
	IRUiSurface,
	IRCapabilityDefinition,
	IRCapabilityScope,
	IRWarning,
	IRArtifactsPlan,
	IRLayout,
} from '../src/ir/publicTypes';
import type {} from '../src/config/types';
import { buildPluginMeta } from '../src/ir/shared/pluginMeta';
import { loadTestLayoutSync } from './layout.test-support';

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function makeIrMeta(
	namespace = 'demo-namespace',
	overrides: DeepPartial<IRv1['meta']> = {}
): IRv1['meta'] {
	const baseIds = {
		algorithm: 'sha256' as const,
		resourcePrefix: 'res:' as const,
		schemaPrefix: 'sch:' as const,
		blockPrefix: 'blk:' as const,
		capabilityPrefix: 'cap:' as const,
	};

	const ids = { ...baseIds, ...(overrides.ids ?? {}) };
	const limits = {
		maxConfigKB: 512,
		maxSchemaKB: 512,
		policy: 'error' as const,
		...(overrides.limits ?? {}),
	};
	const pluginDefaults = buildPluginMeta({
		sanitizedNamespace: overrides.sanitizedNamespace ?? namespace,
	});
	const plugin = {
		...pluginDefaults,
		...(overrides.plugin ?? {}),
	};

	return {
		version: 1,
		namespace,
		sourcePath: overrides.sourcePath ?? '/path/to/wpk.config.ts',
		origin: overrides.origin ?? 'typescript',
		sanitizedNamespace: overrides.sanitizedNamespace ?? namespace,
		features: (overrides.features ?? []) as string[],
		ids,
		redactions: (overrides.redactions ?? []) as string[],
		limits,
		plugin,
	};
}

function makeCapabilityMap(
	overrides: DeepPartial<IRCapabilityMap> = {}
): IRCapabilityMap {
	return {
		sourcePath: overrides.sourcePath,
		definitions: (overrides.definitions ?? []) as IRCapabilityDefinition[],
		fallback: {
			capability: overrides.fallback?.capability ?? 'manage_options',
			appliesTo: (overrides.fallback?.appliesTo ??
				'resource') as IRCapabilityScope,
		},
		missing: (overrides.missing ?? []) as string[],
		unused: (overrides.unused ?? []) as string[],
		warnings: (overrides.warnings ?? []) as IRWarning[],
	};
}

function makePhpProject(
	namespace: string,
	overrides: DeepPartial<IRPhpProject> = {}
): IRPhpProject {
	const layoutMap = loadTestLayoutSync();

	return {
		namespace,
		autoload: overrides.autoload ?? 'inc/',
		outputDir: overrides.outputDir ?? layoutMap.resolve('php.generated'),
	};
}

export function buildTestArtifactsPlan(layout: IRLayout): IRArtifactsPlan {
	const entryGenerated = layout.resolve('entry.generated');
	const entryApplied = layout.resolve('entry.applied');
	const runtimeGenerated = layout.resolve('runtime.generated');
	const runtimeApplied = layout.resolve('runtime.applied');
	const blocksGenerated = layout.resolve('blocks.generated');
	const blocksApplied = layout.resolve('blocks.applied');
	const phpGenerated = layout.resolve('php.generated');

	return {
		pluginLoader: {
			id: 'plugin.loader',
			absolutePath: layout.resolve('plugin.loader'),
		},
		controllers: Object.create(null),
		resources: Object.create(null),
		surfaces: Object.create(null),
		blocks: Object.create(null),
		blockRoots: {
			applied: blocksApplied,
			generated: blocksGenerated,
		},
		schemas: Object.create(null),
		runtime: {
			entry: {
				generated: entryGenerated,
				applied: entryApplied,
			},
			runtime: {
				generated: runtimeGenerated,
				applied: runtimeApplied,
			},
			blocksRegistrarPath: path.posix.join(
				blocksGenerated,
				'auto-register.ts'
			),
			uiLoader: undefined,
		},
		bundler: {
			configPath: layout.resolve('bundler.config'),
			assetsPath: layout.resolve('bundler.assets'),
			shimsDir: layout.resolve('bundler.shims'),
			aliasRoot: path.posix.dirname(runtimeGenerated),
			entryPoint: path.posix.extname(entryGenerated)
				? entryGenerated
				: path.posix.join(entryGenerated, 'index.tsx'),
		},
		plan: {
			planManifestPath: layout.resolve('plan.manifest'),
			planBaseDir: layout.resolve('plan.base'),
			planIncomingDir: layout.resolve('plan.incoming'),
			patchManifestPath: layout.resolve('patch.manifest'),
		},
		php: {
			pluginLoaderPath: layout.resolve('plugin.loader'),
			autoload: {
				strategy: 'composer',
				autoloadPath: path.posix.join(
					path.posix.dirname(path.posix.dirname(phpGenerated)),
					'vendor',
					'autoload.php'
				),
			},
			blocksManifestPath: path.posix.join(
				phpGenerated,
				'build',
				'blocks-manifest.php'
			),
			blocksRegistrarPath: path.posix.join(
				phpGenerated,
				'Blocks',
				'Register.php'
			),
			blocks: Object.create(null),
			controllers: Object.create(null),
			debugUiPath: layout.resolve('debug.ui'),
		},
	};
}

function mergeArtifacts(
	base: IRArtifactsPlan,
	overrides?: Partial<IRArtifactsPlan>
): IRArtifactsPlan {
	if (!overrides) {
		return base;
	}

	const mergeRecord = <T>(
		target: Record<string, T>,
		source?: Partial<Record<string, T>>
	): Record<string, T> => {
		if (!source) {
			return target;
		}
		const next = { ...target };
		for (const [key, value] of Object.entries(source)) {
			if (value !== undefined) {
				next[key] = value as T;
			}
		}
		return next;
	};

	return {
		...base,
		...overrides,
		pluginLoader: overrides.pluginLoader
			? { ...base.pluginLoader, ...overrides.pluginLoader }
			: base.pluginLoader,
		controllers: mergeRecord(base.controllers, overrides.controllers),
		resources: mergeRecord(base.resources, overrides.resources),
		surfaces: mergeRecord(base.surfaces, overrides.surfaces),
		blocks: mergeRecord(base.blocks, overrides.blocks),
		schemas: mergeRecord(base.schemas, overrides.schemas),
		runtime: overrides.runtime
			? {
					...base.runtime,
					...overrides.runtime,
					entry: {
						...base.runtime.entry,
						...overrides.runtime.entry,
					},
					runtime: {
						...base.runtime.runtime,
						...overrides.runtime.runtime,
					},
				}
			: base.runtime,
		bundler: overrides.bundler
			? { ...base.bundler, ...overrides.bundler }
			: base.bundler,
		php: overrides.php ? { ...base.php, ...overrides.php } : base.php,
	};
}

export function makeIr({
	namespace = 'demo-namespace',
	meta,
	schemas,
	resources,
	capabilities,
	capabilityMap,
	blocks,
	php,
	layout,
	ui,
	diagnostics,
	adapterAudit,
	references,
	artifacts,
}: DeepPartial<IRv1> & { namespace?: string } = {}): IRv1 {
	const layoutMap = loadTestLayoutSync();
	const resolvedMeta = makeIrMeta(namespace, meta ?? {});
	const resolvedLayout: IRv1['layout'] =
		(layout as IRv1['layout'] | undefined) ?? layoutMap;
	const defaultArtifacts = buildTestArtifactsPlan(resolvedLayout);

	return {
		meta: resolvedMeta,
		schemas: (schemas as IRSchema[] | undefined) ?? [],
		resources: (resources as IRResource[] | undefined) ?? [],
		capabilities: (capabilities as IRCapabilityHint[] | undefined) ?? [],
		capabilityMap: makeCapabilityMap(capabilityMap ?? {}),
		blocks: (blocks as IRBlock[] | undefined) ?? [],
		php: makePhpProject(resolvedMeta.namespace, php ?? {}),
		layout: resolvedLayout,
		ui: ui as IRUiSurface | undefined,
		artifacts: mergeArtifacts(
			defaultArtifacts,
			artifacts as Partial<IRArtifactsPlan> | undefined
		),
		diagnostics: diagnostics ?? [],
		adapterAudit,
		references,
	} satisfies IRv1;
}

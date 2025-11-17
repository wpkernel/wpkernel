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
} from '../ir/publicTypes';
import type {
	WPKernelConfigV1,
	ResourceRegistry,
	SchemaRegistry,
} from '../config/types';
import { loadTestLayoutSync } from './layout.test-support';

type DeepPartial<T> = {
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

export function makeIr({
	namespace = 'demo-namespace',
	meta,
	config,
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
}: DeepPartial<IRv1> & { namespace?: string } = {}): IRv1 {
	const layoutMap = loadTestLayoutSync();
	const resolvedMeta = makeIrMeta(namespace, meta ?? {});
	const resolvedConfig: WPKernelConfigV1 = {
		version: 1,
		namespace,
		...(config ?? {}),
		schemas: ((config?.schemas ?? {}) as SchemaRegistry) || {},
		resources: ((config?.resources ?? {}) as ResourceRegistry) || {},
	};
	const resolvedLayout: IRv1['layout'] =
		(layout as IRv1['layout'] | undefined) ?? layoutMap;

	return {
		meta: resolvedMeta,
		config: resolvedConfig,
		schemas: (schemas as IRSchema[] | undefined) ?? [],
		resources: (resources as IRResource[] | undefined) ?? [],
		capabilities: (capabilities as IRCapabilityHint[] | undefined) ?? [],
		capabilityMap: makeCapabilityMap(capabilityMap ?? {}),
		blocks: (blocks as IRBlock[] | undefined) ?? [],
		php: makePhpProject(resolvedMeta.namespace, php ?? {}),
		layout: resolvedLayout,
		ui: ui as IRUiSurface | undefined,
		diagnostics: diagnostics ?? [],
		adapterAudit,
		references,
	} satisfies IRv1;
}

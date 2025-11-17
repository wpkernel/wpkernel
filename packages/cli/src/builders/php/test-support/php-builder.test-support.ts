/* eslint-env jest */
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../runtime/types';
import type { IRv1 } from '../../../ir/publicTypes';
import type { WPKernelConfigV1 } from '../../../config/types';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';
import type { Workspace } from '../../../workspace/types';
import { buildEmptyGenerationState } from '../../../apply/manifest';
import { loadTestLayoutSync } from '../../../tests/layout.test-support';

const DEFAULT_CONFIG_SOURCE = 'tests.config.ts';

export function createReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

export function createPipelineContext(
	overrides?: Partial<PipelineContext>
): PipelineContext {
	const workspace = makeWorkspaceMock<Workspace>({
		root: '/workspace',
	});

	const base: PipelineContext = {
		workspace,
		reporter: createReporter(),
		phase: 'generate',
		generationState: buildEmptyGenerationState(),
	};

	return {
		...base,
		...overrides,
		workspace: overrides?.workspace ?? base.workspace,
		reporter: overrides?.reporter ?? base.reporter,
		phase: overrides?.phase ?? base.phase,
		generationState: overrides?.generationState ?? base.generationState,
	};
}

export function createBuilderInput(
	overrides?: Partial<BuilderInput>
): BuilderInput {
	const namespace = resolveNamespace(overrides);
	const config = resolveConfig(overrides, namespace);

	const base: BuilderInput = {
		phase: 'generate',
		options: {
			config,
			namespace,
			origin: DEFAULT_CONFIG_SOURCE,
			sourcePath: DEFAULT_CONFIG_SOURCE,
		},
		ir: null,
	};

	return {
		...base,
		...overrides,
		options: buildBuilderOptions(base.options, overrides?.options, {
			config,
			namespace,
		}),
	};
}

export function createBuilderOutput(): BuilderOutput & {
	queueWrite: jest.Mock<void, [BuilderOutput['actions'][number]]>;
} {
	const actions: BuilderOutput['actions'] = [];
	const queueWrite = jest.fn((action: BuilderOutput['actions'][number]) => {
		actions.push(action);
	});

	return {
		actions,
		queueWrite,
	};
}

type MinimalIrOverrides = Partial<
	Omit<IRv1, 'meta' | 'php' | 'capabilityMap' | 'config'>
> & {
	meta?: Partial<IRv1['meta']>;
	php?: Partial<IRv1['php']>;
	capabilityMap?: Partial<IRv1['capabilityMap']>;
	config?: Partial<WPKernelConfigV1>;
};

export function createMinimalIr(overrides: MinimalIrOverrides = {}): IRv1 {
	const namespace = resolveNamespaceFromOverrides(overrides);
	const components = buildMinimalIrComponents(namespace, overrides);
	const base = buildIrBase(overrides, components);
	return mergeIrBase(base, overrides);
}

function resolveNamespaceFromOverrides(overrides: MinimalIrOverrides): string {
	return overrides?.meta?.namespace ?? 'DemoPlugin';
}

function buildMinimalIrComponents(
	namespace: string,
	overrides: MinimalIrOverrides
): {
	meta: IRv1['meta'];
	config: WPKernelConfigV1;
	capabilityMap: IRv1['capabilityMap'];
	php: IRv1['php'];
	layout: IRv1['layout'];
} {
	const config = resolveIrConfig(overrides?.config, namespace);
	const meta = buildIrMeta(namespace, overrides?.meta);
	const capabilityMap = buildCapabilityMap(
		namespace,
		overrides?.capabilityMap
	);
	const layout = loadTestLayoutSync();
	const php = buildPhpProject(namespace, {
		...overrides?.php,
		outputDir: overrides?.php?.outputDir ?? layout.resolve('php.generated'),
	});

	return {
		meta,
		config,
		capabilityMap,
		php,
		layout,
	};
}

function resolveNamespace(overrides?: Partial<BuilderInput>): string {
	const optionNamespace = overrides?.options?.namespace;
	if (optionNamespace) {
		return optionNamespace;
	}

	const configNamespace = overrides?.options?.config?.namespace;
	return configNamespace ?? 'demo-plugin';
}

function resolveConfig(
	overrides: Partial<BuilderInput> | undefined,
	namespace: string
): WPKernelConfigV1 {
	return (
		overrides?.options?.config ?? {
			version: 1,
			namespace,
			resources: {},
			schemas: {},
		}
	);
}

function buildBuilderOptions(
	baseOptions: BuilderInput['options'],
	overrideOptions: BuilderInput['options'] | undefined,
	context: { config: WPKernelConfigV1; namespace: string }
): BuilderInput['options'] {
	return {
		...baseOptions,
		...overrideOptions,
		config: context.config,
		namespace: context.namespace,
	};
}

function resolveIrConfig(
	config: Partial<WPKernelConfigV1> | undefined,
	namespace: string
): WPKernelConfigV1 {
	const defaults: WPKernelConfigV1 = {
		version: 1,
		namespace,
		resources: {},
		schemas: {},
	};

	return {
		...defaults,
		...config,
		resources: config?.resources ?? {},
		schemas: config?.schemas ?? {},
		namespace: config?.namespace ?? namespace,
		version: config?.version ?? 1,
	};
}

function buildIrMeta(
	namespace: string,
	overrides?: Partial<IRv1['meta']>
): IRv1['meta'] {
	const sanitizedNamespace =
		overrides?.sanitizedNamespace ??
		namespace.replace(/[^A-Za-z0-9]+/gu, '');

	const defaults: IRv1['meta'] = {
		version: 1,
		namespace,
		sourcePath: DEFAULT_CONFIG_SOURCE,
		origin: 'typescript',
		sanitizedNamespace,
		features: ['capabilityMap', 'phpAutoload'],
		ids: {
			algorithm: 'sha256',
			resourcePrefix: 'res:',
			schemaPrefix: 'sch:',
			blockPrefix: 'blk:',
			capabilityPrefix: 'cap:',
		},
		redactions: ['config.env', 'adapters.secrets'],
		limits: {
			maxConfigKB: 256,
			maxSchemaKB: 1024,
			policy: 'truncate',
		},
	};

	return {
		...defaults,
		...overrides,
		namespace,
		sanitizedNamespace,
	};
}

function buildCapabilityMap(
	namespace: string,
	overrides?: Partial<IRv1['capabilityMap']>
): IRv1['capabilityMap'] {
	const defaults: IRv1['capabilityMap'] = {
		definitions: [],
		fallback: {
			capability: `manage_${namespace.toLowerCase()}`,
			appliesTo: 'resource',
		},
		missing: [],
		unused: [],
		warnings: [],
	};

	return {
		...defaults,
		...overrides,
		fallback: {
			...defaults.fallback,
			...overrides?.fallback,
		},
	};
}

function buildPhpProject(
	namespace: string,
	overrides?: Partial<IRv1['php']>
): IRv1['php'] {
	return {
		namespace: overrides?.namespace ?? namespace,
		autoload: overrides?.autoload ?? 'inc/',
		outputDir: overrides?.outputDir as IRv1['php']['outputDir'],
	};
}

function buildIrBase(
	overrides: MinimalIrOverrides | undefined,
	components: {
		meta: IRv1['meta'];
		config: WPKernelConfigV1;
		capabilityMap: IRv1['capabilityMap'];
		php: IRv1['php'];
		layout: IRv1['layout'];
	}
): IRv1 {
	const {
		schemas = [],
		resources = [],
		capabilities = [],
		blocks = [],
		diagnostics = [],
	} = overrides ?? {};

	return {
		meta: components.meta,
		config: components.config,
		schemas,
		resources,
		capabilities,
		capabilityMap: components.capabilityMap,
		blocks,
		php: components.php,
		layout: components.layout,
		diagnostics,
	};
}

function mergeIrBase(base: IRv1, overrides?: MinimalIrOverrides): IRv1 {
	if (!overrides) {
		return base;
	}

	return {
		...base,
		...overrides,
		meta: base.meta,
		config: base.config,
		capabilityMap: base.capabilityMap,
		php: base.php,
	};
}

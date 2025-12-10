import { createReporterMock } from '../reporter.js';
import {
	withWorkspace,
	type WorkspaceOptions,
} from '../integration/workspace.js';
import { buildWorkspace } from '../../src/workspace';
import { createPipeline } from '../../src/runtime/createPipeline';
import {
	buildEmptyGenerationState,
	type GenerationManifest,
} from '../../src/apply/manifest';
import { FIXTURE_CONFIG_PATH } from '../../src/ir/shared/test-helpers';
import type { Workspace } from '../../src/workspace/types';
import type {
	Pipeline,
	PipelineRunOptions,
	PipelineRunResult,
} from '../../src/runtime/types';
import type { WPKernelConfigV1 } from '../../src/config/types.js';

const DEFAULT_CONFIG: WPKernelConfigV1 = {
	version: 1,
	namespace: 'test-namespace',
	schemas: {},
	resources: {},
};

export interface PipelineHarnessDefaults {
	readonly phase?: PipelineRunOptions['phase'];
	readonly namespace?: PipelineRunOptions['namespace'];
	readonly origin?: PipelineRunOptions['origin'];
	readonly sourcePath?: PipelineRunOptions['sourcePath'];
	readonly config?: PipelineRunOptions['config'];
	readonly generationStateFactory?: () => GenerationManifest;
}

interface ResolvedHarnessDefaults {
	readonly config: WPKernelConfigV1;
	readonly phase: PipelineRunOptions['phase'];
	readonly namespace: string;
	readonly origin: string;
	readonly sourcePath: string;
	readonly createGenerationState: () => GenerationManifest;
}

export interface WithPipelineHarnessOptions {
	readonly config?: WPKernelConfigV1;
	readonly defaults?: PipelineHarnessDefaults;
	readonly reporterFactory?: () => ReturnType<typeof createReporterMock>;
	readonly workspaceOptions?: WorkspaceOptions;
}

export interface PipelineHarnessContext {
	readonly pipeline: Pipeline;
	readonly config: WPKernelConfigV1;
	readonly workspace: Workspace;
	readonly reporter: ReturnType<typeof createReporterMock>;
	readonly defaults: Readonly<{
		phase: PipelineRunOptions['phase'];
		namespace: string;
		origin: string;
		sourcePath: string;
	}>;
	readonly run: (
		overrides?: Partial<PipelineRunOptions>
	) => Promise<PipelineRunResult>;
}

function pickConfig(
	overrideConfig: PipelineHarnessDefaults['config'],
	configOverride: WPKernelConfigV1 | undefined
): WPKernelConfigV1 {
	return overrideConfig ?? configOverride ?? DEFAULT_CONFIG;
}

function pickPhase(
	overridePhase: PipelineHarnessDefaults['phase']
): PipelineRunOptions['phase'] {
	return overridePhase ?? 'generate';
}

function pickNamespace(
	config: WPKernelConfigV1,
	overrideNamespace: PipelineHarnessDefaults['namespace']
): string {
	return overrideNamespace ?? config.namespace;
}

function pickOrigin(overrideOrigin: PipelineHarnessDefaults['origin']): string {
	return overrideOrigin ?? 'typescript';
}

function pickSourcePath(
	overrideSourcePath: PipelineHarnessDefaults['sourcePath']
): string {
	return overrideSourcePath ?? FIXTURE_CONFIG_PATH;
}

function pickGenerationFactory(
	overrideFactory: PipelineHarnessDefaults['generationStateFactory']
): () => GenerationManifest {
	return overrideFactory ?? buildEmptyGenerationState;
}

function resolveHarnessDefaults(
	configOverride: WPKernelConfigV1 | undefined,
	defaultOverrides: PipelineHarnessDefaults | undefined
): ResolvedHarnessDefaults {
	const overrides = defaultOverrides ?? {};
	const config = pickConfig(overrides.config, configOverride);

	return {
		config,
		phase: pickPhase(overrides.phase),
		namespace: pickNamespace(config, overrides.namespace),
		origin: pickOrigin(overrides.origin),
		sourcePath: pickSourcePath(overrides.sourcePath),
		createGenerationState: pickGenerationFactory(
			overrides.generationStateFactory
		),
	} satisfies ResolvedHarnessDefaults;
}

function mergeRunOptions(
	defaults: ResolvedHarnessDefaults,
	workspace: Workspace,
	reporter: ReturnType<typeof createReporterMock>,
	overrides: Partial<PipelineRunOptions>
): PipelineRunOptions {
	return {
		phase: overrides.phase ?? defaults.phase,
		config: overrides.config ?? defaults.config,
		namespace: overrides.namespace ?? defaults.namespace,
		origin: overrides.origin ?? defaults.origin,
		sourcePath: overrides.sourcePath ?? defaults.sourcePath,
		workspace: overrides.workspace ?? workspace,
		reporter: overrides.reporter ?? reporter,
		generationState:
			overrides.generationState ?? defaults.createGenerationState(),
	} satisfies PipelineRunOptions;
}

export async function withPipelineHarness(
	run: (context: PipelineHarnessContext) => Promise<void>,
	options: WithPipelineHarnessOptions = {}
): Promise<void> {
	const {
		config: configOverride,
		defaults: defaultOverrides,
		reporterFactory = createReporterMock,
		workspaceOptions,
	} = options;

	const resolvedDefaults = resolveHarnessDefaults(
		configOverride,
		defaultOverrides
	);

	await withWorkspace(
		async (workspaceRoot) => {
			const pipeline = createPipeline();
			const workspace = buildWorkspace(workspaceRoot);
			const reporter = reporterFactory();

			const defaultsView = {
				phase: resolvedDefaults.phase,
				namespace: resolvedDefaults.namespace,
				origin: resolvedDefaults.origin,
				sourcePath: resolvedDefaults.sourcePath,
			} as const;

			const runPipeline = (
				overrides: Partial<PipelineRunOptions> = {}
			): Promise<PipelineRunResult> =>
				Promise.resolve(
					pipeline.run(
						mergeRunOptions(
							resolvedDefaults,
							workspace,
							reporter,
							overrides
						)
					)
				);

			await run({
				pipeline,
				config: resolvedDefaults.config,
				workspace,
				reporter,
				defaults: defaultsView,
				run: runPipeline,
			});
		},
		{ chdir: false, ...(workspaceOptions ?? {}) }
	);
}

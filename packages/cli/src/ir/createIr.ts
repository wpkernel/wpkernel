import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import { createNoopReporter as buildNoopReporter } from '@wpkernel/core/reporter';
import type { BuildIrOptions, IRv1 } from './publicTypes';
import { createPipeline } from '../runtime';
import type { PipelinePhase, Pipeline } from '../runtime';
import type { Workspace } from '../workspace';
import { buildWorkspace } from '../workspace';
import { createMetaFragment } from './fragments/meta';
import { createLayoutFragment } from './fragments/layout';
import { createSchemasFragment } from './fragments/schemas';
import { createResourcesFragment } from './fragments/resources';
import { createUiFragment } from './fragments/ui';
import { createCapabilitiesFragment } from './fragments/capabilities';
import { createCapabilityMapFragment } from './fragments/capability-map';
import { createBlocksFragment } from './fragments/blocks';
import { createDiagnosticsFragment } from './fragments/diagnostics';
import { createOrderingFragment } from './fragments/ordering';
import { createValidationFragment } from './fragments/validation';
import {
	createApplyPlanBuilder,
	createBundler,
	createJsBlocksBuilder,
	createPatcher,
	createPhpBuilder,
	createPhpDriverInstaller,
	createTsCapabilityBuilder,
	createTsIndexBuilder,
	createTsBuilder,
} from '../builders';
import { buildAdapterExtensionsExtension } from '../runtime/adapterExtensions';
import { buildEmptyGenerationState } from '../apply/manifest';

/**
 * Defines the environment for creating an Intermediate Representation (IR).
 *
 * @category IR
 * @public
 */
export interface CreateIrEnvironment {
	/** Optional: The workspace instance to use. */
	readonly workspace?: Workspace;
	/** Optional: The reporter instance for logging. */
	readonly reporter?: Reporter;
	/** Optional: The pipeline phase to execute. */
	readonly phase?: PipelinePhase;
	/** Optional: The pipeline instance to use. */
	readonly pipeline?: Pipeline;
}

/**
 * Registers the core IR fragments with the pipeline.
 *
 * These fragments are responsible for extracting various pieces of information
 * from the configuration and building up the Intermediate Representation.
 *
 * @category IR
 * @param    pipeline - The pipeline instance to register fragments with.
 */
function registerCoreFragments(pipeline: Pipeline): void {
	pipeline.ir.use(createLayoutFragment());
	pipeline.ir.use(createMetaFragment());
	pipeline.ir.use(createSchemasFragment());
	pipeline.ir.use(createResourcesFragment());
	pipeline.ir.use(createUiFragment());
	pipeline.ir.use(createCapabilitiesFragment());
	pipeline.ir.use(createCapabilityMapFragment());
	pipeline.ir.use(createDiagnosticsFragment());
	pipeline.ir.use(createBlocksFragment());
	pipeline.ir.use(createOrderingFragment());
	pipeline.ir.use(createValidationFragment());
}

/**
 * Registers the core builders with the pipeline.
 *
 * These builders are responsible for taking the Intermediate Representation
 * and generating various output artifacts (e.g., PHP, TypeScript, bundles).
 *
 * @category IR
 * @param    pipeline - The pipeline instance to register builders with.
 */
function registerCoreBuilders(pipeline: Pipeline): void {
	pipeline.builders.use(createBundler());
	pipeline.builders.use(createPhpDriverInstaller());
	pipeline.builders.use(createJsBlocksBuilder());
	pipeline.builders.use(createPhpBuilder());
	pipeline.builders.use(createApplyPlanBuilder());
	pipeline.builders.use(createTsBuilder());
	pipeline.builders.use(createTsCapabilityBuilder());
	pipeline.builders.use(createTsIndexBuilder());
	pipeline.builders.use(createPatcher());
}

/**
 * Creates an Intermediate Representation (IR) from the given build options.
 *
 * This function sets up a pipeline with core fragments and builders, then runs
 * the pipeline to generate the IR based on the provided configuration.
 *
 * @category IR
 * @param    options     - Options for building the IR, including configuration and source paths.
 * @param    environment - Optional environment settings for the IR creation process.
 * @returns A promise that resolves to the generated `IRv1` object.
 */
export async function createIr(
	options: BuildIrOptions,
	environment: CreateIrEnvironment = {}
): Promise<IRv1> {
	const pipeline = environment.pipeline ?? createPipeline();
	registerCoreFragments(pipeline);
	registerCoreBuilders(pipeline);
	pipeline.extensions.use(buildAdapterExtensionsExtension());

	const workspace =
		environment.workspace ??
		buildWorkspace(path.dirname(options.sourcePath));
	const reporter = environment.reporter ?? buildNoopReporter();
	const phase = environment.phase ?? 'generate';

	const { ir } = await pipeline.run({
		phase,
		config: options.config,
		namespace: options.namespace,
		origin: options.origin,
		sourcePath: options.sourcePath,
		workspace,
		reporter,
		generationState: buildEmptyGenerationState(),
	});

	return ir;
}

export { registerCoreFragments, registerCoreBuilders };

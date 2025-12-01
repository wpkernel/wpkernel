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
import { createBundlerFragment } from './fragments/bundler';
import { createUiFragment } from './fragments/ui';
import { createCapabilitiesFragment } from './fragments/capabilities';
import { createCapabilityMapFragment } from './fragments/capability-map';
import { createBlocksFragment } from './fragments/blocks';
import { createDiagnosticsFragment } from './fragments/diagnostics';
import { createOrderingFragment } from './fragments/ordering';
import { createValidationFragment } from './fragments/validation';
import { createArtifactsFragment } from './fragments/artifacts';
import {
	createPlanBuilder,
	createBundler,
	createJsBlocksBuilder,
	createPhpBuilderConfigHelper,
	createPhpBaseControllerHelper,
	createPhpCapabilityHelper,
	createPhpChannelHelper,
	createPhpCodemodIngestionHelper,
	createPhpDriverInstaller,
	createPhpIndexFileHelper,
	createPhpPersistenceRegistryHelper,
	createPhpPluginLoaderHelper,
	createPhpResourceControllerHelper,
	createPhpTransientStorageHelper,
	createPhpWpOptionStorageHelper,
	createPhpWpPostRoutesHelper,
	createPhpWpTaxonomyStorageHelper,
	createTsCapabilityBuilder,
	createTsIndexBuilder,
	createTsTypesBuilder,
	createTsResourcesBuilder,
	createUiEntryBuilder,
	createTsConfigBuilder,
	createAdminScreenBuilder,
	createAppConfigBuilder,
	createAppFormBuilder,
	createWpProgramWriterHelper,
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
	pipeline.ir.use(createBundlerFragment());
	pipeline.ir.use(createUiFragment());
	pipeline.ir.use(createCapabilitiesFragment());
	pipeline.ir.use(createCapabilityMapFragment());
	pipeline.ir.use(createDiagnosticsFragment());
	pipeline.ir.use(createBlocksFragment());
	pipeline.ir.use(createOrderingFragment());
	pipeline.ir.use(createValidationFragment());
	pipeline.ir.use(createArtifactsFragment());
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
	pipeline.builders.use(createJsBlocksBuilder());
	pipeline.builders.use(createTsTypesBuilder());
	pipeline.builders.use(createTsResourcesBuilder());
	pipeline.builders.use(createAdminScreenBuilder());
	pipeline.builders.use(createAppConfigBuilder());
	pipeline.builders.use(createAppFormBuilder());
	pipeline.builders.use(createUiEntryBuilder());
	pipeline.builders.use(createTsConfigBuilder());
	pipeline.builders.use(createBundler());
	pipeline.builders.use(createPhpDriverInstaller());
	pipeline.builders.use(createPhpChannelHelper());
	pipeline.builders.use(createPhpBuilderConfigHelper());
	pipeline.builders.use(createPhpBaseControllerHelper());
	pipeline.builders.use(createPhpTransientStorageHelper());
	pipeline.builders.use(createPhpWpOptionStorageHelper());
	pipeline.builders.use(createPhpWpTaxonomyStorageHelper());
	pipeline.builders.use(createPhpWpPostRoutesHelper());
	pipeline.builders.use(createPhpResourceControllerHelper());
	pipeline.builders.use(createPhpCapabilityHelper());
	pipeline.builders.use(createPhpPersistenceRegistryHelper());
	pipeline.builders.use(createPhpPluginLoaderHelper());
	pipeline.builders.use(createPhpIndexFileHelper());
	pipeline.builders.use(createPhpCodemodIngestionHelper({ files: [] }));
	pipeline.builders.use(createWpProgramWriterHelper());
	pipeline.builders.use(createTsCapabilityBuilder());
	pipeline.builders.use(createTsIndexBuilder());
	pipeline.builders.use(createPlanBuilder());
}

async function runIrPipeline(
	options: BuildIrOptions,
	environment: CreateIrEnvironment,
	mode: 'fragments-only' | 'with-builders'
): Promise<IRv1> {
	const pipeline = environment.pipeline ?? createPipeline();

	registerCoreFragments(pipeline);
	if (mode === 'with-builders') {
		registerCoreBuilders(pipeline);
	}

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

/**
 * Builds the Intermediate Representation (IR) by running only the core IR fragments.
 *
 * This variant does not register or execute any builders. It is intended for
 * scenarios where you want a deterministic IR to assert against (e.g. tests
 * or analysis tooling) without generating any artefacts on disk.
 *
 * @category IR
 * @param    options     - Options for building the IR, including configuration and source paths.
 * @param    environment - Optional environment settings for the IR creation process.
 * @returns A promise that resolves to the generated `IRv1` object.
 */
export function createIr(
	options: BuildIrOptions,
	environment: CreateIrEnvironment = {}
): Promise<IRv1> {
	return runIrPipeline(options, environment, 'fragments-only');
}

/**
 * Runs the full generation pipeline (IR + builders) from the given build options.
 *
 * This function sets up a pipeline with core IR fragments and all core builders,
 * then executes it to both construct the IR and generate artefacts (PHP, TS, UI
 * entries, bundles, etc.) as a side-effect. It represents the high-level
 * "generate everything" entry point used by the CLI.
 *
 * @category IR
 * @param    options     - Options for building the IR, including configuration and source paths.
 * @param    environment - Optional environment settings for the IR creation process.
 * @returns A promise that resolves to the generated `IRv1` object.
 */
export async function createIrWithBuilders(
	options: BuildIrOptions,
	environment: CreateIrEnvironment = {}
): Promise<IRv1> {
	return runIrPipeline(options, environment, 'with-builders');
}

export { registerCoreFragments, registerCoreBuilders };

import { WPKernelError } from '@wpkernel/core/error';
import type { ResourceConfig } from '@wpkernel/core/resource';
import type { Reporter } from '@wpkernel/core/reporter';
import { type BuilderHelper, createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderOutput,
	PipelinePhase,
} from '../../runtime/types';
import { buildDataViewRegistryCreator } from './pipeline.creator.registry';
import { buildDataViewInteractivityFixtureCreator } from './pipeline.creator.interactivityFixture';
import { buildDataViewFixtureCreator } from './pipeline.creator.dataViewFixture';
import { buildAdminScreenCreator } from './pipeline.creator.adminScreen';
import {
	type AdminDataViews,
	type CreateTsBuilderOptions,
	type ResourceDescriptor,
	type TsBuilderCreator,
	type TsBuilderCreatorContext,
	type TsBuilderEmitOptions,
	type TsBuilderLifecycleHooks,
} from '../types';
import { resolveTsLayout } from './ts.paths';
import type { IRv1 } from '../../ir';
import type { Workspace } from '../../workspace';
import { createHash as buildHash } from 'crypto';
import type { Project } from 'ts-morph';
import type { GenerationSummary } from '../../commands';
import { validateGeneratedImports } from '../../commands/run-generate';
import { loadTsMorph } from './runtime.loader';

/**
 * Creates a builder helper for generating TypeScript artifacts.
 *
 * Orchestrates:
 * - Admin screens under `.wpk/generate/ui/app/...`
 * - DataView fixtures under `.wpk/generate/ui/fixtures/dataviews/...`
 * - Interactivity fixtures under `.wpk/generate/ui/fixtures/interactivity/...`
 * - Registry metadata under `.wpk/generate/ui/registry/dataviews/...`
 *
 * @param    options
 * @category AST Builders
 * @example
 * ```ts
 * const builder = createTsBuilder();
 * await builder.apply({ context, input, output, reporter }, undefined);
 * ```
 * @returns A `BuilderHelper` instance configured to generate TypeScript artifacts.
 */

export function createTsBuilder(
	options: CreateTsBuilderOptions = {}
): BuilderHelper {
	const creators = options.creators?.slice() ?? [
		buildAdminScreenCreator(),
		buildDataViewFixtureCreator(),
		buildDataViewInteractivityFixtureCreator(),
		buildDataViewRegistryCreator(),
	];
	const projectFactory = options.projectFactory ?? buildProject;
	const lifecycleHooks = options.hooks ?? {};

	return createHelper({
		key: 'builder.generate.ts.core',
		kind: 'builder',
		async apply({ context, input, output, reporter }: BuilderApplyOptions) {
			if (!isGeneratePhase(input.phase, reporter)) {
				return;
			}

			const ir = requireIr(input.ir);

			const emittedFiles: string[] = [];
			const descriptors = collectResourceDescriptors(
				input.options.config.resources
			);

			if (descriptors.length === 0) {
				reporter.debug('createTsBuilder: no resources registered.');
				return;
			}

			const project = await Promise.resolve(projectFactory());
			const emit = buildEmitter(context.workspace, output, emittedFiles);
			const paths = resolveTsLayout(ir);
			await generateArtifacts({
				descriptors,
				creators,
				project,
				lifecycleHooks,
				context,
				input: { ...input, ir },
				reporter,
				emit,
				emittedFiles,
				paths,
			});

			await notifyAfterEmit({
				hooks: lifecycleHooks,
				emittedFiles,
				workspace: context.workspace,
				reporter,
			});

			await runImportValidation({
				emittedFiles,
				workspace: context.workspace,
				reporter,
			});

			logEmissionSummary(reporter, emittedFiles);
		},
	});
}

/**
 * Extracts resource descriptors from CLI config entries that declare admin DataViews.
 *
 * @param    resources
 * @category Builders
 */
export function collectResourceDescriptors(
	resources: Record<string, ResourceConfig> | undefined
): ResourceDescriptor[] {
	const descriptors: ResourceDescriptor[] = [];

	if (!resources) {
		return descriptors;
	}

	for (const [key, resourceConfig] of Object.entries(resources)) {
		const dataviews = resourceConfig.ui?.admin?.dataviews;
		if (!dataviews) {
			continue;
		}

		descriptors.push({
			key,
			name: resourceConfig.name ?? key,
			config: resourceConfig,
			dataviews: dataviews as AdminDataViews,
		});
	}

	return descriptors;
}

/**
 * Builds a helper that formats, writes, and tracks generated TS files.
 *
 * @param    workspace
 * @param    output
 * @param    emittedFiles
 * @category Builders
 */
export function buildEmitter(
	workspace: Workspace,
	output: BuilderOutput,
	emittedFiles: string[]
): (options: TsBuilderEmitOptions) => Promise<void> {
	return async ({ filePath, sourceFile }: TsBuilderEmitOptions) => {
		sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
		const contents = sourceFile.getFullText();

		await workspace.write(filePath, contents);
		output.queueWrite({ file: filePath, contents });
		emittedFiles.push(filePath);

		sourceFile.forget();
	};
}

/**
 * Guards the builder so it only runs during the `generate` pipeline phase.
 *
 * @param    phase
 * @param    reporter
 * @category Builders
 */
export function isGeneratePhase(
	phase: PipelinePhase,
	reporter: Reporter
): boolean {
	if (phase === 'generate') {
		return true;
	}

	reporter.debug('createTsBuilder: skipping phase.', { phase });
	return false;
}

/**
 * Ensures the builder receives an IR instance before generating artifacts.
 *
 * @param    ir
 * @category Builders
 */
export function requireIr(ir: IRv1 | null): IRv1 {
	if (ir) {
		return ir;
	}

	throw new WPKernelError('ValidationError', {
		message: 'createTsBuilder requires an IR instance during execution.',
	});
}
/**
 * Invokes each registered creator for every resource descriptor.
 *
 * @param    options
 * @param    options.descriptors
 * @param    options.creators
 * @param    options.project
 * @param    options.lifecycleHooks
 * @param    options.context
 * @param    options.input
 * @param    options.reporter
 * @param    options.emit
 * @param    options.emittedFiles
 * @param    options.paths
 * @category Builders
 */
export async function generateArtifacts(options: {
	readonly descriptors: readonly ResourceDescriptor[];
	readonly creators: readonly TsBuilderCreator[];
	readonly project: Project;
	readonly lifecycleHooks: TsBuilderLifecycleHooks;
	readonly context: Parameters<BuilderHelper['apply']>[0]['context'];
	readonly input: Parameters<BuilderHelper['apply']>[0]['input'] & {
		ir: IRv1;
	};
	readonly reporter: Reporter;
	readonly emit: (options: TsBuilderEmitOptions) => Promise<void>;
	readonly emittedFiles: string[];
	readonly paths: ReturnType<typeof resolveTsLayout>;
}): Promise<void> {
	const {
		descriptors,
		creators,
		project,
		lifecycleHooks,
		context,
		input,
		reporter,
		emit,
		paths,
	} = options;

	for (const descriptor of descriptors) {
		const creatorContext: TsBuilderCreatorContext = {
			project,
			workspace: context.workspace,
			descriptor,
			config: input.options.config,
			sourcePath: input.options.sourcePath,
			ir: input.ir,
			reporter,
			emit,
			paths,
		};

		for (const creator of creators) {
			if (lifecycleHooks.onBeforeCreate) {
				await lifecycleHooks.onBeforeCreate(creatorContext);
			}
			await creator.create(creatorContext);
			if (lifecycleHooks.onAfterCreate) {
				await lifecycleHooks.onAfterCreate(creatorContext);
			}
		}
	}
}

/**
 * Invokes the optional `onAfterEmit` hook with the final emission summary.
 *
 * @param    options
 * @param    options.hooks
 * @param    options.emittedFiles
 * @param    options.workspace
 * @param    options.reporter
 * @category Builders
 */
export async function notifyAfterEmit(options: {
	readonly hooks: TsBuilderLifecycleHooks;
	readonly emittedFiles: readonly string[];
	readonly workspace: Workspace;
	readonly reporter: Reporter;
}): Promise<void> {
	if (!options.hooks.onAfterEmit) {
		return;
	}

	await options.hooks.onAfterEmit({
		emitted: [...options.emittedFiles],
		workspace: options.workspace,
		reporter: options.reporter,
	});
}

/**
 * Logs a short summary (count + preview) of emitted files for DX.
 *
 * @param    reporter
 * @param    emittedFiles
 * @category Builders
 */
export function logEmissionSummary(
	reporter: Reporter,
	emittedFiles: readonly string[]
): void {
	if (emittedFiles.length === 0) {
		reporter.debug('createTsBuilder: generated TypeScript artifacts.');
		return;
	}

	const previewList = emittedFiles
		.slice(0, 3)
		.map((file) => file.replace(/\\/g, '/'))
		.join(', ');
	const suffix = emittedFiles.length > 3 ? ', …' : '';
	reporter.debug(
		`createTsBuilder: ${emittedFiles.length} files written (${previewList}${suffix})`
	);
}

/**
 * Builds the generation summary consumed by validation + telemetry.
 *
 * @param    emittedFiles
 * @param    workspace
 * @category Builders
 */
async function buildGenerationSummary(
	emittedFiles: readonly string[],
	workspace: Workspace
): Promise<GenerationSummary> {
	const entries = [] as GenerationSummary['entries'];

	for (const file of emittedFiles) {
		const contents = await workspace.read(file);
		const data = contents ? contents.toString('utf8') : '';
		const hash = buildHash('sha256').update(data).digest('hex');

		entries.push({
			path: file.replace(/\\/g, '/'),
			status: 'written',
			hash,
		});
	}

	const counts = {
		written: entries.length,
		unchanged: 0,
		skipped: 0,
	} as GenerationSummary['counts'];

	return {
		dryRun: false,
		counts,
		entries,
	};
}

/**
 * Runs the import validator against every emitted TypeScript file.
 *
 * @param    options
 * @param    options.emittedFiles
 * @param    options.workspace
 * @param    options.reporter
 * @category Builders
 */
export async function runImportValidation(options: {
	readonly emittedFiles: readonly string[];
	readonly workspace: Workspace;
	readonly reporter: Reporter;
}): Promise<void> {
	if (options.emittedFiles.length === 0) {
		options.reporter.debug(
			'createTsBuilder: no emitted TypeScript files to validate.'
		);
		return;
	}

	const summary = await buildGenerationSummary(
		options.emittedFiles,
		options.workspace
	);

	await validateGeneratedImports({
		projectRoot: options.workspace.root,
		summary,
		reporter: options.reporter,
	});
}
/**
 * Lazily constructs an in-memory ts-morph project configured for 2-space formatting.
 *
 * @category Builders
 */
export async function buildProject(): Promise<Project> {
	const { Project, IndentationText, QuoteKind, NewLineKind } =
		await loadTsMorph();

	return new Project({
		useInMemoryFileSystem: true,
		manipulationSettings: {
			indentationText: IndentationText.TwoSpaces,
			quoteKind: QuoteKind.Single,
			newLineKind: NewLineKind.LineFeed,
		},
	});
}

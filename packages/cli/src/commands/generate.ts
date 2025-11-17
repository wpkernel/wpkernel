import { Command, Option } from 'clipanion';
import { WPK_EXIT_CODES, type WPKExitCode } from '@wpkernel/core/contracts';
import type { GenerationSummary } from './run-generate/types';
import { handleFailure } from './run-generate/errors';
import type { Reporter } from '@wpkernel/core/reporter';
import {
	buildGenerateDependencies,
	buildReporterNamespace,
	resolveWorkspaceRoot,
} from './generate/dependencies';
import { logDiagnostics } from './generate/logging';
import { createTrackedWorkspace, safeRollback } from './generate/workspace';
import type {
	BuildGenerateCommandOptions,
	GenerateDependencies,
	GenerateResult,
	GenerateExecutionOptions,
} from './generate/types';
import { emitFatalError } from './fatal';
import type { Workspace } from '../workspace';
import {
	buildGenerationManifestFromIr,
	type GenerationManifestDiff,
	diffGenerationState,
	readGenerationState,
	writeGenerationState,
} from '../apply/manifest';
import { runCommandReadiness } from './readiness';
import { resolveCommandCwd } from './init/command-runtime';
import { runWithProgress, formatDuration } from '../utils/progress';
import { COMMAND_HELP } from '../cli/help';
import { resolvePatchPaths } from '../builders/patcher.paths';

// Re-export types from sub-modules for TypeDoc
export type { GenerationSummary } from './run-generate/types';
export type {
	FileWriterSummary,
	FileWriteStatus,
	FileWriteRecord,
} from '../utils/file-writer';
export type { ValidateGeneratedImportsOptions } from './run-generate/validation';
export { runGenerateWorkflow };

/**
 * Constructor for a Clipanion command.
 * @public
 */
export type CommandConstructor = new () => Command & {
	summary: GenerationSummary | null;
};

const TRANSACTION_LABEL = 'generate';

function buildFailure(exitCode: WPKExitCode): GenerateResult {
	return {
		exitCode,
		summary: null,
		output: null,
	};
}

async function finalizeWorkspaceTransaction(
	workspace: Workspace,
	reporter: Reporter,
	dryRun: boolean,
	manifestPath: string
): Promise<GenerateResult | null> {
	if (dryRun) {
		await workspace.rollback(TRANSACTION_LABEL);
		return null;
	}

	await workspace.commit(TRANSACTION_LABEL);

	const manifestExists = await workspace.exists(manifestPath);
	if (manifestExists) {
		return null;
	}

	const context = {
		manifestPath,
		workspace: workspace.root,
	} as const;
	const message = 'Failed to locate apply manifest after generation.';

	emitFatalError(message, context);
	reporter.error(message, context);

	return buildFailure(WPK_EXIT_CODES.UNEXPECTED_ERROR);
}

async function removeStaleGeneratedArtifacts({
	diff,
	workspace,
	reporter,
}: {
	readonly diff: GenerationManifestDiff;
	readonly workspace: Workspace;
	readonly reporter: Reporter;
}): Promise<void> {
	for (const removed of diff.removed) {
		const uniqueFiles = new Set(
			removed.generated.filter((file): file is string => Boolean(file))
		);

		for (const file of uniqueFiles) {
			await workspace.rm(file);
			reporter.debug('Removed stale generated artifact.', {
				file,
				resource: removed.resource,
			});
		}
	}
}

async function runGenerateWorkflow(
	options: GenerateExecutionOptions
): Promise<GenerateResult> {
	const { dependencies, reporter, dryRun, verbose, cwd, allowDirty } =
		options;

	try {
		const loaded = await dependencies.loadWPKernelConfig();
		const workspaceRoot = resolveWorkspaceRoot(loaded);
		const baseWorkspace = dependencies.buildWorkspace(workspaceRoot);
		const tracked = createTrackedWorkspace(baseWorkspace, { dryRun });
		const pipeline = dependencies.createPipeline();

		await runCommandReadiness({
			buildReadinessRegistry: dependencies.buildReadinessRegistry,
			registryOptions: {
				helperFactories: loaded.config.readiness?.helpers,
			},
			reporter: reporter.child('readiness'),
			workspace: tracked.workspace,
			workspaceRoot,
			cwd,
			keys: [],
			scopes: ['generate'],
			allowDirty,
		});

		dependencies.registerFragments(pipeline);
		dependencies.registerBuilders(pipeline);
		pipeline.extensions.use(dependencies.buildAdapterExtensionsExtension());

		const previousGenerationState = await readGenerationState(
			tracked.workspace
		);

		tracked.workspace.begin(TRANSACTION_LABEL);

		try {
			const { result: pipelineResult } = await runWithProgress({
				reporter,
				label: 'Running generation pipeline',
				run: () =>
					pipeline.run({
						phase: 'generate',
						config: loaded.config,
						namespace: loaded.namespace,
						origin: loaded.configOrigin,
						sourcePath: loaded.sourcePath,
						workspace: tracked.workspace,
						reporter,
						generationState: previousGenerationState,
					}),
				successMessage: (durationMs) =>
					`✓ Generation pipeline completed in ${formatDuration(durationMs)}.`,
			});

			const result = pipelineResult;

			logDiagnostics(reporter, result.diagnostics);

			const nextGenerationState = buildGenerationManifestFromIr(
				result.ir
			);
			const diff = diffGenerationState(
				previousGenerationState,
				nextGenerationState
			);

			await removeStaleGeneratedArtifacts({
				diff,
				workspace: tracked.workspace,
				reporter,
			});

			await writeGenerationState(tracked.workspace, nextGenerationState);

			const writerSummary = tracked.summary.buildSummary();
			const generationSummary: GenerationSummary = {
				...writerSummary,
				dryRun,
			};
			const artifactPaths = result.ir?.layout
				? {
						php: result.ir.layout.resolve('php.generated'),
						ui: result.ir.layout.resolve('ui.generated'),
						js: result.ir.layout.resolve('js.generated'),
					}
				: undefined;

			const patchPaths = resolvePatchPaths({
				layout: result.ir?.layout,
			});

			const manifestFailure = await finalizeWorkspaceTransaction(
				tracked.workspace,
				reporter,
				dryRun,
				patchPaths.manifestPath
			);

			if (manifestFailure) {
				return manifestFailure;
			}

			reporter.info('Generation completed.', {
				dryRun,
				counts: writerSummary.counts,
			});
			reporter.debug('Generated files.', {
				files: writerSummary.entries,
			});

			try {
				await dependencies.validateGeneratedImports({
					projectRoot: tracked.workspace.root,
					summary: generationSummary,
					reporter,
				});
			} catch (error) {
				const exitCode = handleFailure(
					error,
					reporter,
					WPK_EXIT_CODES.UNEXPECTED_ERROR,
					{ includeContext: verbose }
				);
				return buildFailure(exitCode);
			}

			const output = dependencies.renderSummary(
				writerSummary,
				dryRun,
				verbose,
				artifactPaths
			);

			return {
				exitCode: WPK_EXIT_CODES.SUCCESS,
				summary: generationSummary,
				output,
			} satisfies GenerateResult;
		} catch (error) {
			await safeRollback(tracked.workspace, TRANSACTION_LABEL);
			const exitCode = handleFailure(
				error,
				reporter,
				WPK_EXIT_CODES.UNEXPECTED_ERROR,
				{ includeContext: verbose }
			);
			return buildFailure(exitCode);
		}
	} catch (error) {
		const exitCode = handleFailure(
			error,
			reporter,
			WPK_EXIT_CODES.UNEXPECTED_ERROR,
			{ includeContext: verbose }
		);
		return buildFailure(exitCode);
	}
}

function buildCommandConstructor(
	dependencies: GenerateDependencies
): CommandConstructor {
	return class GenerateCommand extends Command {
		static override paths = [['generate']];

		static override usage = Command.Usage({
			description: COMMAND_HELP.generate.description,
			details: COMMAND_HELP.generate.details,
			examples: COMMAND_HELP.generate.examples,
		});

		dryRun = Option.Boolean('--dry-run,-d', false);
		verbose = Option.Boolean('--verbose,-v', false);
		allowDirty = Option.Boolean('--allow-dirty,-D', false);

		public summary: GenerationSummary | null = null;

		override async execute(): Promise<WPKExitCode> {
			const cwd = resolveCommandCwd(this.context);
			const reporter = dependencies.buildReporter({
				namespace: buildReporterNamespace(),
				level: this.verbose ? 'debug' : 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});

			this.summary = null;

			const result = await runGenerateWorkflow({
				dependencies,
				reporter,
				dryRun: this.dryRun,
				verbose: this.verbose,
				cwd,
				allowDirty: this.allowDirty === true,
			});

			if (result.output) {
				this.context.stdout.write(result.output);
			}

			this.summary = result.summary;

			return result.exitCode;
		}
	};
}

/**
 * Builds the `generate` command for the CLI.
 *
 * This command is responsible for generating WPKernel artifacts (PHP, TypeScript)
 * from the `wpk.config.*` configuration files. It processes the configuration,
 * builds an Intermediate Representation (IR), and uses various builders to
 * produce the final generated code.
 *
 * @category Commands
 * @param    options - Options for building the generate command, including dependencies.
 * @returns The `CommandConstructor` class for the generate command.
 */
export function buildGenerateCommand(
	options: BuildGenerateCommandOptions = {}
): CommandConstructor {
	const dependencies = buildGenerateDependencies(options);
	return buildCommandConstructor(dependencies);
}

export type { BuildGenerateCommandOptions };

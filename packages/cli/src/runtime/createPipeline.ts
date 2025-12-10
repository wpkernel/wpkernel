import {
	createPipeline as createCorePipeline,
	type CreatePipelineOptions,
} from '@wpkernel/pipeline';
import { WPKernelError } from '@wpkernel/core/error';
import type { FragmentIrOptions } from '../ir/publicTypes';
import {
	buildIrDraft,
	buildIrFragmentOutput,
	finalizeIrDraft,
	type MutableIr,
} from '../ir/types';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	FragmentHelper,
	FragmentInput,
	FragmentOutput,
	Pipeline,
	PipelineContext,
	PipelineDiagnostic,
	PipelineExtensionHookOptions,
	PipelineRunOptions,
	PipelineRunResult,
} from './types';

function buildBuilderOutput(): BuilderOutput {
	const actions: BuilderOutput['actions'] = [];
	return {
		actions,
		queueWrite(action) {
			actions.push(action);
		},
	};
}

function mapRunOptionsToBuildOptions(
	options: PipelineRunOptions
): FragmentIrOptions {
	return {
		config: options.config,
		namespace: options.namespace,
		origin: options.origin,
		sourcePath: options.sourcePath,
	} satisfies FragmentIrOptions;
}

/**
 * Creates a new CLI pipeline instance.
 *
 * This function initializes a robust code generation pipeline that processes project
 * configurations, builds an Intermediate Representation (IR), and executes various
 * builder and fragment helpers to generate code and artifacts.
 *
 * @category Runtime
 * @returns A `Pipeline` instance configured for CLI operations.
 */
type CliPipelineOptions = CreatePipelineOptions<
	PipelineRunOptions,
	FragmentIrOptions,
	PipelineContext,
	PipelineContext['reporter'],
	MutableIr,
	PipelineRunResult['ir'],
	PipelineDiagnostic,
	PipelineRunResult,
	FragmentInput,
	FragmentOutput,
	BuilderInput,
	BuilderOutput,
	FragmentHelper['kind'],
	BuilderHelper['kind'],
	FragmentHelper,
	BuilderHelper
>;

export function createPipeline(
	overrides: Partial<CliPipelineOptions> = {}
): Pipeline {
	const defaultBuilderProvidedKeys: readonly string[] = [
		'ir.resources.core',
		'ir.capability-map.core',
		'ir.blocks.core',
		'ir.layout.core',
		'ir.meta.core',
		'ir.schemas.core',
		'ir.ordering.core',
		'ir.bundler.core',
		'ir.artifacts.plan',
		'ir.ui.core',
	];

	return createCorePipeline<
		PipelineRunOptions,
		FragmentIrOptions,
		PipelineContext,
		PipelineContext['reporter'],
		MutableIr,
		PipelineRunResult['ir'],
		PipelineDiagnostic,
		PipelineRunResult,
		FragmentInput,
		FragmentOutput,
		BuilderInput,
		BuilderOutput,
		FragmentHelper['kind'],
		BuilderHelper['kind'],
		FragmentHelper,
		BuilderHelper
	>({
		...overrides,
		builderProvidedKeys:
			overrides.builderProvidedKeys ?? defaultBuilderProvidedKeys,
		createError(code, message) {
			// Map pipeline error codes to WPKernel ErrorCode
			const errorCode = code as
				| 'ValidationError'
				| 'DeveloperError'
				| 'UnknownError';
			return new WPKernelError(errorCode, { message });
		},
		createBuildOptions: mapRunOptionsToBuildOptions,
		createContext(runOptions) {
			return {
				workspace: runOptions.workspace,
				reporter: runOptions.reporter,
				phase: runOptions.phase,
				generationState: runOptions.generationState,
			} satisfies PipelineContext;
		},
		createFragmentState({ buildOptions }) {
			return buildIrDraft(buildOptions);
		},
		createFragmentArgs({ context, buildOptions, draft }) {
			return {
				context,
				input: {
					options: buildOptions,
					draft,
				},
				output: buildIrFragmentOutput(draft),
				reporter: context.reporter,
			} satisfies Parameters<FragmentHelper['apply']>[0];
		},
		finalizeFragmentState({ draft, helpers }) {
			return finalizeIrDraft(draft, helpers);
		},
		createBuilderArgs({ context, buildOptions, artifact }) {
			return {
				context,
				input: {
					phase: context.phase,
					options: buildOptions,
					ir: artifact,
				},
				output: buildBuilderOutput(),
				reporter: context.reporter,
			} satisfies Parameters<BuilderHelper['apply']>[0];
		},
		createRunResult({ artifact, diagnostics, steps }) {
			return {
				ir: artifact,
				diagnostics,
				steps,
			} satisfies PipelineRunResult;
		},
		createExtensionHookOptions({ context, options, artifact, lifecycle }) {
			return {
				context,
				options,
				artifact,
				lifecycle,
			} satisfies PipelineExtensionHookOptions;
		},
		onExtensionRollbackError({ error, extensionKeys, context }) {
			context.reporter.warn('Pipeline extension rollback failed.', {
				error: (error as Error).message,
				extensions: extensionKeys,
			});
		},
		createConflictDiagnostic({ helper, existing, message }) {
			return {
				type: 'conflict',
				key: helper.key,
				mode: 'override',
				helpers: [
					existing.origin ?? existing.key,
					helper.origin ?? helper.key,
				],
				message,
				kind: helper.kind,
			} satisfies PipelineDiagnostic;
		},
	}) as Pipeline;
}

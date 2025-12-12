import { isPromiseLike, maybeThen } from '../core/async-utils';
import { type RegisteredHelper } from '../core/dependency-graph';
import type { ExtensionHookEntry } from '../core/extensions';
import {
	registerHelper,
	handleExtensionRegisterResult as handleExtensionRegisterResultUtil,
} from '../core/registration';
import type { ErrorFactory } from '../core/error-factory';
import type {
	CreatePipelineOptions,
	Helper,
	HelperDescriptor,
	HelperKind,
	MaybePromise,
	Pipeline,
	PipelineDiagnostic,
	PipelineReporter,
	PipelineExtension,
	PipelineRunState,
} from '../core/types';
import { initDiagnosticManager } from '../core/internal/diagnostic-manager';
import { initPipelineRunner } from '../core/internal/runner';
import type {
	DefaultStageDeps,
	PipelineRunnerDependencies,
	PipelineStage,
	PipelineState,
	Halt,
} from '../core/internal/pipeline-runner.types';
export type {
	DefaultStageDeps,
	PipelineStage,
} from '../core/internal/pipeline-runner.types';
export { defaultStages } from '../core/internal/runner/program';

export type MakePipelineArgs<
	TRunOptions,
	TReporter extends PipelineReporter = PipelineReporter,
	TContext extends { reporter: TReporter } = { reporter: TReporter },
	TArtifact = unknown,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
	TRunResult = PipelineRunState<TArtifact, TDiagnostic>,
	TBuildOptions = unknown,
	TDraft = unknown,
	TFragmentInput = unknown,
	TFragmentOutput = unknown,
	TBuilderInput = unknown,
	TBuilderOutput = unknown,
	TFragmentKind extends HelperKind = 'fragment',
	TBuilderKind extends HelperKind = 'builder',
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	> = Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	>,
	TBuilderHelper extends Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	> = Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
> = CreatePipelineOptions<
	TRunOptions,
	TBuildOptions,
	TContext,
	TReporter,
	TDraft,
	TArtifact,
	TDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind,
	TBuilderKind,
	TFragmentHelper,
	TBuilderHelper
> & {
	// Optional extensions configuration
	extensions?: {
		lifecycles?: string[];
	};
	stages?: (
		deps: DefaultStageDeps<
			PipelineState<
				TRunOptions,
				TBuildOptions,
				TContext,
				TReporter,
				TDraft,
				TArtifact,
				TDiagnostic,
				TFragmentInput,
				TFragmentOutput,
				TBuilderInput,
				TBuilderOutput,
				TFragmentKind,
				TBuilderKind,
				TFragmentHelper,
				TBuilderHelper
			>,
			TRunResult,
			TContext,
			TRunOptions,
			TArtifact,
			TReporter
		>
	) => PipelineStage<
		PipelineState<
			TRunOptions,
			TBuildOptions,
			TContext,
			TReporter,
			TDraft,
			TArtifact,
			TDiagnostic,
			TFragmentInput,
			TFragmentOutput,
			TBuilderInput,
			TBuilderOutput,
			TFragmentKind,
			TBuilderKind,
			TFragmentHelper,
			TBuilderHelper
		>,
		Halt<TRunResult>
	>[];
};

export function makePipeline<
	TRunOptions,
	TReporter extends PipelineReporter = PipelineReporter,
	TContext extends { reporter: TReporter } = { reporter: TReporter },
	TArtifact = unknown,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
	TRunResult = PipelineRunState<TArtifact, TDiagnostic>,
	TBuildOptions = unknown,
	TDraft = unknown,
	TFragmentInput = unknown,
	TFragmentOutput = unknown,
	TBuilderInput = unknown,
	TBuilderOutput = unknown,
	TFragmentKind extends HelperKind = 'fragment',
	TBuilderKind extends HelperKind = 'builder',
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	> = Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	>,
	TBuilderHelper extends Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	> = Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
>(
	options: MakePipelineArgs<
		TRunOptions,
		TReporter,
		TContext,
		TArtifact,
		TDiagnostic,
		TRunResult,
		TBuildOptions,
		TDraft,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	>
): Pipeline<
	TRunOptions,
	TRunResult,
	TContext,
	TReporter,
	TBuildOptions,
	TArtifact,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TDiagnostic,
	TFragmentKind,
	TBuilderKind,
	TFragmentHelper,
	TBuilderHelper
> {
	const fragmentKind = options.fragmentKind ?? ('fragment' as TFragmentKind);
	const builderKind = options.builderKind ?? ('builder' as TBuilderKind);

	const createError: ErrorFactory =
		options.createError ??
		((code, message) => new Error(`[${code}] ${message}`));

	const helperRegistries = new Map<string, RegisteredHelper<unknown>[]>();
	const ensureRegistry = (kind: string) => {
		if (!helperRegistries.has(kind)) {
			helperRegistries.set(kind, []);
		}
		return helperRegistries.get(kind)!;
	};

	// Backed by the registry map for consistency
	const fragmentEntries = ensureRegistry(
		fragmentKind
	) as RegisteredHelper<TFragmentHelper>[];
	const builderEntries = ensureRegistry(
		builderKind
	) as RegisteredHelper<TBuilderHelper>[];

	const extensionHooks: ExtensionHookEntry<
		TContext,
		TRunOptions,
		TArtifact
	>[] = [];
	const pendingExtensionRegistrations: Promise<void>[] = [];

	const diagnosticManager = initDiagnosticManager({
		options,
		fragmentKind,
		builderKind,
	});

	const resolveRunResult =
		options.createRunResult ??
		((state) =>
			({
				artifact: state.artifact,
				diagnostics: diagnosticManager.readDiagnostics(),
				steps: state.steps,
			}) as TRunResult);

	const runnerDependencies: PipelineRunnerDependencies<
		TRunOptions,
		TBuildOptions,
		TContext,
		TReporter,
		TDraft,
		TArtifact,
		TDiagnostic,
		TRunResult,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	> = {
		options,
		fragmentEntries,
		builderEntries,
		helperRegistries,
		fragmentKind,
		builderKind,
		diagnosticManager,
		createError,
		resolveRunResult,
		extensionHooks,
		extensionLifecycles: options.extensions?.lifecycles,
		stages: options.stages,
	};

	const runner = initPipelineRunner(runnerDependencies);

	const fragmentKindValue = fragmentKind as HelperKind;
	const builderKindValue = builderKind as HelperKind;

	const registerFragmentHelper = (helper: TFragmentHelper) =>
		registerHelper<
			TContext,
			TFragmentInput,
			TFragmentOutput,
			TReporter,
			TFragmentKind,
			TFragmentHelper
		>(
			helper,
			fragmentKind,
			fragmentEntries,
			fragmentKindValue,
			(h, existing, message) =>
				diagnosticManager.flagConflict(
					h as unknown as HelperDescriptor,
					existing as unknown as HelperDescriptor,
					fragmentKindValue,
					message
				),
			createError
		);

	const registerBuilderHelper = (helper: TBuilderHelper) =>
		registerHelper<
			TContext,
			TBuilderInput,
			TBuilderOutput,
			TReporter,
			TBuilderKind,
			TBuilderHelper
		>(
			helper,
			builderKind,
			builderEntries,
			builderKindValue,
			(h, existing, message) =>
				diagnosticManager.flagConflict(
					h as unknown as HelperDescriptor,
					existing as unknown as HelperDescriptor,
					builderKindValue,
					message
				),
			createError
		);

	const handleExtensionResult = (
		extensionKey: string | undefined,
		result: unknown
	) =>
		handleExtensionRegisterResultUtil(extensionKey, result, extensionHooks);

	const trackPendingExtensionRegistration = <T>(
		maybePending: MaybePromise<T>
	): MaybePromise<T> => {
		if (maybePending && isPromiseLike(maybePending)) {
			void Promise.resolve(maybePending).catch(() => {});
			const pending = Promise.resolve(maybePending).then(() => undefined);
			void pending.catch(() => {});
			pendingExtensionRegistrations.push(pending);
			pending
				.finally(() => {
					const index =
						pendingExtensionRegistrations.indexOf(pending);
					if (index !== -1) {
						pendingExtensionRegistrations.splice(index, 1);
					}
				})
				.catch(() => {});
		}

		return maybePending;
	};

	const waitForPendingExtensionRegistrations = (): MaybePromise<void> => {
		if (pendingExtensionRegistrations.length === 0) {
			return;
		}

		return Promise.all([...pendingExtensionRegistrations]).then(
			() => undefined
		);
	};

	type PipelineInstance = Pipeline<
		TRunOptions,
		TRunResult,
		TContext,
		TReporter,
		TBuildOptions,
		TArtifact,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TDiagnostic,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	>;

	const pipeline: PipelineInstance = {
		fragmentKind,
		builderKind,
		ir: {
			use(helper: TFragmentHelper) {
				registerFragmentHelper(helper);
			},
		},
		builders: {
			use(helper: TBuilderHelper) {
				registerBuilderHelper(helper);
			},
		},
		extensions: {
			/**
			 * Registers an extension.
			 *
			 * @param   extension
			 * @warning **Lifecycle Safety**: Extensions should be registered during pipeline setup,
			 * before `run()` is called. Registering extensions dynamically during a run (e.g.,
			 * from inside a helper) is **not supported** and may lead to race conditions where
			 * lifecycle hooks are missed.
			 */
			use(
				extension: PipelineExtension<
					PipelineInstance,
					TContext,
					TRunOptions,
					TArtifact
				>
			) {
				const registrationResult = extension.register(pipeline);
				if (registrationResult && isPromiseLike(registrationResult)) {
					void Promise.resolve(registrationResult).catch(() => {});
				}
				const handled = maybeThen(registrationResult, (resolved) =>
					handleExtensionResult(extension.key, resolved)
				);

				return trackPendingExtensionRegistration(handled);
			},
		},
		use(
			helper:
				| TFragmentHelper
				| TBuilderHelper
				| Helper<TContext, unknown, unknown, TReporter, HelperKind>
		) {
			if (helper.kind === fragmentKind) {
				registerFragmentHelper(helper as TFragmentHelper);
				return;
			}

			if (helper.kind === builderKind) {
				registerBuilderHelper(helper as TBuilderHelper);
				return;
			}

			// Generic registration for arbitrary kinds
			const kind = helper.kind;
			const entries = ensureRegistry(kind);

			registerHelper<
				TContext,
				unknown,
				unknown,
				TReporter,
				HelperKind,
				Helper<TContext, unknown, unknown, TReporter, HelperKind>
			>(
				helper as Helper<
					TContext,
					unknown,
					unknown,
					TReporter,
					HelperKind
				>,
				kind,
				entries as RegisteredHelper<
					Helper<TContext, unknown, unknown, TReporter, HelperKind>
				>[],
				kind,
				(h, existing, message) =>
					diagnosticManager.flagConflict(
						h as unknown as HelperDescriptor,
						existing as unknown as HelperDescriptor,
						kind,
						message
					),
				createError
			);
		},
		run(runOptions: TRunOptions) {
			const startRun = () => {
				const runContext = runner.prepareContext(runOptions);
				return runner.executeRun(runContext);
			};

			const runResult = maybeThen(
				waitForPendingExtensionRegistrations(),
				() => startRun()
			);

			if (isPromiseLike(runResult)) {
				return runResult.then(
					(result) => {
						diagnosticManager.endRun();
						return result;
					},
					(error) => {
						diagnosticManager.endRun();
						throw error;
					}
				);
			}

			diagnosticManager.endRun();
			return runResult;
		},
	};

	return pipeline;
}

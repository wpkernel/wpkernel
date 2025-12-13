import { isPromiseLike, maybeThen, maybeAll } from './async-utils';
import { type RegisteredHelper } from './dependency-graph';
import type { ExtensionHookEntry } from './extensions';
import {
	registerHelper,
	handleExtensionRegisterResult as handleExtensionRegisterResultUtil,
} from './registration';
import type { ErrorFactory } from './error-factory';
import type {
	Helper,
	HelperKind,
	HelperDescriptor,
	MaybePromise,
	PipelineDiagnostic,
	PipelineReporter,
	PipelineRunState,
	PipelineExtensionRollbackErrorMetadata,
	AgnosticPipeline,
	AgnosticPipelineOptions,
} from './types';
import { initAgnosticRunner } from './runner';
import { createAgnosticDiagnosticManager } from './runner/diagnostics';
import type {
	AgnosticRunnerDependencies,
	PipelineStage,
	Halt,
	AgnosticStageDeps,
	AgnosticState,
} from './runner/types';

export function makePipeline<
	TRunOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter = PipelineReporter,
	TUserState = unknown,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
	TRunResult = PipelineRunState<TUserState, TDiagnostic>,
>(
	options: AgnosticPipelineOptions<
		TRunOptions,
		TContext,
		TReporter,
		TUserState,
		TDiagnostic,
		TRunResult
	>
): AgnosticPipeline<TRunOptions, TRunResult, TContext, TReporter> {
	const createError: ErrorFactory =
		options.createError ??
		((code, message) => new Error(`[${code}] ${message} `));

	const helperRegistries = new Map<string, RegisteredHelper<unknown>[]>();
	const ensureRegistry = (kind: string) => {
		if (!helperRegistries.has(kind)) {
			helperRegistries.set(kind, []);
		}
		return helperRegistries.get(kind)!;
	};

	// Initialize registries for all declared kinds
	for (const kind of options.helperKinds) {
		ensureRegistry(kind);
	}

	const extensionHooks: ExtensionHookEntry<
		TContext,
		TRunOptions,
		TUserState
	>[] = [];
	const pendingExtensionRegistrations: Promise<void>[] = [];

	// Initialize Diagnostic Manager
	const diagnosticManager = createAgnosticDiagnosticManager<
		TReporter,
		TDiagnostic
	>({
		onDiagnostic: (args) => {
			if (options.onDiagnostic) {
				options.onDiagnostic(args);
			} else {
				args.reporter.warn?.(
					'Pipeline diagnostic reported.',
					args.diagnostic
				);
			}
		},
		createConflictDiagnostic: options.createConflictDiagnostic,
		createMissingDependencyDiagnostic:
			options.createMissingDependencyDiagnostic,
		createUnusedHelperDiagnostic: options.createUnusedHelperDiagnostic,
	});

	// Default Stage Factory
	const defaultStages = (
		deps: AgnosticStageDeps<
			AgnosticState<
				TRunOptions,
				TUserState,
				TContext,
				TReporter,
				TDiagnostic
			>,
			TRunResult,
			TContext,
			TRunOptions,
			TReporter,
			TDiagnostic,
			TUserState
		>
	): PipelineStage<
		AgnosticState<
			TRunOptions,
			TUserState,
			TContext,
			TReporter,
			TDiagnostic
		>,
		Halt<TRunResult>
	>[] => {
		const stages: PipelineStage<
			AgnosticState<
				TRunOptions,
				TUserState,
				TContext,
				TReporter,
				TDiagnostic
			>,
			Halt<TRunResult>
		>[] = [];

		// 1. Helper Stages
		for (const kind of options.helperKinds) {
			stages.push(deps.makeHelperStage(kind));
		}

		// 2. Finalize
		stages.push(deps.finalizeResult);

		return stages;
	};

	const runnerDependencies: AgnosticRunnerDependencies<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic,
		TRunResult
	> = {
		options: {
			createContext: options.createContext,
			createState: (args: {
				readonly context: TContext;
				readonly options: TRunOptions;
			}) => {
				if (options.createState) {
					return options.createState(args) as Record<
						string,
						unknown
					> as unknown as TUserState;
				}
				return {} as unknown as TUserState;
			},
			createError,
			onExtensionRollbackError: (opts: {
				readonly error: unknown;
				readonly extensionKeys: readonly string[];
				readonly hookSequence: readonly string[];
				readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
				readonly context: TContext;
			}) => {
				if (options.onExtensionRollbackError) {
					options.onExtensionRollbackError(opts);
				}
				// Adapt to legacy logging format expected by core tests
				const logContext = {
					...opts,
					extensions: opts.extensionKeys,
					hookKeys: opts.hookSequence,
					errorName: opts.errorMetadata?.name,
					errorMessage: opts.errorMetadata?.message,
					errorStack: opts.errorMetadata?.stack,
					errorCause: opts.errorMetadata?.cause,
					...opts.errorMetadata,
				};
				opts.context.reporter.warn?.(
					'Pipeline extension rollback failed.',
					logContext
				);
			},
			onHelperRollbackError: (opts: {
				readonly error: unknown;
				readonly helper: unknown;
				readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
				readonly context: TContext;
			}) => {
				opts.context.reporter.warn?.('Helper rollback failed', opts);
			},
			providedKeys: options.providedKeys,
		},
		helperRegistries,
		diagnosticManager,

		resolveRunResult: (runState) => {
			const {
				userState: artifact,
				diagnostics,
				steps,
				context,
				options: runOptions,
				state,
			} = runState;

			if (options.createRunResult) {
				return options.createRunResult({
					artifact,
					diagnostics,
					steps,
					context,
					options: runOptions,
					state: state as unknown as Record<string, unknown>,
				});
			}

			// Default default TRunResult = PipelineRunState<TUserState, TDiagnostic>
			return {
				artifact,
				diagnostics,
				steps,
			} as unknown as TRunResult;
		},
		extensionHooks,
		extensionLifecycles: options.extensions?.lifecycles,
		stages: (options.createStages ?? defaultStages) as unknown as (
			deps: AgnosticStageDeps<
				AgnosticState<
					TRunOptions,
					TUserState,
					TContext,
					TReporter,
					TDiagnostic
				>,
				TRunResult,
				TContext,
				TRunOptions,
				TReporter,
				TDiagnostic,
				TUserState
			>
		) => PipelineStage<
			AgnosticState<
				TRunOptions,
				TUserState,
				TContext,
				TReporter,
				TDiagnostic
			>,
			Halt<TRunResult>
		>[],
	};

	const runner = initAgnosticRunner(runnerDependencies);

	const handleExtensionResult = (
		extensionKey: string | undefined,
		result: unknown
	) =>
		handleExtensionRegisterResultUtil(extensionKey, result, extensionHooks);

	const trackPendingExtensionRegistration = <T>(
		maybePending: MaybePromise<T>
	): MaybePromise<T> => {
		if (isPromiseLike(maybePending)) {
			// Map success to undefined, but allow errors to propagate so maybeAll catches them later
			const pending = maybeThen(
				maybePending,
				() => undefined
			) as Promise<void>;

			// Suppress unhandled rejections during the "gap" before we await them
			void pending.catch(() => {});

			pendingExtensionRegistrations.push(pending);

			// Cleanup when done (success or failure)
			const cleanup = () => {
				const index = pendingExtensionRegistrations.indexOf(pending);
				if (index !== -1) {
					pendingExtensionRegistrations.splice(index, 1);
				}
			};

			// Use finally-like behavior via then/catch
			void pending.then(cleanup, cleanup);
		}

		return maybePending;
	};

	const waitForPendingExtensionRegistrations = (): MaybePromise<void> => {
		if (pendingExtensionRegistrations.length === 0) {
			return;
		}

		return maybeThen(
			maybeAll([...pendingExtensionRegistrations]),
			() => undefined
		);
	};

	const pipeline: AgnosticPipeline<
		TRunOptions,
		TRunResult,
		TContext,
		TReporter
	> = {
		extensions: {
			use(extension) {
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
		use(helper) {
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
				entries as unknown as RegisteredHelper<
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
			try {
				const startRun = () => {
					const runContext = runner.prepareContext(runOptions);
					return runner.executeRun(runContext);
				};

				const pendingCheck = waitForPendingExtensionRegistrations();

				const runResult = maybeThen(pendingCheck, () => startRun());

				if (isPromiseLike(runResult)) {
					return Promise.resolve(runResult).finally(() => {
						diagnosticManager.endRun();
					});
				}

				diagnosticManager.endRun();
				return runResult;
			} catch (error) {
				diagnosticManager.endRun();
				throw error;
			}
		},
	};

	return pipeline;
}

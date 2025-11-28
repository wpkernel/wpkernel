import { maybeThen, maybeTry, isPromiseLike } from '../async-utils.js';
import {
	createDependencyGraph,
	type CreateDependencyGraphOptions,
	type RegisteredHelper,
} from '../dependency-graph.js';
import { executeHelpers } from '../executor.js';
import type {
	HelperDescriptor,
	HelperApplyOptions,
	Helper,
	HelperKind,
	PipelineReporter,
	PipelineDiagnostic,
	PipelineExtensionLifecycle,
	PipelineExtensionHookOptions,
	PipelineExtensionRollbackErrorMetadata,
	PipelineStep,
	MaybePromise,
} from '../types';
import {
	assertAllHelpersExecuted,
	buildExecutionSnapshot,
} from './helper-execution.js';
import { initExtensionCoordinator } from './extension-coordinator';
import { runRollbackStack, type PipelineRollback } from '../rollback.js';
import type {
	PipelineRunContext,
	PipelineRunner,
	PipelineRunnerDependencies,
} from './pipeline-runner.types';

/**
 * Creates the orchestrator responsible for executing pipeline runs.
 *
 * The runner wires together dependency graph resolution, helper execution, and the official
 * extension framework via the {@link initExtensionCoordinator}. By extracting this logic, the
 * public {@link createPipeline} entry point remains focused on registration while the runner keeps
 * lifecycle sequencing isolated and testable.
 *
 * @param    dependencies
 * @category Pipeline
 * @internal
 */
export function initPipelineRunner<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDraft,
	TArtifact,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind extends HelperKind,
	TBuilderKind extends HelperKind,
	TFragmentHelper extends Helper<
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
	>,
>(
	dependencies: PipelineRunnerDependencies<
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
	>
): PipelineRunner<
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
> {
	const prepareContext = (
		runOptions: TRunOptions
	): PipelineRunContext<
		TRunOptions,
		TBuildOptions,
		TContext,
		TDraft,
		TArtifact,
		TFragmentHelper,
		TBuilderHelper
	> => {
		const buildOptions =
			dependencies.options.createBuildOptions(runOptions);
		const context = dependencies.options.createContext(runOptions);
		dependencies.diagnosticManager.setReporter(context.reporter);
		const draft = dependencies.options.createFragmentState({
			options: runOptions,
			context,
			buildOptions,
		});

		const fragmentOrder = createDependencyGraph(
			dependencies.fragmentEntries,
			{
				providedKeys: dependencies.options.fragmentProvidedKeys,
				onMissingDependency: ({ dependant, dependencyKey }) => {
					const helper = dependant.helper as HelperDescriptor;
					dependencies.diagnosticManager.flagMissingDependency(
						helper,
						dependencyKey,
						dependencies.fragmentKind
					);
					dependencies.diagnosticManager.flagUnusedHelper(
						helper,
						dependencies.fragmentKind,
						`could not execute because dependency "${dependencyKey}" was not found`,
						helper.dependsOn
					);
				},
				onUnresolvedHelpers: ({ unresolved }) => {
					for (const entry of unresolved) {
						const helper = entry.helper as HelperDescriptor;
						dependencies.diagnosticManager.flagUnusedHelper(
							helper,
							dependencies.fragmentKind,
							'could not execute because its dependencies never resolved',
							helper.dependsOn
						);
					}
				},
			},
			dependencies.createError
		).order;

		const steps: PipelineStep[] = [];
		const pushStep = (entry: RegisteredHelper<unknown>) => {
			const descriptor = entry.helper as HelperDescriptor;
			steps.push({
				id: entry.id,
				index: steps.length,
				key: descriptor.key,
				kind: descriptor.kind,
				mode: descriptor.mode,
				priority: descriptor.priority,
				dependsOn: descriptor.dependsOn,
				origin: descriptor.origin,
			});
		};

		const builderGraphOptions: CreateDependencyGraphOptions<TBuilderHelper> =
			{
				providedKeys: dependencies.options.builderProvidedKeys,
				onMissingDependency: ({ dependant, dependencyKey }) => {
					const helper = dependant.helper as HelperDescriptor;
					dependencies.diagnosticManager.flagMissingDependency(
						helper,
						dependencyKey,
						dependencies.builderKind
					);
					dependencies.diagnosticManager.flagUnusedHelper(
						helper,
						dependencies.builderKind,
						`could not execute because dependency "${dependencyKey}" was not found`,
						helper.dependsOn
					);
				},
				onUnresolvedHelpers: ({ unresolved }) => {
					for (const entry of unresolved) {
						const helper = entry.helper as HelperDescriptor;
						dependencies.diagnosticManager.flagUnusedHelper(
							helper,
							dependencies.builderKind,
							'could not execute because its dependencies never resolved',
							helper.dependsOn
						);
					}
				},
			};

		const hookOptionsFactory =
			dependencies.options.createExtensionHookOptions ??
			((hookOptions: {
				context: TContext;
				options: TRunOptions;
				buildOptions: TBuildOptions;
				artifact: TArtifact;
				lifecycle: PipelineExtensionLifecycle;
			}): PipelineExtensionHookOptions<
				TContext,
				TRunOptions,
				TArtifact
			> => ({
				context: hookOptions.context,
				options: hookOptions.options,
				artifact: hookOptions.artifact,
				lifecycle: hookOptions.lifecycle,
			}));

		const buildHookOptions = (
			artifact: TArtifact,
			lifecycle: PipelineExtensionLifecycle
		) =>
			hookOptionsFactory({
				context,
				options: runOptions,
				buildOptions,
				artifact,
				lifecycle,
			});

		const handleRollbackError =
			dependencies.options.onExtensionRollbackError ??
			((rollbackOptions: {
				readonly error: unknown;
				readonly extensionKeys: readonly string[];
				readonly hookSequence: readonly string[];
				readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
				readonly context: TContext;
			}) => {
				const { reporter } = rollbackOptions.context;
				const warn = reporter.warn;

				if (typeof warn === 'function') {
					warn.call(reporter, 'Pipeline extension rollback failed.', {
						error: rollbackOptions.error,
						errorName: rollbackOptions.errorMetadata.name,
						errorMessage: rollbackOptions.errorMetadata.message,
						errorStack: rollbackOptions.errorMetadata.stack,
						errorCause: rollbackOptions.errorMetadata.cause,
						extensions: rollbackOptions.extensionKeys,
						hookKeys: rollbackOptions.hookSequence,
					});
				}
			});

		return {
			runOptions,
			buildOptions,
			context,
			draft,
			fragmentOrder,
			steps,
			pushStep,
			builderGraphOptions,
			buildHookOptions,
			handleRollbackError,
		} satisfies PipelineRunContext<
			TRunOptions,
			TBuildOptions,
			TContext,
			TDraft,
			TArtifact,
			TFragmentHelper,
			TBuilderHelper
		>;
	};

	const executeRun = (
		runContext: PipelineRunContext<
			TRunOptions,
			TBuildOptions,
			TContext,
			TDraft,
			TArtifact,
			TFragmentHelper,
			TBuilderHelper
		>
	): MaybePromise<TRunResult> => {
		const {
			runOptions,
			buildOptions,
			context,
			draft,
			fragmentOrder,
			steps,
			pushStep,
			builderGraphOptions,
			buildHookOptions,
			handleRollbackError,
		} = runContext;

		let builderExecutionSnapshot = buildExecutionSnapshot(
			dependencies.builderEntries,
			new Set<string>(),
			dependencies.builderKind
		);

		const fragmentVisited = executeHelpers<
			TContext,
			TFragmentInput,
			TFragmentOutput,
			TReporter,
			TFragmentKind,
			TFragmentHelper,
			HelperApplyOptions<
				TContext,
				TFragmentInput,
				TFragmentOutput,
				TReporter
			>
		>(
			fragmentOrder,
			(entry) =>
				dependencies.options.createFragmentArgs({
					helper: entry.helper,
					options: runOptions,
					context,
					buildOptions,
					draft,
				}),
			(helper, args, next) => {
				const result = helper.apply(args, next);
				if (isPromiseLike(result)) {
					// ignore HelperApplyResult, just wait for completion
					return result.then(() => undefined);
				}
				return undefined;
			},
			(entry) => pushStep(entry)
		);

		return maybeThen(fragmentVisited, (fragmentVisitedSet) => {
			dependencies.diagnosticManager.reviewUnusedHelpers(
				dependencies.fragmentEntries,
				fragmentVisitedSet,
				dependencies.fragmentKind
			);

			const fragmentExecution = buildExecutionSnapshot(
				dependencies.fragmentEntries,
				fragmentVisitedSet,
				dependencies.fragmentKind
			);

			assertAllHelpersExecuted(
				dependencies.fragmentEntries,
				fragmentExecution,
				dependencies.fragmentKind,
				dependencies.diagnosticManager.describeHelper,
				dependencies.createError
			);

			let artifact = dependencies.options.finalizeFragmentState({
				draft,
				options: runOptions,
				context,
				buildOptions,
				helpers: { fragments: fragmentExecution },
			});

			const builderOrder = createDependencyGraph(
				dependencies.builderEntries,
				builderGraphOptions,
				dependencies.createError
			).order;

			const extensionCoordinator = initExtensionCoordinator<
				TContext,
				TRunOptions,
				TArtifact
			>(({ error, extensionKeys, hookSequence, errorMetadata }) =>
				handleRollbackError({
					error,
					extensionKeys,
					hookSequence,
					errorMetadata,
					context,
				})
			);
			const extensionLifecycle: PipelineExtensionLifecycle =
				'after-fragments';
			const extensionResult = extensionCoordinator.runLifecycle(
				extensionLifecycle,
				{
					hooks: dependencies.extensionHooks,
					hookOptions: buildHookOptions(artifact, extensionLifecycle),
				}
			);

			return maybeThen(extensionResult, (extensionState) => {
				artifact = extensionState.artifact;
				const builderRollbacks: Array<{
					helper: TBuilderHelper;
					rollback: PipelineRollback;
				}> = [];

				const registerBuilderRollback = (
					helper: TBuilderHelper,
					result: unknown
				): void => {
					if (
						!result ||
						typeof result !== 'object' ||
						!('rollback' in result)
					) {
						return;
					}
					const descriptor = (
						result as { rollback?: PipelineRollback }
					).rollback;
					if (!descriptor) {
						return;
					}
					builderRollbacks.push({ helper, rollback: descriptor });
				};

				// Create a wrapped rollback handler that also executes helper rollbacks
				const createHelperAwareRollbackHandler = <T>(): ((
					error: unknown
				) => MaybePromise<T>) => {
					const extensionHandler =
						extensionCoordinator.createRollbackHandler<T>(
							extensionState
						);

					return (error: unknown): MaybePromise<T> => {
						// First run helper rollbacks, then extension rollbacks
						return maybeThen(
							runRollbackStack(
								builderRollbacks.map((entry) => ({
									...entry.rollback,
									key: entry.helper.key,
								})),
								{
									source: 'helper',
									onError: ({
										error: rbError,
										metadata,
										entry: rollbackEntry,
									}) => {
										const helperEntry =
											builderRollbacks.find(
												(h) =>
													h.helper.key ===
													(rollbackEntry.key ?? '')
											);
										if (helperEntry) {
											dependencies.options.onHelperRollbackError?.(
												{
													error: rbError,
													helper: helperEntry.helper,
													errorMetadata: metadata,
													context,
												}
											);
										}
									},
								}
							),
							() => extensionHandler(error)
						);
					};
				};

				const handleRunFailure =
					createHelperAwareRollbackHandler<TRunResult>();
				const handleCommitFailure =
					createHelperAwareRollbackHandler<void>();

				const handleBuilderVisited = (
					builderVisited: Set<string>
				): MaybePromise<TRunResult> => {
					dependencies.diagnosticManager.reviewUnusedHelpers(
						dependencies.builderEntries,
						builderVisited,
						dependencies.builderKind
					);

					const builderExecution = buildExecutionSnapshot(
						dependencies.builderEntries,
						builderVisited,
						dependencies.builderKind
					);

					assertAllHelpersExecuted(
						dependencies.builderEntries,
						builderExecution,
						dependencies.builderKind,
						dependencies.diagnosticManager.describeHelper,
						dependencies.createError
					);

					builderExecutionSnapshot = builderExecution;

					const finalizeRun = () =>
						dependencies.resolveRunResult({
							artifact,
							diagnostics: [
								...dependencies.diagnosticManager.readDiagnostics(),
							],
							steps,
							context,
							buildOptions,
							options: runOptions,
							helpers: {
								fragments: fragmentExecution,
								builders: builderExecutionSnapshot,
							},
						});

					const commitAndFinalize = (): MaybePromise<TRunResult> =>
						maybeThen(
							maybeTry(
								() =>
									extensionCoordinator.commit(extensionState),
								handleCommitFailure
							),
							finalizeRun
						);

					return commitAndFinalize();
				};

				const runBuilders = (): MaybePromise<TRunResult> => {
					const run = executeHelpers<
						TContext,
						TBuilderInput,
						TBuilderOutput,
						TReporter,
						TBuilderKind,
						TBuilderHelper,
						HelperApplyOptions<
							TContext,
							TBuilderInput,
							TBuilderOutput,
							TReporter
						>
					>(
						builderOrder,
						(entry) =>
							dependencies.options.createBuilderArgs({
								helper: entry.helper,
								options: runOptions,
								context,
								buildOptions,
								artifact,
							}),
						(helper, args, next) => {
							const result = helper.apply(args, next);

							if (isPromiseLike(result)) {
								return result.then((resolved) => {
									registerBuilderRollback(helper, resolved);
									return undefined;
								});
							}

							registerBuilderRollback(helper, result);
							return undefined;
						},
						(entry) => pushStep(entry)
					);

					return maybeThen(run, handleBuilderVisited);
				};

				return maybeTry(runBuilders, handleRunFailure);
			});
		});
	};

	return {
		prepareContext,
		executeRun,
	} satisfies PipelineRunner<
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
	>;
}

import { makePipeline } from '../../core/makePipeline';
import { makeFinalizeFragmentsStage } from '../../core/runner/stage-factories';
import { maybeThen } from '../../core/async-utils';
import type {
	PipelineDiagnostic,
	PipelineReporter,
	PipelineStep,
	PipelineRunState,
	HelperKind,
	Helper,
	HelperExecutionSnapshot,
	AgnosticPipelineOptions,
} from '../../core/types';
import type {
	CreatePipelineOptions,
	Pipeline,
	FragmentFinalizationMetadata,
} from '../types';
import type {
	AgnosticState,
	AgnosticStageDeps,
	Halt,
} from '../../core/runner/types';

import type { RegisteredHelper } from '../../core/dependency-graph';

interface HelperWithKey {
	key: string;
	dependsOn?: string[];
}

interface StateWithExecution {
	helperExecution?: Map<
		string,
		{
			executed: readonly string[];
			registered: unknown[];
			missing: unknown[];
			kind: string;
		}
	>;
}

/**
 * Creates a standard pipeline with "fragment" and "builder" stages.
 *
 * This adapter wraps the agnostic core pipeline, enforcing the opinionated
 * standard pipeline lifecycle:
 * 1. Prepare
 * 2. Before Fragments
 * 3. Fragments (Parallel/Ordered)
 * 4. After Fragments
 * 5. Before Builders
 * 6. Builders (Parallel/Ordered)
 * 7. After Builders
 * 8. Finalize
 * @param options
 */
export function createStandardPipeline<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter = PipelineReporter,
	TDraft = unknown,
	TArtifact = unknown,
	TDiagnostic extends PipelineDiagnostic = PipelineDiagnostic,
	TRunResult = PipelineRunState<TArtifact, TDiagnostic>,
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
	options: CreatePipelineOptions<
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
	// 1. Define Standard State Wrapper
	type StandardState = {
		buildOptions: TBuildOptions;
		draft: TDraft;
		artifact: TArtifact | null;
	};

	const fragmentKind = (options.fragmentKind ?? 'fragment') as TFragmentKind;
	const builderKind = (options.builderKind ?? 'builder') as TBuilderKind;

	// 2. Map Options to Agnostic
	const agnosticOptions: AgnosticPipelineOptions<
		TRunOptions,
		TContext,
		TReporter,
		TArtifact,
		TDiagnostic,
		TRunResult
	> = {
		helperKinds: [fragmentKind, builderKind],
		createContext: options.createContext,
		createError: options.createError,
		onExtensionRollbackError: options.onExtensionRollbackError,

		createInitialState: ({ options: runOpts, context }) => {
			const buildOptions = options.createBuildOptions(runOpts);
			const draft = options.createFragmentState({
				options: runOpts,
				context,
				buildOptions,
			});
			return {
				buildOptions,
				draft,
				artifact: null,
			} as unknown as Record<string, unknown>;
		},
		onDiagnostic: options.onDiagnostic,
		createConflictDiagnostic: options.createConflictDiagnostic
			? (opts) =>
				options.createConflictDiagnostic!(
					opts as unknown as Parameters<
						NonNullable<typeof options.createConflictDiagnostic>
					>[0]
				)
			: undefined,
		createMissingDependencyDiagnostic:
			options.createMissingDependencyDiagnostic
				? (opts) =>
					options.createMissingDependencyDiagnostic!(
						opts as unknown as Parameters<
							NonNullable<
								typeof options.createMissingDependencyDiagnostic
							>
						>[0]
					)
				: undefined,
		createUnusedHelperDiagnostic: options.createUnusedHelperDiagnostic
			? (opts) =>
				options.createUnusedHelperDiagnostic!(
					opts as unknown as Parameters<
						NonNullable<
							typeof options.createUnusedHelperDiagnostic
						>
					>[0]
				)
			: undefined,
		providedKeys: {
			[fragmentKind]: options.fragmentProvidedKeys ?? [],
			[builderKind]: options.builderProvidedKeys ?? [],
		},

		createStages: (deps) => {
			const d = deps as AgnosticStageDeps<
				AgnosticState<
					TRunOptions,
					StandardState,
					TContext,
					TReporter,
					TDiagnostic
				>,
				TRunResult,
				TContext,
				TRunOptions,
				TReporter,
				TDiagnostic,
				StandardState
			>;

			const {
				makeHelperStage,
				makeLifecycleStage,
				finalizeResult,
				diagnosticManager,
			} = d;

			const onVisited =
				(kind: string) =>
					(
						state: AgnosticState<
							TRunOptions,
							StandardState,
							TContext,
							TReporter,
							TDiagnostic
						>,
						visited: Set<string>
					) => {
						const registered = state.helperOrders?.get(kind) ?? [];
						for (const entry of registered) {
							if (!visited.has(entry.id)) {
								diagnosticManager.flagUnusedHelper(
									entry.helper as unknown as
									| TFragmentHelper
									| TBuilderHelper,
									kind,
									'was registered but never executed',
									(entry.helper as HelperWithKey).dependsOn ?? []
								);
							}
						}
						return state;
					};

			const fragmentStage = makeHelperStage(fragmentKind, {
				makeArgs:
					(
						state: AgnosticState<
							TRunOptions,
							StandardState,
							TContext,
							TReporter,
							TDiagnostic
						>
					) =>
						(entry) => {
							return options.createFragmentArgs({
								helper: entry.helper as TFragmentHelper,
								options: state.runOptions,
								context: state.context,
								buildOptions: state.userState.buildOptions,
								draft: state.userState.draft!,
							});
						},
				onVisited: onVisited(fragmentKind),
			});

			const finalizeFragmentStage = makeFinalizeFragmentsStage<
				AgnosticState<
					TRunOptions,
					StandardState,
					TContext,
					TReporter,
					TDiagnostic
				>,
				Halt<TRunResult>,
				FragmentFinalizationMetadata<TFragmentKind>
			>({
				isHalt: d.runnerEnv.isHalt,
				snapshotFragments: (state) => {
					const fragments = ((
						state as unknown as StateWithExecution
					).helperExecution?.get(fragmentKind) ?? {
						kind: fragmentKind,
						executed: [],
						missing: [],
						registered: [],
					}) as unknown as HelperExecutionSnapshot<TFragmentKind>;

					return {
						fragments,
					};
				},
				applyArtifact: (state, metadata) => {
					const result = options.finalizeFragmentState({
						draft: state.userState.draft!,
						options: state.runOptions,
						context: state.context,
						buildOptions: state.userState.buildOptions,
						helpers: metadata,
					});

					// Update state with artifact
					// We must cast to allow mutation or creation of new state
					// Since AgnosticState is read-only in interface but likely mutable in practice
					// or we return a copy
					return {
						...state,
						userState: {
							...state.userState,
							artifact: result,
						},
					};
				},
			});

			return [
				makeLifecycleStage('init'),
				makeLifecycleStage('before-fragments'),
				fragmentStage,
				makeLifecycleStage('after-fragments'),
				finalizeFragmentStage,
				makeLifecycleStage('before-builders'),
				// Standard Builder Stage
				makeHelperStage(builderKind, {
					makeArgs:
						(
							state: AgnosticState<
								TRunOptions,
								StandardState,
								TContext,
								TReporter,
								TDiagnostic
							>
						) =>
							(entry) =>
								options.createBuilderArgs({
									helper: entry.helper as TBuilderHelper,
									options: state.runOptions,
									context: state.context,
									buildOptions: state.userState.buildOptions,
									artifact: state.userState.artifact!,
								}),
					onVisited: onVisited(builderKind),
				}),
				makeLifecycleStage('after-builders'),
				makeLifecycleStage('finalize'),
				finalizeResult,
			];
		},

		createRunResult: ({
			artifact: state,
			context,
			steps,
			diagnostics,
			options: runOpts,
			state: agnosticState,
		}: {
			artifact: unknown;
			state: unknown;
			context: TContext;
			steps: readonly PipelineStep<string>[];
			diagnostics: readonly TDiagnostic[];
			options: TRunOptions;
		}) => {
			const stdState = state as unknown as StandardState;

			if (options.createRunResult) {
				return options.createRunResult({
					artifact: stdState.artifact as TArtifact,
					diagnostics,
					steps: steps.map(
						(s) =>
							(s as unknown as RegisteredHelper<unknown>).helper
					) as unknown as PipelineStep<string>[],
					context,
					buildOptions: stdState.buildOptions,
					options: runOpts,
					helpers: {
						fragments:
							((
								agnosticState as StateWithExecution | undefined
							)?.helperExecution?.get(
								fragmentKind
							) as unknown as HelperExecutionSnapshot<TFragmentKind>) ??
							({
								kind: fragmentKind,
								executed: [],
								missing: [],
								registered: [],
							} as unknown as HelperExecutionSnapshot<TFragmentKind>),
						builders:
							((
								agnosticState as StateWithExecution | undefined
							)?.helperExecution?.get(
								builderKind
							) as unknown as HelperExecutionSnapshot<TBuilderKind>) ??
							({
								kind: builderKind,
								executed: [],
								missing: [],
								registered: [],
							} as unknown as HelperExecutionSnapshot<TBuilderKind>),
					},
				});
			}
			return {
				artifact: stdState.artifact,
				diagnostics,
				steps,
			} as unknown as TRunResult;
		},
	};

	// 3. Create Pipeline
	const pipeline = makePipeline(agnosticOptions);

	// 4. Adapt to Standard Pipeline Interface
	const wrapper: Pipeline<
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
	> = {
		fragmentKind,
		builderKind,
		ir: {
			use: (helper: TFragmentHelper) => {
				if (helper.kind && helper.kind !== fragmentKind) {
					throw options.createError!(
						'ValidationError',
						`Attempted to register helper of kind "${helper.kind}" via ir.use() (expected "${fragmentKind}")`
					);
				}
				pipeline.use({
					...helper,
					kind: fragmentKind,
				} as unknown as Helper<
					TContext,
					unknown,
					unknown,
					TReporter,
					HelperKind
				>);
			},
		},
		builders: {
			use: (helper: TBuilderHelper) => {
				if (helper.kind && helper.kind !== builderKind) {
					throw options.createError!(
						'ValidationError',
						`Attempted to register helper of kind "${helper.kind}" via builders.use() (expected "${builderKind}")`
					);
				}
				pipeline.use({
					...helper,
					kind: builderKind,
				} as unknown as Helper<
					TContext,
					unknown,
					unknown,
					TReporter,
					HelperKind
				>);
			},
		},
		extensions: {
			use: (extension) => {
				// Proxy the extension to pass the standard wrapper to register/setup
				// AND wrap the returned hook to adapt TState <-> TArtifact
				const proxyExtension = {
					...extension,
					register: () => {
						return maybeThen(
							extension.register(wrapper),
							(result) => {
								const adaptHook = (
									hook: (input: unknown) => unknown
								) => {
									return (input: {
										artifact: unknown;
										lifecycle: string;
									}) => {
										// Input.artifact is actually the StandardState (userState)
										const state =
											input.artifact as StandardState;
										const lifecycle =
											input.lifecycle as string;

										// Determine which state property to expose as "artifact" based on lifecycle
										// For standard pipeline:
										// - Before/during fragments: "artifact" exposed to extensions is usually the Draft
										// - After fragments: Draft
										// - Before/during builders: Artifact
										const usesDraft = [
											'prepare',
											'before-fragments',
											'after-fragments',
										].includes(lifecycle);
										const exposedArtifact = usesDraft
											? state.draft
											: state.artifact;

										// Call original hook with extracted artifact
										const hookResult = hook({
											...input,
											artifact: exposedArtifact,
										});

										// Handle result with maybeThen
										return maybeThen(
											hookResult,
											(res: unknown) => {
												if (
													res &&
													typeof res === 'object' &&
													'artifact' in res &&
													(
														res as {
															artifact: unknown;
														}
													).artifact !== undefined
												) {
													// Map result artifact back to correct state property
													if (usesDraft) {
														return {
															...res,
															artifact: {
																...state,
																draft: (
																	res as {
																		artifact: unknown;
																	}
																).artifact,
															},
														};
													}
													return {
														...res,
														artifact: {
															...state,
															artifact: (
																res as {
																	artifact: unknown;
																}
															).artifact,
														},
													};
												}
												return res;
											}
										);
									};
								};

								if (typeof result === 'function') {
									return adaptHook(
										result as (input: unknown) => unknown
									);
								}

								if (
									result &&
									typeof result === 'object' &&
									'hook' in result
								) {
									return {
										...result,
										hook: adaptHook(
											(
												result as {
													hook: (
														input: unknown
													) => unknown;
												}
											).hook
										),
									};
								}

								return result;
							}
						);
					},
				};
				return pipeline.extensions.use(
					proxyExtension as unknown as Parameters<
						typeof pipeline.extensions.use
					>[0]
				);
			},
		},
		use: (helper) =>
			pipeline.use(
				helper as unknown as Helper<
					TContext,
					unknown,
					unknown,
					TReporter,
					HelperKind
				>
			),
		run: (opts) => pipeline.run(opts),
	};

	return wrapper;
}

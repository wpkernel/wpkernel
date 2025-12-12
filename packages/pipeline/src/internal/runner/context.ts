import {
	createDependencyGraph,
	type CreateDependencyGraphOptions,
	type RegisteredHelper,
} from '../../dependency-graph';
import type {
	HelperDescriptor,
	PipelineExtensionHookOptions,
	PipelineExtensionLifecycle,
	PipelineReporter,
	PipelineStep,
	HelperKind,
	Helper,
	PipelineDiagnostic,
	PipelineExtensionRollbackErrorMetadata,
} from '../../types';
import type {
	PipelineRunContext,
	PipelineRunnerDependencies,
} from '../pipeline-runner.types';

export const prepareContext = <
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
	>,
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
	const buildOptions = dependencies.options.createBuildOptions(runOptions);
	const context = dependencies.options.createContext(runOptions);
	dependencies.diagnosticManager.setReporter(context.reporter);
	const draft = dependencies.options.createFragmentState({
		options: runOptions,
		context,
		buildOptions,
	});

	// Unified order calculation
	const helperOrders = new Map<string, RegisteredHelper<unknown>[]>();

	for (const [kind, entries] of dependencies.helperRegistries.entries()) {
		// Determine options based on kind (legacy compat)
		let graphOptions:
			| CreateDependencyGraphOptions<HelperDescriptor>
			| undefined;

		if (kind === dependencies.fragmentKind) {
			graphOptions = {
				providedKeys: dependencies.options.fragmentProvidedKeys,
				onMissingDependency: ({ dependant, dependencyKey }) => {
					const helper = dependant.helper;
					dependencies.diagnosticManager.flagMissingDependency(
						helper,
						dependencyKey,
						kind
					);
					dependencies.diagnosticManager.flagUnusedHelper(
						helper,
						kind,
						`could not execute because dependency "${dependencyKey}" was not found`,
						helper.dependsOn
					);
				},
				onUnresolvedHelpers: ({ unresolved }) => {
					for (const entry of unresolved) {
						const helper = entry.helper;
						dependencies.diagnosticManager.flagUnusedHelper(
							helper,
							kind,
							'could not execute because its dependencies never resolved',
							helper.dependsOn
						);
					}
				},
			};
		} else if (kind === dependencies.builderKind) {
			graphOptions = {
				providedKeys: dependencies.options.builderProvidedKeys,
				onMissingDependency: ({ dependant, dependencyKey }) => {
					const helper = dependant.helper;
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
						const helper = entry.helper;
						dependencies.diagnosticManager.flagUnusedHelper(
							helper,
							dependencies.builderKind,
							'could not execute because its dependencies never resolved',
							helper.dependsOn
						);
					}
				},
			};
		} else {
			// Default for arbitrary kinds: For now, strict.
			graphOptions = {
				onMissingDependency: ({ dependant, dependencyKey }) => {
					const helper = dependant.helper;
					dependencies.diagnosticManager.flagMissingDependency(
						helper,
						dependencyKey,
						kind
					);
				},
				onUnresolvedHelpers: ({ unresolved }) => {
					for (const entry of unresolved) {
						const helper = entry.helper;
						dependencies.diagnosticManager.flagUnusedHelper(
							helper,
							kind,
							'could not execute because its dependencies never resolved',
							helper.dependsOn
						);
					}
				},
			};
		}

		const { order } = createDependencyGraph(
			entries as RegisteredHelper<HelperDescriptor>[],
			graphOptions,
			dependencies.createError
		);

		helperOrders.set(kind, order as RegisteredHelper<unknown>[]);
	}

	// Legacy accessors
	// We cast generic unknown back to specific types because we know the map logic preserves kind
	const fragmentOrder = (helperOrders.get(dependencies.fragmentKind) ??
		[]) as RegisteredHelper<TFragmentHelper>[];

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

	const builderGraphOptions: CreateDependencyGraphOptions<TBuilderHelper> = {
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
		}): PipelineExtensionHookOptions<TContext, TRunOptions, TArtifact> => ({
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
		helperOrders,
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

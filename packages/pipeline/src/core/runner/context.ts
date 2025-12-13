import {
	createDependencyGraph,
	type RegisteredHelper,
} from '../dependency-graph';
import type {
	AgnosticRunContext,
	AgnosticRunnerDependencies,
	AgnosticState,
} from './types';
import type {
	PipelineReporter,
	PipelineDiagnostic,
	PipelineExtensionRollbackErrorMetadata,
} from '../types';
import { initExtensionCoordinator } from '../internal/extension-coordinator';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Prepares the pipeline execution context.
 *
 * @param dependencies
 * @param runOptions
 * @internal
 */
export const prepareContext = <
	TRunOptions,
	TUserState,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
>(
	dependencies: AgnosticRunnerDependencies<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic,
		TRunResult
	>,
	runOptions: TRunOptions
): AgnosticRunContext<
	TRunOptions,
	TUserState,
	TContext,
	TReporter,
	TDiagnostic
> => {
	const context = dependencies.options.createContext(runOptions);

	// Setup diagnostics for this run
	dependencies.diagnosticManager.prepareRun();
	dependencies.diagnosticManager.setReporter(context.reporter);

	// Generic graph resolution for all registries
	const helperOrders = new Map<string, RegisteredHelper<unknown>[]>();

	for (const [kind, entries] of dependencies.helperRegistries) {
		const graph = createDependencyGraph(
			entries as any,
			{
				onMissingDependency: (issue) => {
					dependencies.diagnosticManager.flagMissingDependency(
						issue.dependant.helper as any,
						issue.dependencyKey,
						kind
					);
					dependencies.diagnosticManager.flagUnusedHelper(
						issue.dependant.helper as any,
						kind,
						'has missing dependencies',
						(issue.dependant.helper as any).dependsOn ?? []
					);
				},
				onUnresolvedHelpers: ({ unresolved }) => {
					for (const entry of unresolved) {
						dependencies.diagnosticManager.flagUnusedHelper(
							entry.helper as any,
							kind,
							'has unresolved dependencies (possible cycle)',
							(entry.helper as any).dependsOn ?? []
						);
					}
				},
				providedKeys: dependencies.options.providedKeys?.[kind],
			},
			dependencies.options.createError
		);
		helperOrders.set(kind, graph.order as any);
	}

	const userState = dependencies.options.createState({
		context,
		options: runOptions,
	});

	const steps: any[] = [];
	const pushStep = (entry: RegisteredHelper<unknown>) => steps.push(entry);

	const handleRollbackError = (options: {
		readonly error: unknown;
		readonly extensionKeys: readonly string[];
		readonly hookSequence: readonly string[];
		readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
		readonly context: TContext;
	}) => {
		if (dependencies.options.onExtensionRollbackError) {
			dependencies.options.onExtensionRollbackError(options);
		}
	};

	const buildHookOptions = (
		currentState: AgnosticState<
			TRunOptions,
			TUserState,
			TContext,
			TReporter,
			TDiagnostic
		>,
		lifecycle: string
	) => ({
		context,
		options: runOptions,
		artifact: currentState.userState, // Extension expects UserState
		lifecycle,
	});

	const state: AgnosticState<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	> = {
		context,
		reporter: context.reporter,
		runOptions,
		userState,
		steps,

		diagnostics:
			dependencies.diagnosticManager.getDiagnostics() as TDiagnostic[], // Live reference
		// AgnosticState definition has diagnostics: TDiagnostic[]. Programs read it from here.
		// finalizeResultStage updates it from manager.

		helperRegistries: dependencies.helperRegistries,
		helperOrders,
		executedLifecycles: new Set(),
		// Runtime maps
		helperExecution: new Map(),
		helperRollbacks: new Map(),

		extensionCoordinator: initExtensionCoordinator((event) =>
			handleRollbackError({
				...event,
				context,
			})
		),
	};

	return {
		runOptions,
		context,
		state,
		steps,
		pushStep,
		helperRegistries: dependencies.helperRegistries,
		helperOrders,
		buildHookOptions,
		handleRollbackError,
	};
};

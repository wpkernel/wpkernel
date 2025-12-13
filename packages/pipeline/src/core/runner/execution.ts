// Types are strictly defined and validated by build, but ESLint flags generic resolution as any.
// runProgram removed
import type {
	AgnosticRunContext,
	AgnosticRunnerDependencies,
	AgnosticState,
	HelperExecutionSnapshot,
	Halt,
	ExtensionCoordinator,
	ExtensionLifecycleState,
} from './types';
import type {
	PipelineReporter,
	PipelineDiagnostic,
	MaybePromise,
} from '../types';
import { maybeThen } from '../async-utils';
import { createAgnosticProgram } from './program';

const createEmptySnapshot = (
	kind: string
): HelperExecutionSnapshot<string> => ({
	kind,
	registered: [],
	executed: [],
	missing: [],
});

export const executeRun = <
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
	runContext: AgnosticRunContext<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	>
): MaybePromise<TRunResult> => {
	const {
		runOptions,
		context,
	}: AgnosticRunContext<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	> = runContext;

	// AgnosticState is already prepared by prepareContext

	const initialState: AgnosticState<
		TRunOptions,
		TUserState,
		TContext,
		TReporter,
		TDiagnostic
	> = runContext.state;

	if (!dependencies.stages) {
		return dependencies.resolveRunResult({
			diagnostics: [],
			steps: [],
			context,
			userState: initialState.userState,
			options: runOptions,
			helpers: {
				builders: createEmptySnapshot('dummy-builder'),
			},
			state: initialState,
		});
	}

	const program = createAgnosticProgram(dependencies, runContext);

	return maybeThen(
		program(initialState),
		(
			result:
				| AgnosticState<
						TRunOptions,
						TUserState,
						TContext,
						TReporter,
						TDiagnostic
				  >
				| Halt<TRunResult>
		) => {
			if (result && typeof result === 'object' && '__halt' in result) {
				if (result.error) {
					throw result.error;
				}
				return result.result!;
			}

			// Commit any pending extension changes
			// We need to handle this conditionally synchronously
			const extensionStack = result.extensionStack ?? [];
			const fallbackCommit =
				extensionStack.length === 0 &&
				result.extensionCoordinator &&
				result.extensionState
					? () =>
							result.extensionCoordinator!.commit(
								result.extensionState!
							)
					: undefined;

			const commitPromise = fallbackCommit
				? fallbackCommit()
				: extensionStack.reduce(
						(
							previous: MaybePromise<void>,
							{
								coordinator,
								state: loopState,
							}: {
								coordinator: ExtensionCoordinator<
									TContext,
									TRunOptions,
									TUserState
								>;
								state: ExtensionLifecycleState<
									TContext,
									TRunOptions,
									TUserState
								>;
							}
						) =>
							maybeThen(previous, () =>
								coordinator.commit(loopState)
							),
						undefined as MaybePromise<void>
					);

			return maybeThen(commitPromise, () =>
				dependencies.resolveRunResult({
					diagnostics: result.diagnostics as TDiagnostic[],
					steps: result.steps,
					context: result.context,
					userState: result.userState,
					options: result.runOptions,
					helpers: {
						fragments: createEmptySnapshot('dummy-fragment'),
						builders: createEmptySnapshot('dummy-builder'),
					},
					state: result,
				})
			);
		}
	);
};

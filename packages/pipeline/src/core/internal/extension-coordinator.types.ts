import type {
	MaybePromise,
	PipelineExtensionHookOptions,
	PipelineExtensionRollbackErrorMetadata,
} from '../types';
import type {
	ExtensionHookEntry,
	ExtensionHookExecution,
	RollbackErrorArgs,
} from '../extensions';

/**
 * Represents the state returned after executing a specific extension lifecycle.
 *
 * @category Pipeline
 * @internal
 */
export interface ExtensionLifecycleState<TContext, TOptions, TUserState> {
	readonly artifact: TUserState;
	readonly results: ExtensionHookExecution<TContext, TOptions, TUserState>[];
	readonly hooks: readonly ExtensionHookEntry<
		TContext,
		TOptions,
		TUserState
	>[];
}

/**
 * Handles extension execution, rollback, and commit using the primitives exposed by the
 * `extensions` module. Delegating this coordination to a dedicated utility keeps the pipeline
 * runner focused on dependency graph orchestration and helper execution.
 *
 * @category Pipeline
 * @internal
 */
/**
 * Payload supplied to rollback error handlers when an extension lifecycle fails.
 *
 * @category Pipeline
 * @internal
 */
export interface ExtensionRollbackEvent<TContext, TOptions, TUserState>
	extends RollbackErrorArgs {
	readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
	readonly hookOptions?: PipelineExtensionHookOptions<
		TContext,
		TOptions,
		TUserState
	>;
}

export interface ExtensionCoordinator<TContext, TOptions, TUserState> {
	readonly runLifecycle: (
		lifecycle: ExtensionHookEntry<
			TContext,
			TOptions,
			TUserState
		>['lifecycle'],
		options: {
			readonly hooks: readonly ExtensionHookEntry<
				TContext,
				TOptions,
				TUserState
			>[];
			readonly hookOptions: PipelineExtensionHookOptions<
				TContext,
				TOptions,
				TUserState
			>;
		}
	) => MaybePromise<ExtensionLifecycleState<TContext, TOptions, TUserState>>;
	readonly createRollbackHandler: <TResult>(
		state: ExtensionLifecycleState<TContext, TOptions, TUserState>
	) => (error: unknown) => MaybePromise<TResult>;
	readonly commit: (
		state: ExtensionLifecycleState<TContext, TOptions, TUserState>
	) => MaybePromise<void>;
	readonly handleRollbackError: (
		args: ExtensionRollbackEvent<TContext, TOptions, TUserState>
	) => void;
}

export type { ExtensionHookEntry, ExtensionHookExecution, RollbackErrorArgs };

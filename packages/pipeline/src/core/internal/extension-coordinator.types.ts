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
export interface ExtensionLifecycleState<TContext, TOptions, TArtifact> {
	readonly artifact: TArtifact;
	readonly results: ExtensionHookExecution<TContext, TOptions, TArtifact>[];
	readonly hooks: readonly ExtensionHookEntry<
		TContext,
		TOptions,
		TArtifact
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
export interface ExtensionRollbackEvent<TContext, TOptions, TArtifact>
	extends RollbackErrorArgs {
	readonly errorMetadata: PipelineExtensionRollbackErrorMetadata;
	readonly hookOptions?: PipelineExtensionHookOptions<
		TContext,
		TOptions,
		TArtifact
	>;
}

export interface ExtensionCoordinator<TContext, TOptions, TArtifact> {
	readonly runLifecycle: (
		lifecycle: ExtensionHookEntry<
			TContext,
			TOptions,
			TArtifact
		>['lifecycle'],
		options: {
			readonly hooks: readonly ExtensionHookEntry<
				TContext,
				TOptions,
				TArtifact
			>[];
			readonly hookOptions: PipelineExtensionHookOptions<
				TContext,
				TOptions,
				TArtifact
			>;
		}
	) => MaybePromise<ExtensionLifecycleState<TContext, TOptions, TArtifact>>;
	readonly createRollbackHandler: <TResult>(
		state: ExtensionLifecycleState<TContext, TOptions, TArtifact>
	) => (error: unknown) => MaybePromise<TResult>;
	readonly commit: (
		state: ExtensionLifecycleState<TContext, TOptions, TArtifact>
	) => MaybePromise<void>;
	readonly handleRollbackError: (
		args: ExtensionRollbackEvent<TContext, TOptions, TArtifact>
	) => void;
}

export type { ExtensionHookEntry, ExtensionHookExecution, RollbackErrorArgs };

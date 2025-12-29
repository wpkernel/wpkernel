// Main API exports
export { createHelper } from './core/helper';
export { createPipeline } from './standard-pipeline/createPipeline';
export { makePipeline } from './core/makePipeline';
export { makeResumablePipeline } from './core/makeResumablePipeline';
export { createPipelineExtension } from './core/createExtension';
export type { CreatePipelineExtensionOptions } from './core/createExtension';
export { executeHelpers } from './core/executor';
export type { ErrorFactory } from './core/error-factory';
export { createDefaultError, createErrorFactory } from './core/error-factory';
export {
	registerHelper,
	registerExtensionHook,
	handleExtensionRegisterResult,
} from './core/registration';

// Rollback utilities
export { createPipelineRollback, runRollbackStack } from './core/rollback';
export type {
	PipelineRollback,
	PipelineRollbackErrorMetadata,
	RunRollbackStackOptions,
} from './core/rollback';

// Type exports (all types consumers need)
export type {
	// Core pipeline types
	PipelineReporter,
	PipelineExtension,
	PipelineExtensionHook,
	PipelineExtensionHookOptions,
	PipelineExtensionHookResult,
	PipelineExtensionLifecycle,
	PipelineExtensionHookRegistration,
	PipelineExtensionRegisterOutput,
	PipelineDiagnostic,
	ConflictDiagnostic,
	MissingDependencyDiagnostic,
	UnusedHelperDiagnostic,

	// Helper types
	Helper,
	HelperApplyFn,
	HelperApplyResult,
	HelperDescriptor,
	HelperKind,
	HelperMode,
	CreateHelperOptions,
	HelperApplyOptions,
	// Utility types
	MaybePromise,
	PipelineStep,
	PipelineRunState,
	HelperExecutionSnapshot,
	PipelinePauseKind,
	PipelinePauseOptions,
	PipelinePauseSnapshot,
	PipelinePaused,
	PipelineExtensionRollbackErrorMetadata,
	ResumablePipeline,
} from './core/types';

export type {
	Pipeline,
	CreatePipelineOptions,
	PipelineExecutionMetadata,
	FragmentFinalizationMetadata,
} from './standard-pipeline/types';

// Re-export dependency graph utilities for advanced use cases
export type {
	RegisteredHelper,
	MissingDependencyIssue,
} from './core/dependency-graph';
export { createHelperId, compareHelpers } from './core/dependency-graph';

// Advanced Pipeline construction (for custom architectures)
export type {
	PipelineStage,
	Halt,
	AgnosticRunContext as PipelineRunContext,
} from './core/runner/types';

// Re-export async utilities for helper authors
export {
	isPromiseLike,
	maybeThen,
	maybeTry,
	processSequentially,
} from './core/async-utils';

// Re-export extension utilities for extension authors
export type {
	ExtensionHookEntry,
	ExtensionHookExecution,
	RollbackErrorArgs,
} from './core/extensions';

// Blueprint exports for official extensions
export { OFFICIAL_EXTENSION_BLUEPRINTS } from './core/extensions/official';
export type { OfficialExtensionBlueprint } from './core/extensions/official';

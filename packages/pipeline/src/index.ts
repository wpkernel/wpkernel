// Main API exports
export { createHelper } from './helper';
export { createPipeline } from './createPipeline';
export { createPipelineExtension } from './createExtension';
export type { CreatePipelineExtensionOptions } from './createExtension';
export { executeHelpers } from './executor';
export type { ErrorFactory } from './error-factory';
export { createDefaultError, createErrorFactory } from './error-factory';
export {
	registerHelper,
	registerExtensionHook,
	handleExtensionRegisterResult,
} from './registration';

// Rollback utilities
export { createPipelineRollback, runRollbackStack } from './rollback';
export type {
	PipelineRollback,
	PipelineRollbackErrorMetadata,
	RunRollbackStackOptions,
} from './rollback';

// Type exports (all types consumers need)
export type {
	// Core pipeline types
	Pipeline,
	CreatePipelineOptions,
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
	PipelineExecutionMetadata,
	FragmentFinalizationMetadata,
	PipelineExtensionRollbackErrorMetadata,
} from './types';

// Re-export dependency graph utilities for advanced use cases
export type {
	RegisteredHelper,
	MissingDependencyIssue,
} from './dependency-graph';
export { createHelperId, compareHelpers } from './dependency-graph';

// Re-export async utilities for helper authors
export {
	isPromiseLike,
	maybeThen,
	maybeTry,
	processSequentially,
} from './async-utils';

// Re-export extension utilities for extension authors
export type {
	ExtensionHookEntry,
	ExtensionHookExecution,
	RollbackErrorArgs,
} from './extensions';

// Blueprint exports for official extensions
export { OFFICIAL_EXTENSION_BLUEPRINTS } from './extensions/official';
export type { OfficialExtensionBlueprint } from './extensions/official';

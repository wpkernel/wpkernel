/**
 * Creates a generic helper function for pipeline steps (fragments or builders).
 *
 * This function provides a standardized way to define pipeline steps with a key,
 * kind, and an `apply` method, along with optional dependencies.
 *
 * @category Runtime
 * @param    options - Options for creating the helper, including key, kind, and apply logic.
 * @returns A `FragmentHelper` or `BuilderHelper` instance.
 */
export { createHelper } from './createHelper';

export { requireIr } from './ir';
/**
 * Creates a new pipeline instance.
  ```
 *
 * The pipeline orchestrates the execution of IR fragments and builders,
 * allowing for a modular and extensible code generation process.
 *
 * @category Runtime
 * @returns A `Pipeline` instance.
 */
export { createPipeline } from './createPipeline';
export type {
	Pipeline,
	PipelineRunOptions,
	PipelineRunResult,
	PipelineStep,
	PipelineDiagnostic,
	ConflictDiagnostic,
	MissingDependencyDiagnostic,
	UnusedHelperDiagnostic,
	PipelinePhase,
	BuilderInput,
	BuilderOutput,
	BuilderWriteAction,
	BuilderHelper,
	FragmentInput,
	FragmentOutput,
	FragmentHelper,
	PipelineContext,
	PipelineExtension,
	PipelineExtensionHook,
	PipelineExtensionHookOptions,
	PipelineExtensionHookResult,
} from './types';

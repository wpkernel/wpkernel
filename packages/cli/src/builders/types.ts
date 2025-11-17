import type { ResourceConfig } from '@wpkernel/core/resource';
import type { Reporter } from '@wpkernel/core/reporter';
import type { MaybePromise } from '@wpkernel/pipeline';
import type { SourceFile, Project } from 'ts-morph';
import type { WPKernelConfigV1 } from '../config';
import type { IRResource, IRv1 } from '../ir';
import type { Workspace } from '../workspace';
import type { BuilderOutput } from '../runtime';
import type { BuilderApplyOptions } from '../runtime/types';

/**
 * Options for emitting a TypeScript file.
 *
 * @category AST Builders
 */

export interface TsBuilderEmitOptions {
	/** The file path where the TypeScript file will be emitted. */
	readonly filePath: string;
	/** The `ts-morph` SourceFile object to emit. */
	readonly sourceFile: SourceFile;
}
/**
 * Defines lifecycle hooks for the TypeScript builder.
 *
 * These hooks allow for custom logic to be executed at different stages
 * of the TypeScript artifact generation process.
 *
 * @category AST Builders
 */

export interface TsBuilderLifecycleHooks {
	/** Hook executed before a creator generates an artifact. */
	readonly onBeforeCreate?: (
		context: Omit<TsBuilderCreatorContext, 'hooks'>
	) => Promise<void>;
	/** Hook executed after a creator generates an artifact. */
	readonly onAfterCreate?: (
		context: Omit<TsBuilderCreatorContext, 'hooks'>
	) => Promise<void>;
	/** Hook executed after all TypeScript files have been emitted. */
	readonly onAfterEmit?: (
		options: TsBuilderAfterEmitOptions
	) => Promise<void>;
}
/**
 * Options passed to the `onAfterEmit` lifecycle hook.
 *
 * @category AST Builders
 */

export interface TsBuilderAfterEmitOptions {
	/** A list of file paths that were emitted. */
	readonly emitted: readonly string[];
	/** The workspace instance. */
	readonly workspace: Workspace;
	/** The reporter instance. */
	readonly reporter: Reporter;
}
/**
 * Context provided to a `TsBuilderCreator` function.
 *
 * @category AST Builders
 */

export interface TsBuilderCreatorContext {
	/** The `ts-morph` project instance for managing source files. */
	readonly project: Project;
	/** The workspace instance. */
	readonly workspace: Workspace;
	/** The resource descriptor for which artifacts are being created. */
	readonly descriptor: ResourceDescriptor;
	/** The full WPKernel configuration. */
	readonly config: WPKernelConfigV1;
	/** The source path of the configuration file. */
	readonly sourcePath: string;
	/** The Intermediate Representation (IR) of the project. */
	readonly ir: IRv1;
	/** Resolved layout paths required for TS generation. */
	readonly paths: {
		readonly blocksGenerated: string;
		readonly uiGenerated: string;
		readonly jsGenerated: string;
	};
	/** The reporter instance for logging. */
	readonly reporter: Reporter;
	/** A function to emit a generated TypeScript file. */
	readonly emit: (options: TsBuilderEmitOptions) => Promise<void>;
}
/**
 * Defines a creator function for generating TypeScript artifacts.
 *
 * A creator is responsible for generating specific TypeScript files or code
 * based on the provided context.
 *
 * @category AST Builders
 */

export interface TsBuilderCreator {
	/** A unique key for the creator. */
	readonly key: string;
	/** The function that creates the TypeScript artifact. */
	create: (context: TsBuilderCreatorContext) => Promise<void>;
}
/**
 * Options for creating a TypeScript builder.
 *
 * @category AST Builders
 * @public
 */

export interface CreateTsBuilderOptions {
	/** Optional: A list of `TsBuilderCreator` instances to use. */
	readonly creators?: readonly TsBuilderCreator[];
	/** Optional: A factory function to create a `ts-morph` Project instance. */
	readonly projectFactory?: () => MaybePromise<Project>;
	/** Optional: Lifecycle hooks for the builder. */
	readonly hooks?: TsBuilderLifecycleHooks;
}
/**
 * Options for formatting a TypeScript file.
 *
 * @category AST Builders
 */

export interface TsFormatterFormatOptions {
	/** The file path of the TypeScript file to format. */
	readonly filePath: string;
	/** The content of the TypeScript file to format. */
	readonly contents: string;
}
/**
 * Interface for a TypeScript formatter.
 *
 * @category AST Builders
 */

export interface TsFormatter {
	/** Formats the given TypeScript file content. */
	format: (options: TsFormatterFormatOptions) => Promise<string>;
}
/**
 * Options for building a TypeScript formatter.
 *
 * @category AST Builders
 */

export interface BuildTsFormatterOptions {
	/** Optional: A factory function to create a `ts-morph` Project instance. */
	readonly projectFactory?: () => MaybePromise<Project>;
}
type ResourceUiConfig = NonNullable<ResourceConfig['ui']>;
type ResourceAdminConfig = NonNullable<ResourceUiConfig['admin']>;
export type AdminDataViews = NonNullable<ResourceAdminConfig['dataviews']>;
/**
 * Describes a resource with its associated configuration and dataviews.
 *
 * @category AST Builders
 */

export interface ResourceDescriptor {
	/** The unique key of the resource. */
	readonly key: string;
	/** The name of the resource. */
	readonly name: string;
	/** The configuration object for the resource. */
	readonly config: ResourceConfig;
	/** The admin dataviews configuration for the resource. */
	readonly dataviews: AdminDataViews;
}
export type PlanInstruction =
	| {
			readonly action: 'write';
			readonly file: string;
			readonly base: string;
			readonly incoming: string;
			readonly description: string;
	  }
	| {
			readonly action: 'delete';
			readonly file: string;
			readonly description: string;
	  };
export interface PlanDeletionSkip {
	readonly file: string;
	readonly description: string;
	readonly reason: 'missing-base' | 'missing-target' | 'modified-target';
}
export interface PlanFile {
	readonly instructions: readonly PlanInstruction[];
	readonly skippedDeletions: readonly PlanDeletionSkip[];
}
export interface BuildShimOptions {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly className: string;
	readonly generatedClassFqn: string;
	readonly requirePath: string;
}
export type PatchInstruction =
	| {
			readonly action?: 'write';
			readonly file: string;
			readonly base: string;
			readonly incoming: string;
			readonly description?: string;
	  }
	| {
			readonly action: 'delete';
			readonly file: string;
			readonly description?: string;
	  };
export interface PatchPlan {
	readonly instructions: readonly PatchInstruction[];
	readonly skippedDeletions: readonly PatchPlanDeletionSkip[];
}
type PatchStatus = 'applied' | 'conflict' | 'skipped';
export interface PatchRecord {
	readonly file: string;
	readonly status: PatchStatus;
	readonly description?: string;
	readonly details?: Record<string, unknown>;
}
export interface PatchManifest {
	readonly summary: {
		applied: number;
		conflicts: number;
		skipped: number;
	};
	readonly records: PatchRecord[];
	actions: string[];
}
export interface ProcessInstructionOptions {
	readonly workspace: Workspace;
	readonly instruction: PatchInstruction;
	readonly manifest: PatchManifest;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly deletedFiles: string[];
	readonly skippedDeletions: PatchDeletionResult[];
	readonly baseRoot: string;
}
export interface PatchPlanDeletionSkip {
	readonly file: string;
	readonly description?: string;
	readonly reason?: string;
}

export interface PatchDeletionResult {
	readonly file: string;
	readonly reason: string;
}
export interface RecordPlanDeletionsOptions {
	readonly manifest: PatchManifest;
	readonly plan: PatchPlan;
	readonly reporter: BuilderApplyOptions['reporter'];
}
export interface ApplyPlanInstructionsOptions {
	readonly plan: PatchPlan;
	readonly workspace: Workspace;
	readonly manifest: PatchManifest;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly deletedFiles: string[];
	readonly skippedDeletions: PatchDeletionResult[];
	readonly baseRoot: string;
}
export interface ReportDeletionSummaryOptions {
	readonly plan: PatchPlan;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly deletedFiles: readonly string[];
	readonly skippedDeletions: readonly PatchDeletionResult[];
}
export interface ProcessDeleteInstructionOptions {
	readonly workspace: Workspace;
	readonly instruction: Extract<PatchInstruction, { action: 'delete' }>;
	readonly manifest: PatchManifest;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly deletedFiles: string[];
	readonly skippedDeletions: PatchDeletionResult[];
	readonly baseRoot: string;
}
export interface PackageJsonLike {
	readonly name?: string;
	readonly version?: string;
	readonly peerDependencies?: Record<string, string>;
	readonly dependencies?: Record<string, string>;
}
export interface RollupDriverConfig {
	readonly driver: 'rollup';
	readonly input: Record<string, string>;
	readonly outputDir: string;
	readonly format: 'esm';
	readonly external: readonly string[];
	readonly globals: Record<string, string>;
	readonly alias: readonly {
		readonly find: string;
		readonly replacement: string;
	}[];
	readonly sourcemap: {
		readonly development: boolean;
		readonly production: boolean;
	};
	readonly optimizeDeps: { readonly exclude: readonly string[] };
	readonly assetManifest: { readonly path: string };
}
export interface AssetManifestUIEntry {
	readonly handle: string;
	readonly asset: string;
	readonly script: string;
}
export interface AssetManifest {
	readonly entry: string;
	readonly dependencies: readonly string[];
	readonly version: string;
	readonly ui?: AssetManifestUIEntry;
}
export interface RollupDriverArtifacts {
	readonly config: RollupDriverConfig;
	readonly assetManifest: AssetManifest;
}

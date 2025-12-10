import type { WPKExitCode } from '@wpkernel/core/contracts';
import type {
	Reporter,
	createReporter as buildReporter,
} from '@wpkernel/core/reporter';
import type { FileWriterSummary } from '../../utils/file-writer';
import type { renderSummary } from '../run-generate/summary';
import type { validateGeneratedImports } from '../run-generate/validation';
import type { GenerationSummary } from '../run-generate/types';
import type { loadWPKernelConfig } from '../../config';
import type { LoadedWPKernelConfig } from '../../config/types';
import type {
	buildWorkspace,
	Workspace,
	FileManifest,
	WriteOptions,
	WriteJsonOptions,
	RemoveOptions,
} from '../../workspace';
import type { createPipeline, PipelineDiagnostic } from '../../runtime';
import type {
	registerCoreBuilders,
	registerCoreFragments,
} from '../../ir/createIr';
import type { buildAdapterExtensionsExtension } from '../../runtime/adapterExtensions';
import type {
	BuildDefaultReadinessRegistryOptions,
	ReadinessRegistry,
} from '../../dx';

export interface BuildGenerateCommandOptions {
	readonly loadWPKernelConfig?: typeof loadWPKernelConfig;
	readonly buildWorkspace?: typeof buildWorkspace;
	readonly createPipeline?: typeof createPipeline;
	readonly registerFragments?: typeof registerCoreFragments;
	readonly registerBuilders?: typeof registerCoreBuilders;
	readonly buildAdapterExtensionsExtension?: typeof buildAdapterExtensionsExtension;
	readonly buildReporter?: typeof buildReporter;
	readonly renderSummary?: typeof renderSummary;
	readonly validateGeneratedImports?: typeof validateGeneratedImports;
	readonly buildReadinessRegistry?: (
		options?: BuildDefaultReadinessRegistryOptions
	) => ReadinessRegistry;
}

export interface GenerateDependencies {
	readonly loadWPKernelConfig: typeof loadWPKernelConfig;
	readonly buildWorkspace: typeof buildWorkspace;
	readonly createPipeline: typeof createPipeline;
	readonly registerFragments: typeof registerCoreFragments;
	readonly registerBuilders: typeof registerCoreBuilders;
	readonly buildAdapterExtensionsExtension: typeof buildAdapterExtensionsExtension;
	readonly buildReporter: typeof buildReporter;
	readonly renderSummary: typeof renderSummary;
	readonly validateGeneratedImports: typeof validateGeneratedImports;
	readonly buildReadinessRegistry: (
		options?: BuildDefaultReadinessRegistryOptions
	) => ReadinessRegistry;
}

export interface SummaryBuilderOptions {
	readonly workspace: Workspace;
	readonly dryRun: boolean;
}

export interface SummaryRecord {
	readonly path: string;
	readonly originalHash: string | null;
	finalHash: string;
}

export type SummaryEntry = FileWriterSummary['entries'][number];

export interface GenerateSuccess {
	readonly exitCode: WPKExitCode;
	readonly summary: GenerationSummary;
	readonly output: string;
}

export interface GenerateFailure {
	readonly exitCode: WPKExitCode;
	readonly summary: null;
	readonly output: null;
}

export type GenerateResult = GenerateSuccess | GenerateFailure;

export type SummaryCounts = FileWriterSummary['counts'];

export type WorkspaceWriteOptions = WriteOptions;
export type WorkspaceWriteJsonOptions = WriteJsonOptions;
export type WorkspaceRemoveOptions = RemoveOptions;
export type WorkspaceFileManifest = FileManifest;
export type GenerateReporter = Reporter;
export type GenerateDiagnostics = readonly PipelineDiagnostic[];
export type GenerateLoadedConfig = LoadedWPKernelConfig;

export interface GenerateExecutionOptions {
	readonly dependencies: GenerateDependencies;
	readonly reporter: GenerateReporter;
	readonly dryRun: boolean;
	readonly verbose: boolean;
	readonly cwd: string;
	readonly allowDirty: boolean;
}

export interface SummaryRecordFactoryOptions {
	readonly absolutePath: string;
	readonly workspace: Workspace;
	readonly dryRun: boolean;
	readonly previous: Buffer | null;
	readonly next: Buffer;
}

export interface SummaryBuilderContract {
	recordWrite: (absolutePath: string, data: Buffer) => Promise<void>;
	buildSummary: () => FileWriterSummary;
}

export interface TrackedWorkspaceOptions {
	readonly dryRun: boolean;
}

export interface TrackedWorkspaceResult {
	readonly workspace: Workspace;
	readonly summary: SummaryBuilderContract;
}

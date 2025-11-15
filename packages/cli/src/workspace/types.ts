import type {
	WorkspaceWriteOptions,
	WorkspaceLike,
} from '@wpkernel/php-json-ast';

/**
 * Manifest of filesystem changes produced during a workspace operation.
 *
 * @category Workspace
 * @public
 */
export interface FileManifest {
	readonly writes: readonly string[];
	readonly deletes: readonly string[];
}

/**
 * Options controlling how files are written to disk.
 *
 * @category Workspace
 * @public
 */
export type WriteOptions = WorkspaceWriteOptions;

/**
 * Options for writing JSON files within the workspace.
 *
 * @category Workspace
 * @public
 */
export interface WriteJsonOptions extends WriteOptions {
	readonly pretty?: boolean;
}

/**
 * Removal options for workspace file deletion.
 *
 * @category Workspace
 * @public
 */
export interface RemoveOptions {
	readonly recursive?: boolean;
}

/**
 * Marker strings used when performing three-way merges.
 *
 * @category Workspace
 * @public
 */
export interface MergeMarkers {
	readonly start: string;
	readonly mid: string;
	readonly end: string;
}

/**
 * Options controlling the merge strategy.
 *
 * @category Workspace
 * @public
 */
export interface MergeOptions {
	readonly markers?: MergeMarkers;
}

/**
 * Kernel-aware workspace contract used by CLI generators.
 *
 * @category Workspace
 * @public
 */
export interface Workspace extends WorkspaceLike {
	cwd: () => string;
	read: (file: string) => Promise<Buffer | null>;
	readText: (file: string) => Promise<string | null>;
	write: (
		file: string,
		data: Buffer | string,
		options?: WriteOptions
	) => Promise<void>;
	writeJson: <T>(
		file: string,
		value: T,
		options?: WriteJsonOptions
	) => Promise<void>;
	rm: (target: string, options?: RemoveOptions) => Promise<void>;
	glob: (pattern: string | readonly string[]) => Promise<string[]>;
	threeWayMerge: (
		file: string,
		base: string,
		current: string,
		incoming: string,
		options?: MergeOptions
	) => Promise<'clean' | 'conflict'>;
	begin: (label?: string) => void;
	commit: (label?: string) => Promise<FileManifest>;
	rollback: (label?: string) => Promise<FileManifest>;
	dryRun: <T>(
		fn: () => Promise<T>
	) => Promise<{ result: T; manifest: FileManifest }>;
	tmpDir: (prefix?: string) => Promise<string>;
}

import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline/promises';
import { stdin as defaultStdin, stdout as defaultStdout } from 'node:process';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/error';
import type { Workspace } from './types';
import { serialiseError } from '../commands/apply/errors';

const execFile = promisify(execFileCallback);

export interface WorkspaceGitStatusEntry {
	readonly code: string;
	readonly path: string;
	readonly originalPath?: string;
	readonly raw: string;
}

export type WorkspaceGitStatus = ReadonlyArray<WorkspaceGitStatusEntry>;

/**
 * Options for the `ensureCleanDirectory` function.
 *
 * @category Workspace
 */
export interface EnsureCleanDirectoryOptions {
	/** The workspace instance. */
	readonly workspace: Workspace;
	/** The directory to ensure is clean. */
	readonly directory: string;
	/** Whether to force the cleanup, even if the directory is not empty. */
	readonly force?: boolean;
	/** Whether to create the directory if it doesn't exist. */
	readonly create?: boolean;
	/** Optional: The reporter instance for logging. */
	readonly reporter?: Reporter;
}

/**
 * Options for the `promptConfirm` function.
 *
 * @category Workspace
 */
export interface ConfirmPromptOptions {
	/** The message to display to the user. */
	readonly message: string;
	/** Optional: The default value if the user just presses Enter. */
	readonly defaultValue?: boolean;
	/** Optional: The input stream to read from. Defaults to `process.stdin`. */
	readonly input?: NodeJS.ReadableStream;
	/** Optional: The output stream to write to. Defaults to `process.stdout`. */
	readonly output?: NodeJS.WritableStream;
}

export type WorkspaceLike = { readonly root: string } | string;

/**
 * Resolves a path inside the given workspace.
 *
 * - `workspace` may be a Workspace-like object with a `root` property
 *   or a string root path.
 * - Additional `segments` are joined and resolved relative to that root.
 * - Returns an absolute, normalised path.
 * @param          workspace
 * @param {...any} segments
 */
export function resolveFromWorkspace(
	workspace: WorkspaceLike,
	...segments: string[]
): string {
	const root =
		typeof workspace === 'string'
			? path.resolve(workspace)
			: path.resolve(workspace.root);

	return path.resolve(root, ...segments);
}

async function statIfExists(target: string): Promise<Stats | null> {
	try {
		return await fs.lstat(target);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

/**
 * Converts a target path to a workspace-relative POSIX path when possible.
 *
 * - `workspace` may be a Workspace-like object with a `root` property
 *   or a string root path.
 * - `targetPath` may be absolute or relative; relative paths are resolved
 *   against the workspace root.
 * - If the resolved path is inside the workspace, a relative POSIX path
 *   is returned ('.' for the root).
 * - If the resolved path is outside the workspace, the absolute path is
 *   returned, normalised to POSIX separators.
 * @param workspace
 * @param targetPath
 */
export function toWorkspaceRelative(
	workspace: WorkspaceLike,
	targetPath: string
): string {
	const root =
		typeof workspace === 'string'
			? path.resolve(workspace)
			: path.resolve(workspace.root);

	const absolute = path.isAbsolute(targetPath)
		? path.resolve(targetPath)
		: path.resolve(root, targetPath);

	const relativePath = path.relative(root, absolute);

	if (relativePath === '') {
		return '.';
	}

	// Outside the workspace: keep it absolute but normalised
	if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		return absolute.split(path.sep).join(path.posix.sep);
	}

	return relativePath.split(path.sep).join(path.posix.sep);
}

function normaliseDirectory(directory: string, workspace: Workspace): string {
	if (path.isAbsolute(directory)) {
		return directory;
	}

	return workspace.resolve(directory);
}

function parseGitStatusEntry(line: string): WorkspaceGitStatusEntry | null {
	if (line.length === 0) {
		return null;
	}

	const raw = line.replace(/\r$/, '');
	const code = raw.slice(0, 2);
	const remainder = raw.slice(3);
	const renameIndex = remainder.indexOf(' -> ');

	if (renameIndex === -1) {
		return {
			code,
			path: remainder,
			raw,
		} satisfies WorkspaceGitStatusEntry;
	}

	const originalPath = remainder.slice(0, renameIndex);
	const nextPath = remainder.slice(renameIndex + 4);

	return {
		code,
		path: nextPath,
		originalPath,
		raw,
	} satisfies WorkspaceGitStatusEntry;
}

function isGitRepositoryMissing(error: unknown): boolean {
	if (typeof error === 'string') {
		return error.includes('not a git repository');
	}

	if (typeof error === 'object' && error !== null) {
		const message =
			typeof (error as { message?: unknown }).message === 'string'
				? ((error as { message?: string }).message as string)
				: '';
		const stderr =
			typeof (error as { stderr?: unknown }).stderr === 'string'
				? ((error as { stderr?: string }).stderr as string)
				: '';

		if (message.includes('not a git repository')) {
			return true;
		}

		if (stderr.includes('not a git repository')) {
			return true;
		}
	}

	return false;
}

export async function readWorkspaceGitStatus(
	workspace: Workspace
): Promise<WorkspaceGitStatus | null> {
	try {
		const { stdout } = await execFile('git', ['status', '--porcelain'], {
			cwd: workspace.root,
		});

		const entries = stdout
			.split('\n')
			.map((line) => parseGitStatusEntry(line))
			.filter(
				(entry): entry is WorkspaceGitStatusEntry => entry !== null
			);

		return entries;
	} catch (error) {
		if (isGitRepositoryMissing(error)) {
			return null;
		}

		throw new WPKernelError('DeveloperError', {
			message: 'Unable to read workspace git status.',
			context: {
				error: serialiseError(error),
			},
		});
	}
}

/**
 * Ensures that a given directory is clean (empty) or creates it if it doesn't exist.
 *
 * If the directory exists and is not empty, it will throw a `WPKernelError`
 * unless `force` is true, in which case it will clear the directory contents.
 *
 * @category Workspace
 * @param    options.workspace
 * @param    options.directory
 * @param    options.force
 * @param    options.create
 * @param    options.reporter
 * @param    options           - Options for ensuring the directory is clean.
 * @throws `WPKernelError` if the directory is not empty and `force` is false, or if it's not a directory.
 */
export async function ensureCleanDirectory({
	workspace,
	directory,
	force = false,
	create = true,
	reporter,
}: EnsureCleanDirectoryOptions): Promise<void> {
	const absoluteDirectory = normaliseDirectory(directory, workspace);
	const relativeDirectory = toWorkspaceRelative(workspace, absoluteDirectory);
	const stat = await statIfExists(absoluteDirectory);

	if (!stat) {
		if (create) {
			await fs.mkdir(absoluteDirectory, { recursive: true });
		}
		return;
	}

	if (!stat.isDirectory()) {
		throw new WPKernelError('ValidationError', {
			message: 'Expected a directory.',
			context: { path: relativeDirectory },
		});
	}

	const entries = await fs.readdir(absoluteDirectory);
	if (entries.length === 0) {
		return;
	}

	if (!force) {
		throw new WPKernelError('ValidationError', {
			message: 'Directory is not empty.',
			context: {
				path: relativeDirectory,
				entries: entries.sort(),
			},
		});
	}

	reporter?.info?.('Clearing directory contents.', {
		path: relativeDirectory,
	});
	await fs.rm(absoluteDirectory, { recursive: true, force: true });
	await fs.mkdir(absoluteDirectory, { recursive: true });
}

function formatPrompt(
	message: string,
	defaultValue: boolean | undefined
): string {
	let suffix = ' (y/n) ';

	if (defaultValue === true) {
		suffix = ' (Y/n) ';
	} else if (defaultValue === false) {
		suffix = ' (y/N) ';
	}

	return `${message}${suffix}`;
}

function parseBooleanAnswer(
	answer: string,
	defaultValue: boolean | undefined
): boolean {
	const normalised = answer.trim().toLowerCase();
	if (normalised === '') {
		return defaultValue ?? false;
	}

	if (normalised === 'y' || normalised === 'yes') {
		return true;
	}

	if (normalised === 'n' || normalised === 'no') {
		return false;
	}

	return defaultValue ?? false;
}

/**
 * Prompts the user for a yes/no confirmation.
 *
 * @category Workspace
 * @param    options.message
 * @param    options.defaultValue
 * @param    options.input
 * @param    options.output
 * @param    options              - Options for the confirmation prompt.
 * @returns A promise that resolves to `true` for yes, `false` for no.
 */
export async function promptConfirm({
	message,
	defaultValue,
	input = defaultStdin,
	output = defaultStdout,
}: ConfirmPromptOptions): Promise<boolean> {
	const rl = readline.createInterface({ input, output });

	try {
		const question = formatPrompt(message, defaultValue);
		const answer = await rl.question(question);
		return parseBooleanAnswer(answer, defaultValue);
	} finally {
		rl.close();
	}
}

export const __testing = Object.freeze({
	formatPrompt,
	parseBooleanAnswer,
	isGitRepositoryMissing,
	normaliseDirectory,
});

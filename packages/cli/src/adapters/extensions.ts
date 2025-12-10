import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { WPKernelError } from '@wpkernel/core/contracts';
import type {
	AdapterContext,
	AdapterExtension,
	AdapterExtensionContext,
} from '../config/types';
import type { IRAdapterChange, IRv1 } from '../ir/publicTypes';
import { diffIr } from './changeLog';

/**
 * Result returned by the `runAdapterExtensions` helper.
 *
 * The object mirrors a transactional workflow where adapter extensions are run
 * in isolation and can later commit their generated files to disk. Consumers
 * can roll back the sandbox at any time to discard pending writes.
 *
 * @category Adapters
 */
export interface AdapterExtensionRunResult {
	/**
	 * Final intermediate representation after all extensions have executed.
	 */
	ir: IRv1;
	/**
	 * Persist queued files to disk and dispose of the sandbox.
	 */
	commit: () => Promise<void>;
	/**
	 * Remove the sandbox without writing queued files.
	 */
	rollback: () => Promise<void>;
}

interface PendingFile {
	targetPath: string;
	sandboxPath: string;
}

interface RunAdapterExtensionsOptions {
	extensions: AdapterExtension[];
	adapterContext: AdapterContext;
	ir: IRv1;
	outputDir: string;
	configDirectory?: string;
	ensureDirectory: (directoryPath: string) => Promise<void>;
	writeFile: (filePath: string, contents: string) => Promise<void>;
	formatPhp: (filePath: string, contents: string) => Promise<string>;
	formatTs: (filePath: string, contents: string) => Promise<string>;
}

const SANDBOX_PREFIX = path.join(os.tmpdir(), 'wpk-adapter-ext-');

/**
 * Execute adapter extensions within a sandboxed environment.
 *
 * Each extension receives a cloned version of the intermediate representation
 * (IR) and can queue files that are written only after
 * AdapterExtensionRunResult.commit resolves. Failures automatically roll back
 * queued writes and propagate a normalised error for consistent reporting.
 *
 * @category Adapters
 * @param    options - Runtime options for executing adapter extensions.
 * @return The updated IR along with commit/rollback controls.
 * @example
 * ```ts
 * const { ir, commit } = await runAdapterExtensions({
 *   extensions: [myExtension],
 *   adapterContext,
 *   ir,
 *   outputDir,
 *   ensureDirectory,
 *   writeFile,
 *   formatPhp,
 *   formatTs,
 * });
 * await commit();
 * ```
 */
export async function runAdapterExtensions(
	options: RunAdapterExtensionsOptions
): Promise<AdapterExtensionRunResult> {
	const {
		extensions,
		adapterContext,
		ir,
		outputDir,
		configDirectory,
		ensureDirectory,
		writeFile,
		formatPhp,
		formatTs,
	} = options;

	if (extensions.length === 0) {
		return {
			ir,
			async commit() {
				// no-op
			},
			async rollback() {
				// no-op
			},
		};
	}

	const sandboxRoot = await fs.mkdtemp(SANDBOX_PREFIX);
	const pendingFiles: PendingFile[] = [];
	let disposed = false;
	const outputRoot = await resolveOutputRoot(outputDir);
	const changeLog: IRAdapterChange[] = [];

	const cleanup = async () => {
		if (disposed) {
			return;
		}

		disposed = true;
		await fs.rm(sandboxRoot, { recursive: true, force: true });
	};

	let effectiveIr = cloneIr(ir);

	for (const [index, extension] of extensions.entries()) {
		assertValidExtension(extension);
		const sandboxDir = path.join(sandboxRoot, `extension-${index}`);
		await fs.mkdir(sandboxDir, { recursive: true });

		const extensionReporter = adapterContext.reporter.child(
			`extension.${sanitizeNamespace(extension.name)}`
		);

		const clonedIr = cloneIr(effectiveIr);
		let hasUpdatedIr = false;
		let updatedIr: IRv1 | undefined;

		const context: AdapterExtensionContext = {
			...adapterContext,
			reporter: extensionReporter,
			ir: clonedIr,
			outputDir,
			configDirectory,
			tempDir: sandboxDir,
			formatPhp,
			formatTs,
			async queueFile(filePath: string, contents: string) {
				const scheduled = await scheduleFile({
					outputDir,
					sandboxDir,
					outputRoot,
					filePath,
					contents,
				});
				pendingFiles.push(scheduled);
			},
			updateIr(candidate) {
				hasUpdatedIr = true;
				updatedIr = cloneIr(candidate as IRv1);
			},
		};

		try {
			await extension.apply(context);
		} catch (error) {
			extensionReporter.error('Adapter extension failed.', {
				name: extension.name,
				error: serialiseError(error),
			});
			await cleanup();
			throw normaliseError(error);
		}

		if (hasUpdatedIr && updatedIr) {
			const ops = diffIr(clonedIr, updatedIr);
			if (ops.length > 0) {
				changeLog.push({
					name: extension.name,
					ops,
				});
			}
			effectiveIr = updatedIr;
		} else {
			effectiveIr = clonedIr;
		}
	}

	return {
		ir: attachAdapterAudit(effectiveIr, changeLog),
		async commit() {
			if (disposed) {
				// no-op if already disposed
				return;
			}

			try {
				for (const file of pendingFiles) {
					const contents = await fs.readFile(
						file.sandboxPath,
						'utf8'
					);
					await ensureDirectory(path.dirname(file.targetPath));
					await writeFile(file.targetPath, contents);
				}
			} finally {
				await cleanup();
			}
		},
		async rollback() {
			await cleanup();
		},
	};
}

function attachAdapterAudit(ir: IRv1, changes: IRAdapterChange[]): IRv1 {
	if (changes.length === 0) {
		return ir;
	}

	const existing = ir.adapterAudit?.changes ?? [];

	return {
		...ir,
		adapterAudit: {
			changes: [...existing, ...changes],
		},
	};
}

function cloneIr(ir: IRv1): IRv1 {
	return stripFunctions(ir) as IRv1;
}

interface ScheduleFileOptions {
	outputDir: string;
	sandboxDir: string;
	outputRoot: string;
	filePath: string;
	contents: string;
}

async function scheduleFile(
	options: ScheduleFileOptions
): Promise<PendingFile> {
	const { outputDir, sandboxDir, outputRoot, filePath, contents } = options;
	const targetPath = path.resolve(filePath);
	const relativeTarget = path.relative(outputDir, targetPath);

	if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
		throw new WPKernelError('DeveloperError', {
			message: `Adapter extensions must write inside ${outputDir}. Received: ${filePath}`,
			context: { outputDir, filePath },
		});
	}

	await validateSandboxTarget({
		targetPath,
		relativeTarget,
		outputRoot,
		outputDir,
	});

	const sandboxPath = path.join(sandboxDir, 'files', relativeTarget);
	await fs.mkdir(path.dirname(sandboxPath), { recursive: true });
	await fs.writeFile(sandboxPath, contents, 'utf8');

	return { targetPath, sandboxPath };
}

/**
 * Sanitize adapter extension namespaces for reporter child loggers.
 *
 * @param value - Extension namespace, typically provided by the extension.
 * @return A kebab-case identifier safe for log channels.
 */
export function sanitizeNamespace(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-');
}

/**
 * Resolve the canonical output directory for adapter extension artifacts.
 *
 * When the directory does not exist, it is created to mirror the behaviour of
 * `fs.promises.mkdtemp`. Any other filesystem errors are rethrown to the
 * caller so they can surface meaningful diagnostics.
 *
 * @param outputDir - User-specified output directory.
 * @return The real path to the directory on disk.
 */
export async function resolveOutputRoot(outputDir: string): Promise<string> {
	try {
		return await fs.realpath(outputDir);
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			await fs.mkdir(outputDir, { recursive: true });
			return await fs.realpath(outputDir);
		}

		throw error;
	}
}

/**
 * Ensure queued files remain within the sandbox output directory.
 *
 * The validation walks intermediate path segments to detect symlinks that
 * could otherwise escape the intended workspace.
 *
 * @param options
 * @param options.targetPath
 * @param options.relativeTarget
 * @param options.outputRoot
 * @param options.outputDir
 * @internal
 */
export async function validateSandboxTarget(options: {
	targetPath: string;
	relativeTarget: string;
	outputRoot: string;
	outputDir: string;
}): Promise<void> {
	const { targetPath, relativeTarget, outputRoot, outputDir } = options;
	const segments = relativeTarget.split(path.sep).filter(Boolean);
	let current = outputDir;

	for (let index = 0; index < segments.length - 1; index += 1) {
		current = path.join(current, segments[index]!);
		const stat = await safeLstat(current);
		if (!stat) {
			break;
		}

		if (stat.isSymbolicLink()) {
			await assertWithinOutput(await fs.realpath(current), outputRoot);
		}
	}

	const existing = await safeLstat(targetPath);
	if (existing?.isSymbolicLink()) {
		await assertWithinOutput(await fs.realpath(targetPath), outputRoot);
	}
}

/**
 * Perform an `fs.lstat` returning `null` when the entry is missing.
 *
 * @param filePath - Path to inspect.
 * @return The stat result or `null` if the file does not exist.
 */
export async function safeLstat(filePath: string): Promise<Stats | null> {
	try {
		return await fs.lstat(filePath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

/**
 * Assert that the resolved path resides inside the sandbox output root.
 *
 * @param resolvedPath - Real path produced by `fs.realpath`.
 * @param root         - Root directory that must contain the resolved path.
 * @throws Error when the path escapes the output directory.
 */
export async function assertWithinOutput(
	resolvedPath: string,
	root: string
): Promise<void> {
	if (isWithinRoot(resolvedPath, root)) {
		return;
	}

	throw new WPKernelError('DeveloperError', {
		message: `Adapter extensions must not escape ${root}. Received: ${resolvedPath}`,
		context: { resolvedPath, root },
	});
}

/**
 * Determine whether a candidate path is located within a root directory.
 *
 * @param candidate - Path to inspect.
 * @param root      - Root directory that must contain the candidate.
 */
export function isWithinRoot(candidate: string, root: string): boolean {
	const relative = path.relative(root, candidate);
	return (
		relative === '' ||
		(!relative.startsWith('..') && !path.isAbsolute(relative))
	);
}

const OMIT_FUNCTION = Symbol('omit-function');

/**
 * Deeply clone an arbitrary value, removing function references.
 *
 * Adapter extensions receive an IR snapshot that should be serialisable. The
 * helper strips functions while preserving object/array identity, including
 * circular references.
 *
 * @param value
 * @param seen
 * @internal
 */
export function stripFunctions(
	value: unknown,
	seen = new WeakMap<object, unknown>()
): unknown {
	if (typeof value === 'function') {
		return OMIT_FUNCTION;
	}

	if (Array.isArray(value)) {
		return stripArray(value, seen);
	}

	if (isPlainObject(value)) {
		return stripObject(value, seen);
	}

	return value;
}

function stripArray(
	value: unknown[],
	seen: WeakMap<object, unknown>
): unknown[] {
	const existing = seen.get(value);
	if (existing) {
		return existing as unknown[];
	}

	const result: unknown[] = [];
	seen.set(value, result);

	for (const entry of value) {
		const next = stripFunctions(entry, seen);
		if (next !== OMIT_FUNCTION) {
			result.push(next);
		}
	}

	return result;
}

function stripObject(
	value: Record<string, unknown>,
	seen: WeakMap<object, unknown>
): Record<string, unknown> {
	const existing = seen.get(value);
	if (existing) {
		return existing as Record<string, unknown>;
	}

	const result: Record<string, unknown> = {};
	seen.set(value, result);

	for (const [key, entry] of Object.entries(value)) {
		const next = stripFunctions(entry, seen);
		if (next !== OMIT_FUNCTION) {
			result[key] = next;
		}
	}

	return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Convert arbitrary thrown values into a serialisable error payload.
 *
 * @param error - Value thrown by an adapter extension.
 * @return Normalised error metadata for logging.
 */
export function serialiseError(error: unknown): Record<string, unknown> {
	if (WPKernelError.isWPKernelError(error)) {
		return {
			code: error.code,
			message: error.message,
			context: error.context,
			data: error.data,
		};
	}

	if (error instanceof Error) {
		return {
			message: error.message,
			stack: error.stack,
		};
	}

	return { message: String(error) };
}

/**
 * Transform thrown values into `Error` instances.
 *
 * @param error - Unknown value thrown by an adapter extension.
 * @return An error instance suitable for propagation to callers.
 */
export function normaliseError(error: unknown): Error {
	if (WPKernelError.isWPKernelError(error)) {
		return error;
	}

	if (error instanceof Error) {
		return error;
	}

	return new WPKernelError('UnknownError', { message: String(error) });
}

/**
 * Validate that an adapter extension adheres to the expected contract.
 *
 * @param extension - Extension instance returned from a factory.
 * @throws Error when the extension is malformed.
 */
export function assertValidExtension(
	extension: AdapterExtension | undefined | null
): asserts extension is AdapterExtension {
	if (!extension) {
		throw new WPKernelError('DeveloperError', {
			message: 'Invalid adapter extension returned from factory.',
		});
	}

	if (typeof extension.name !== 'string' || extension.name.trim() === '') {
		throw new WPKernelError('DeveloperError', {
			message: 'Adapter extensions must provide a non-empty name.',
		});
	}

	if (typeof extension.apply !== 'function') {
		throw new WPKernelError('DeveloperError', {
			message: 'Adapter extensions must define an apply() function.',
		});
	}
}

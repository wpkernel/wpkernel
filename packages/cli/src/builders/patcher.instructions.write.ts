import { WPKernelError } from '@wpkernel/core/error';
import fs from 'node:fs/promises';
import path from 'path';
import type { BuilderOutput } from '../runtime';
import type { Workspace } from '../workspace';
import { normalisePath } from './patcher.paths';
import {
	type PatchInstruction,
	type PatchManifest,
	type ProcessDeleteInstructionOptions,
	type PatchRecord,
} from './types';
import { type BuilderApplyOptions } from '../runtime/types';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const execFileAsync = promisify(execFile);

export interface ApplyProcessWriteOptions {
	readonly workspace: Workspace;
	readonly instruction: Exclude<PatchInstruction, { action: 'delete' }>;
	readonly manifest: PatchManifest;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly baseRoot: string;
}

export interface RestoreTargetOptions {
	readonly currentOriginal: string | null;
	readonly incoming: string;
	readonly file: string;
	readonly basePath: string;
	readonly workspace: Workspace;
	readonly output: BuilderOutput;
	readonly manifest: PatchManifest;
	readonly description?: string;
	readonly reporter: BuilderApplyOptions['reporter'];
}

async function writeTempMergeFile(
	workspace: Workspace,
	scope: string,
	relativePath: string,
	contents: string
): Promise<string> {
	const base = await workspace.tmpDir(scope);
	const safeRelative = normalisePath(relativePath) || 'patched-file';
	const absolute = path.join(base, safeRelative);
	await fs.mkdir(path.dirname(absolute), { recursive: true });
	await fs.writeFile(absolute, contents);
	return absolute;
}

export async function applyWrite({
	workspace,
	instruction,
	manifest,
	output,
	reporter,
}: ApplyProcessWriteOptions): Promise<void> {
	const file = normalisePath(instruction.file);
	const basePath = normalisePath(instruction.base);
	const incomingPath = normalisePath(instruction.incoming);
	const description = instruction.description;

	const base = (await workspace.readText(basePath)) ?? '';
	const incoming = await workspace.readText(incomingPath);

	if (!file) {
		reporter.warn('createPatcher: skipping instruction with empty file.', {
			base: basePath,
			incoming: incomingPath,
		});
		recordPatchResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: {
				reason: 'empty-target',
			},
		});
		return;
	}

	if (incoming === null) {
		reporter.warn('createPatcher: incoming file missing.', {
			file,
			source: incomingPath,
		});
		recordPatchResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: {
				reason: 'missing-incoming',
			},
		});
		return;
	}

	const currentOriginal = await workspace.readText(file);
	if (
		await restoreTargetIfMissing({
			currentOriginal,
			incoming,
			file,
			basePath,
			workspace,
			output,
			manifest,
			description,
			reporter,
		})
	) {
		return;
	}
	const current = currentOriginal ?? '';

	if (current === incoming) {
		reporter.debug('createPatcher: target already up-to-date.', { file });
		recordPatchResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: {
				reason: 'no-op',
			},
		});
		return;
	}

	const { status, result } = await mergeWithGitThreeWay(
		workspace,
		file,
		base,
		current,
		incoming
	);

	await workspace.write(file, result, { ensureDir: true });
	await queueWorkspaceFile(workspace, output, file);

	if (status === 'clean') {
		await workspace.write(basePath, incoming, { ensureDir: true });
		await queueWorkspaceFile(workspace, output, basePath);
	}

	recordPatchResult(manifest, {
		file,
		status: status === 'clean' ? 'applied' : 'conflict',
		description,
	});

	if (status === 'conflict') {
		reporter.warn('createPatcher: merge conflict detected.', {
			file,
		});
		return;
	}

	reporter.debug('createPatcher: patch applied.', { file });
}

export async function applyDeleteInstruction({
	workspace,
	instruction,
	manifest,
	reporter,
	deletedFiles,
	skippedDeletions,
	baseRoot,
}: ProcessDeleteInstructionOptions): Promise<void> {
	const file = normalisePath(instruction.file);
	const description = instruction.description;

	if (!file) {
		reporter.warn(
			'createPatcher: skipping deletion with empty file target.'
		);
		recordPatchResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: { reason: 'empty-target', action: 'delete' },
		});
		skippedDeletions.push({ file, reason: 'empty-target' });
		return;
	}

	const basePath = path.posix.join(baseRoot, file);
	const [baseContents, currentContents] = await Promise.all([
		workspace.readText(basePath),
		workspace.readText(file),
	]);

	if (!baseContents) {
		reporter.debug(
			'createPatcher: base snapshot missing, skipping deletion.',
			{
				file,
				base: basePath,
			}
		);
		recordPatchResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: {
				reason: 'missing-base',
				action: 'delete',
				base: basePath,
			},
		});
		skippedDeletions.push({ file, reason: 'missing-base' });
		return;
	}

	if (currentContents === null) {
		reporter.debug('createPatcher: deletion target already absent.', {
			file,
		});
		recordPatchResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: { reason: 'missing-target', action: 'delete' },
		});
		skippedDeletions.push({ file, reason: 'missing-target' });
		return;
	}

	if (currentContents !== baseContents) {
		reporter.info(
			'createPatcher: detected manual changes, skipping shim deletion.',
			{ file }
		);
		recordPatchResult(manifest, {
			file,
			status: 'skipped',
			description,
			details: { reason: 'modified-target', action: 'delete' },
		});
		skippedDeletions.push({ file, reason: 'modified-target' });
		return;
	}

	await workspace.rm(file);
	deletedFiles.push(file);
	recordPatchResult(manifest, {
		file,
		status: 'applied',
		description,
		details: { action: 'delete' },
	});
	reporter.debug('createPatcher: removed file via deletion instruction.', {
		file,
	});
}

export async function restoreTargetIfMissing({
	currentOriginal,
	incoming,
	file,
	basePath,
	workspace,
	output,
	manifest,
	description,
	reporter,
}: RestoreTargetOptions): Promise<boolean> {
	const targetMissingOrEmpty =
		currentOriginal === null || currentOriginal.trim().length === 0;
	if (!targetMissingOrEmpty || incoming.trim().length === 0) {
		return false;
	}

	await workspace.write(file, incoming, { ensureDir: true });
	await queueWorkspaceFile(workspace, output, file);

	await workspace.write(basePath, incoming, { ensureDir: true });
	await queueWorkspaceFile(workspace, output, basePath);

	recordPatchResult(manifest, {
		file,
		status: 'applied',
		description,
	});
	reporter.debug(
		'createPatcher: target missing or empty, restored from incoming.',
		{ file }
	);
	return true;
}

export async function mergeWithGitThreeWay(
	workspace: Workspace,
	target: string,
	base: string,
	current: string,
	incoming: string
): Promise<{ status: 'clean' | 'conflict'; result: string }> {
	const safeName = target.replace(/[^a-zA-Z0-9.-]/g, '-');
	const baseFile = await writeTempMergeFile(
		workspace,
		`patcher-base-${safeName}-`,
		target,
		base
	);
	const currentFile = await writeTempMergeFile(
		workspace,
		`patcher-current-${safeName}-`,
		target,
		current
	);
	const incomingFile = await writeTempMergeFile(
		workspace,
		`patcher-incoming-${safeName}-`,
		target,
		incoming
	);

	try {
		const { stdout } = await execFileAsync(
			'git',
			[
				'merge-file',
				'--stdout',
				'--diff3',
				currentFile,
				baseFile,
				incomingFile,
			],
			{
				encoding: 'utf8',
			}
		);
		const result = await resolveMergeResult(stdout, currentFile);
		return { status: 'clean', result };
	} catch (error) {
		const execError = error as NodeJS.ErrnoException & {
			code?: number | string;
			stdout?: string;
			stderr?: string;
		};

		const isMergeConflict =
			(typeof execError.code === 'number' && execError.code === 1) ||
			(typeof execError.code === 'string' && execError.code === '1');

		if (isMergeConflict) {
			const result = await resolveMergeResult(
				execError.stdout,
				currentFile
			);
			return { status: 'conflict', result };
		}

		/* istanbul ignore next - defensive logging for unexpected git failures */
		throw new WPKernelError('DeveloperError', {
			message: 'git merge-file failed while computing patch.',
			context: {
				file: target,
				code: execError.code,
				stderr: execError.stderr,
			},
		});
	}
}
export async function queueWorkspaceFile(
	workspace: Workspace,
	output: BuilderOutput,
	file: string
): Promise<void> {
	const contents = await workspace.read(file);
	if (!contents) {
		/* istanbul ignore next - queue helper defends against deleted targets */
		return;
	}

	output.queueWrite({
		file,
		contents,
	});
}
export function recordPatchResult(
	manifest: PatchManifest,
	record: PatchRecord
): void {
	manifest.records.push(record);

	switch (record.status) {
		case 'applied':
			manifest.summary.applied += 1;
			break;
		case 'conflict':
			manifest.summary.conflicts += 1;
			break;
		case 'skipped':
			manifest.summary.skipped += 1;
			break;
	}
}
export async function resolveMergeResult(
	stdout: string | undefined,
	currentFile: string
): Promise<string> {
	if (typeof stdout === 'string' && stdout.length > 0) {
		return stdout;
	}

	return await fs.readFile(currentFile, 'utf8');
}

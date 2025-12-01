import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Readable, Writable } from 'node:stream';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { WPKernelError } from '@wpkernel/core/error';
import { createReporterMock as buildReporterMock } from '@cli-tests/reporter';
import { buildWorkspace } from '../filesystem';
import {
	readWorkspaceGitStatus,
	ensureCleanDirectory,
	promptConfirm,
	toWorkspaceRelative,
	__testing,
} from '../utilities';

const execFile = promisify(execFileCallback);

async function buildWorkspaceRoot(prefix: string): Promise<string> {
	return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe('workspace utilities', () => {
	describe('readWorkspaceGitStatus', () => {
		it('returns null when repository is missing', async () => {
			const root = await buildWorkspaceRoot('next-util-git-none-');
			const workspace = buildWorkspace(root);

			const status = await readWorkspaceGitStatus(workspace);

			expect(status).toBeNull();
		});

		it('reports an empty snapshot for clean repositories', async () => {
			const root = await buildWorkspaceRoot('next-util-git-clean-');
			await execFile('git', ['init'], { cwd: root });
			const workspace = buildWorkspace(root);

			const status = await readWorkspaceGitStatus(workspace);

			expect(status).toEqual([]);
		});

		it('captures untracked files as dirty entries', async () => {
			const root = await buildWorkspaceRoot('next-util-git-dirty-');
			await execFile('git', ['init'], { cwd: root });
			const workspace = buildWorkspace(root);

			const relativeFile = path.join('src', 'example.ts');
			await fs.mkdir(path.join(root, 'src'), { recursive: true });
			await fs.writeFile(
				path.join(root, relativeFile),
				'export const value = 1;\n'
			);

			const status = await readWorkspaceGitStatus(workspace);

			expect(status).not.toBeNull();
			expect(status).toHaveLength(1);
			expect(status?.[0]).toMatchObject({
				code: '??',
			});
			expect(status?.[0]?.path).toContain('src/');
			expect(status?.[0]?.raw).toContain('src/');
		});
	});

	describe('ensureCleanDirectory', () => {
		it('creates the directory when missing', async () => {
			const root = await buildWorkspaceRoot('next-util-dir-create-');
			const workspace = buildWorkspace(root);
			const reporter = buildReporterMock();
			const target = path.join('build');

			await ensureCleanDirectory({
				workspace,
				directory: target,
				reporter,
			});

			const stat = await fs.stat(path.join(root, target));
			expect(stat.isDirectory()).toBe(true);
		});

		it('skips creation when missing and create is false', async () => {
			const root = await buildWorkspaceRoot('next-util-dir-skip-create-');
			const workspace = buildWorkspace(root);

			await ensureCleanDirectory({
				workspace,
				directory: 'skip',
				create: false,
			});

			await expect(
				fs.stat(path.join(root, 'skip'))
			).rejects.toMatchObject({ code: 'ENOENT' });
		});

		it('throws when directory is not empty and force is false', async () => {
			const root = await buildWorkspaceRoot('next-util-dir-dirty-');
			const workspace = buildWorkspace(root);
			const target = path.join('build');
			await fs.mkdir(path.join(root, target), { recursive: true });
			await fs.writeFile(
				path.join(root, target, 'asset.js'),
				'console.log(1);\n'
			);

			await expect(
				ensureCleanDirectory({
					workspace,
					directory: target,
				})
			).rejects.toBeInstanceOf(WPKernelError);
		});

		it('clears directory contents when force is true', async () => {
			const root = await buildWorkspaceRoot('next-util-dir-force-');
			const workspace = buildWorkspace(root);
			const reporter = buildReporterMock();
			const target = path.join('build');
			await fs.mkdir(path.join(root, target), { recursive: true });
			await fs.writeFile(
				path.join(root, target, 'asset.js'),
				'console.log(1);\n'
			);

			await ensureCleanDirectory({
				workspace,
				directory: target,
				force: true,
				reporter,
			});

			const entries = await fs.readdir(path.join(root, target));
			expect(entries).toHaveLength(0);
			expect(reporter.info).toHaveBeenCalledWith(
				'Clearing directory contents.',
				{
					path: 'build',
				}
			);
		});

		it('returns early for empty directories without logging', async () => {
			const root = await buildWorkspaceRoot('next-util-dir-empty-');
			const workspace = buildWorkspace(root);
			const reporter = buildReporterMock();
			const target = path.join('empty-dir');
			await fs.mkdir(path.join(root, target), { recursive: true });

			await ensureCleanDirectory({
				workspace,
				directory: target,
				reporter,
			});

			expect(reporter.info).not.toHaveBeenCalled();
		});

		it('throws when the target is not a directory', async () => {
			const root = await buildWorkspaceRoot('next-util-dir-file-');
			const workspace = buildWorkspace(root);
			const reporter = buildReporterMock();
			const target = path.join('not-a-directory');
			await fs.writeFile(path.join(root, target), '');

			await expect(
				ensureCleanDirectory({
					workspace,
					directory: target,
					reporter,
				})
			).rejects.toMatchObject({ code: 'ValidationError' });
		});
	});

	describe('promptConfirm', () => {
		it('resolves to true when user answers yes', async () => {
			const input = Readable.from(['y\n']);
			const outputChunks: string[] = [];
			const output = new Writable({
				write(chunk, _encoding, callback) {
					outputChunks.push(chunk.toString());
					callback();
				},
			});

			const result = await promptConfirm({
				message: 'Proceed?',
				input,
				output,
			});

			expect(result).toBe(true);
			expect(outputChunks.join('')).toContain('Proceed?');
		});

		it('uses the default value when input is empty', async () => {
			const input = Readable.from(['\n']);
			const output = new Writable({
				write(_chunk, _encoding, callback) {
					callback();
				},
			});

			const result = await promptConfirm({
				message: 'Proceed?',
				defaultValue: true,
				input,
				output,
			});

			expect(result).toBe(true);
		});

		it('resolves to false when user answers no', async () => {
			const input = Readable.from(['No\n']);
			const output = new Writable({
				write(_chunk, _encoding, callback) {
					callback();
				},
			});

			const result = await promptConfirm({
				message: 'Proceed?',
				defaultValue: true,
				input,
				output,
			});

			expect(result).toBe(false);
		});

		it('falls back to false when input is invalid without a default', async () => {
			const input = Readable.from(['maybe\n']);
			const output = new Writable({
				write(_chunk, _encoding, callback) {
					callback();
				},
			});

			const result = await promptConfirm({
				message: 'Proceed?',
				input,
				output,
			});

			expect(result).toBe(false);
		});
	});

	describe('toWorkspaceRelative', () => {
		it('normalises separators and handles root path', async () => {
			const root = await buildWorkspaceRoot('next-util-relative-');
			const workspace = buildWorkspace(root);
			const absolute = path.join(root, 'nested', 'file.txt');
			const relative = toWorkspaceRelative(workspace, absolute);

			expect(relative).toBe('nested/file.txt');
			expect(toWorkspaceRelative(workspace, root)).toBe('.');
		});
	});

	describe('__testing utilities', () => {
		it('formats prompts with appropriate suffixes', () => {
			expect(__testing.formatPrompt('Question?', undefined)).toBe(
				'Question? (y/n) '
			);
			expect(__testing.formatPrompt('Question?', true)).toBe(
				'Question? (Y/n) '
			);
			expect(__testing.formatPrompt('Question?', false)).toBe(
				'Question? (y/N) '
			);
		});

		it('parses boolean answers with fallbacks', () => {
			expect(__testing.parseBooleanAnswer('yes', undefined)).toBe(true);
			expect(__testing.parseBooleanAnswer('No', true)).toBe(false);
			expect(__testing.parseBooleanAnswer('  ', true)).toBe(true);
			expect(__testing.parseBooleanAnswer('maybe', undefined)).toBe(
				false
			);
		});

		it('detects missing git repositories from diverse errors', () => {
			expect(
				__testing.isGitRepositoryMissing('fatal: not a git repository')
			).toBe(true);
			expect(
				__testing.isGitRepositoryMissing({
					message: 'fatal: not a git repository',
				})
			).toBe(true);
			expect(
				__testing.isGitRepositoryMissing({
					stderr: 'fatal: not a git repository',
				})
			).toBe(true);
			expect(__testing.isGitRepositoryMissing(null)).toBe(false);
		});

		it('normalises directories relative to the workspace root', async () => {
			const root = await buildWorkspaceRoot('next-util-normalise-');
			const workspace = buildWorkspace(root);

			expect(__testing.normaliseDirectory(root, workspace)).toBe(root);
			expect(__testing.normaliseDirectory('nested', workspace)).toBe(
				path.join(root, 'nested')
			);
		});
	});
});

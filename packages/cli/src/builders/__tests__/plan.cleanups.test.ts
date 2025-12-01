import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import type { GenerationManifestDiff } from '../../apply/manifest';
import { collectDeletionInstructions } from '../plan.cleanups';
import { buildWorkspace } from '../../workspace';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';
import { createReporterMock } from '@cli-tests/reporter';

describe('plan.cleanups', () => {
	it('deletes removed shims when base matches target', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-cleanups-'));
		const layout = loadTestLayoutSync();
		const reporter = createReporterMock();
		try {
			const shimPath = 'inc/Rest/JobsController.php';
			const basePath = path.join(
				root,
				layout.resolve('plan.base'),
				shimPath
			);
			await fs.mkdir(path.dirname(basePath), { recursive: true });
			const contents = '<?php // base';
			await fs.writeFile(basePath, contents);
			const targetPath = path.join(root, shimPath);
			await fs.mkdir(path.dirname(targetPath), { recursive: true });
			await fs.writeFile(targetPath, contents);

			const diff: GenerationManifestDiff = {
				removed: [
					{
						resource: 'jobs',
						shims: [shimPath],
						generated: [],
					},
				],
			};

			const workspace = buildWorkspace(root);
			const { instructions, skippedDeletions } =
				await collectDeletionInstructions({
					diff,
					workspace,
					reporter,
					planBasePath: layout.resolve('plan.base'),
				});

			expect(skippedDeletions).toEqual([]);
			expect(instructions).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						action: 'delete',
						file: shimPath,
					}),
				])
			);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it('skips deletions when base snapshots or targets are missing', async () => {
		const reporter = createReporterMock();
		const layout = loadTestLayoutSync();
		const shimPath = 'inc/Rest/UsersController.php';
		const planBasePath = layout.resolve('plan.base');
		const reads: Record<string, string | null> = {
			[path.posix.join(planBasePath, shimPath)]: null,
			[shimPath]: '<?php // target',
		};
		const workspace = {
			readText: jest.fn(
				async (file?: string) => reads[file ?? ''] ?? null
			),
		} as unknown as ReturnType<typeof buildWorkspace>;

		const diff: GenerationManifestDiff = {
			removed: [
				{
					resource: 'users',
					shims: [shimPath],
					generated: [],
				},
			],
		};

		const result = await collectDeletionInstructions({
			diff,
			workspace,
			reporter,
			planBasePath,
		});

		expect(result.instructions).toEqual([]);
		expect(result.skippedDeletions).toEqual([
			expect.objectContaining({
				file: shimPath,
				reason: 'missing-base',
			}),
		]);
	});

	it('skips deletions when targets are missing or modified', async () => {
		const reporter = createReporterMock();
		const layout = loadTestLayoutSync();
		const shimPath = 'inc/Rest/AuthorsController.php';
		const planBasePath = layout.resolve('plan.base');
		const reads: Record<string, string | null> = {
			[path.posix.join(planBasePath, shimPath)]: '<?php // base',
			[shimPath]: null,
		};
		const workspace = {
			readText: jest.fn(
				async (file?: string) => reads[file ?? ''] ?? null
			),
		} as unknown as ReturnType<typeof buildWorkspace>;

		const diff: GenerationManifestDiff = {
			removed: [
				{
					resource: 'authors',
					shims: [shimPath, 'inc/Rest/EditorsController.php'],
					generated: [],
				},
			],
		};

		const result = await collectDeletionInstructions({
			diff,
			workspace,
			reporter,
			planBasePath,
		});

		expect(result.instructions).toEqual([]);
		expect(result.skippedDeletions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					file: shimPath,
					reason: 'missing-target',
				}),
			])
		);

		reads[shimPath] = '<?php // modified';
		const modifiedResult = await collectDeletionInstructions({
			diff,
			workspace,
			reporter,
			planBasePath,
		});

		expect(modifiedResult.instructions).toEqual([]);
		expect(modifiedResult.skippedDeletions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					file: shimPath,
					reason: 'modified-target',
				}),
			])
		);
	});
});

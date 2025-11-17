import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import type { GenerationManifestDiff } from '../../apply/manifest';
import { collectDeletionInstructions } from '../plan.cleanups';
import { buildWorkspace } from '../../workspace';
import { loadTestLayoutSync } from '../../tests/layout.test-support';

const reporter = {
	info: jest.fn(),
	debug: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe('plan.cleanups', () => {
	it('deletes removed shims when base matches target', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-cleanups-'));
		const layout = loadTestLayoutSync();
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
				added: [],
				unchanged: [],
				changed: [],
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
});

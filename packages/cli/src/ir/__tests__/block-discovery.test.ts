import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { WPKernelError } from '@wpkernel/core/error';
import { discoverBlocks } from '../shared/block-discovery';

describe('block discovery (layout-scoped)', () => {
	it('returns empty when blocks root is missing', async () => {
		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-blocks-')
		);
		try {
			const blocks = await discoverBlocks(workspaceRoot, 'src/blocks');
			expect(blocks).toEqual([]);
		} finally {
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it('discovers blocks within the configured root', async () => {
		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-blocks-')
		);
		try {
			const blockDir = path.join(workspaceRoot, 'src/blocks/example');
			await fs.mkdir(blockDir, { recursive: true });
			await fs.writeFile(
				path.join(blockDir, 'block.json'),
				JSON.stringify({ name: 'plugin/example', title: 'Example' }),
				'utf8'
			);
			await fs.writeFile(
				path.join(blockDir, 'render.php'),
				'<?php // render'
			);

			const blocks = await discoverBlocks(workspaceRoot, 'src/blocks');

			expect(blocks).toEqual([
				expect.objectContaining({
					key: 'plugin/example',
					directory: path.relative(workspaceRoot, blockDir),
					manifestSource: path.relative(
						workspaceRoot,
						path.join(blockDir, 'block.json')
					),
					hasRender: true,
				}),
			]);
		} finally {
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it('throws when duplicate block keys are discovered', async () => {
		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-blocks-')
		);
		try {
			const first = path.join(workspaceRoot, 'src/blocks/one');
			const second = path.join(workspaceRoot, 'src/blocks/two');
			for (const dir of [first, second]) {
				await fs.mkdir(dir, { recursive: true });
				await fs.writeFile(
					path.join(dir, 'block.json'),
					JSON.stringify({ name: 'plugin/duplicate' }),
					'utf8'
				);
			}

			await expect(
				discoverBlocks(workspaceRoot, 'src/blocks')
			).rejects.toBeInstanceOf(WPKernelError);
		} finally {
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it('throws when manifest JSON is invalid', async () => {
		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-blocks-')
		);
		try {
			const blockDir = path.join(workspaceRoot, 'src/blocks/example');
			await fs.mkdir(blockDir, { recursive: true });
			await fs.writeFile(path.join(blockDir, 'block.json'), 'not json');

			await expect(
				discoverBlocks(workspaceRoot, 'src/blocks')
			).rejects.toBeInstanceOf(WPKernelError);
		} finally {
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
	});
});

import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildWorkspace } from '../../workspace';
import {
	collectBlockSurfaceInstructions,
	collectBlockDeletionInstructions,
} from '../plan.blocks';

import { makeIr } from '@cli-tests/ir.test-support';
import { buildEmptyGenerationState } from '../../apply/manifest';

function makeOptions(root: string) {
	const workspace = buildWorkspace(root);
	const reporter = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
	const ir = makeIr();
	const blockGenerated = ir.artifacts.blockRoots.generated;
	const blockApplied = ir.artifacts.blockRoots.applied;
	ir.artifacts.blocks = {
		'demo-block': {
			key: 'demo',
			appliedDir: blockApplied,
			generatedDir: blockGenerated,
			jsonPath: path.posix.join(blockGenerated, 'demo', 'block.json'),
			tsEntry: path.posix.join(blockGenerated, 'demo', 'index.tsx'),
			tsView: path.posix.join(blockGenerated, 'demo', 'view.tsx'),
			tsHelper: path.posix.join(blockGenerated, 'demo', 'helper.ts'),
			mode: 'js',
			phpRenderPath: undefined,
		},
	};
	const options = {
		reporter,
		input: {
			phase: 'generate' as const,
			options: {
				namespace: ir.meta.namespace,
				origin: ir.meta.origin,
				sourcePath: path.join(root, 'wpk.config.ts'),
			},
			ir,
		},
		context: {
			workspace,
			reporter,
			phase: 'generate' as const,
			generationState: buildEmptyGenerationState(),
		},
		output: { actions: [], queueWrite: jest.fn() },
	};
	return { options, ir };
}

describe('plan.blocks', () => {
	it('surfaces generated blocks into applied path', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-blocks-'));
		try {
			const { ir, options } = makeOptions(root);
			const generated = path.join(
				root,
				ir.artifacts.blockRoots.generated,
				'demo'
			);
			await fs.mkdir(generated, { recursive: true });
			await fs.writeFile(path.join(generated, 'index.tsx'), '// block');

			const { instructions } = await collectBlockSurfaceInstructions({
				options,
			});

			expect(instructions).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						file: path.posix.join(
							ir.artifacts.blockRoots.applied,
							'demo/index.tsx'
						),
						base: path.posix.join(
							ir.artifacts.plan.planBaseDir,
							path.posix.join(
								ir.artifacts.blockRoots.applied,
								'demo/index.tsx'
							)
						),
						incoming: path.posix.join(
							ir.artifacts.plan.planIncomingDir,
							path.posix.join(
								ir.artifacts.blockRoots.applied,
								'demo/index.tsx'
							)
						),
					}),
				])
			);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it('returns delete instruction for orphaned blocks when base matches', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-blocks-'));
		try {
			const { ir, options } = makeOptions(root);
			const applied = path.join(
				root,
				ir.artifacts.blockRoots.applied,
				'demo'
			);
			const base = path.join(
				root,
				ir.artifacts.plan.planBaseDir,
				path.posix.join(ir.artifacts.blockRoots.applied, 'demo')
			);
			await fs.mkdir(applied, { recursive: true });
			await fs.mkdir(base, { recursive: true });
			const contents = '// orphan';
			await fs.writeFile(path.join(applied, 'orphan.tsx'), contents);
			await fs.writeFile(path.join(base, 'orphan.tsx'), contents);

			const { instructions, skippedDeletions } =
				await collectBlockDeletionInstructions({
					options,
					generatedSuffixes: new Set(),
				});

			expect(skippedDeletions).toEqual([]);
			expect(instructions).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						action: 'delete',
						file: path.posix.join(
							ir.artifacts.blockRoots.applied,
							'demo/orphan.tsx'
						),
					}),
				])
			);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
});

import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildWorkspace } from '../../workspace';
import {
	collectBlockSurfaceInstructions,
	collectBlockDeletionInstructions,
} from '../plan.blocks';

import { makeIr } from '../../tests/ir.test-support';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { loadTestLayoutSync } from '../../tests/layout.test-support';

function makeOptions(root: string) {
	const workspace = buildWorkspace(root);
	const reporter = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};
	const layout = loadTestLayoutSync();
	const ir = { ...makeIr(), layout };
	return {
		reporter,
		input: {
			phase: 'generate' as const,
			options: {
				config: ir.config,
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
	} as unknown as Parameters<typeof collectBlockSurfaceInstructions>[0];
}

describe('plan.blocks', () => {
	it('surfaces generated blocks into applied path', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-blocks-'));
		const layout = loadTestLayoutSync();
		try {
			const generated = path.join(
				root,
				layout.resolve('blocks.generated'),
				'demo'
			);
			await fs.mkdir(generated, { recursive: true });
			await fs.writeFile(path.join(generated, 'index.tsx'), '// block');

			const { instructions } = await collectBlockSurfaceInstructions({
				options: makeOptions(root),
			});

			expect(instructions).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						file: path.posix.join(
							layout.resolve('blocks.applied'),
							'demo/index.tsx'
						),
						base: path.posix.join(
							layout.resolve('plan.base'),
							'src/blocks/demo/index.tsx'
						),
						incoming: path.posix.join(
							layout.resolve('plan.incoming'),
							'src/blocks/demo/index.tsx'
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
		const layout = loadTestLayoutSync();
		try {
			const applied = path.join(
				root,
				layout.resolve('blocks.applied'),
				'demo'
			);
			const base = path.join(
				root,
				layout.resolve('plan.base'),
				'src/blocks/demo'
			);
			await fs.mkdir(applied, { recursive: true });
			await fs.mkdir(base, { recursive: true });
			const contents = '// orphan';
			await fs.writeFile(path.join(applied, 'orphan.tsx'), contents);
			await fs.writeFile(path.join(base, 'orphan.tsx'), contents);

			const { instructions, skippedDeletions } =
				await collectBlockDeletionInstructions({
					options: makeOptions(root),
					generatedSuffixes: new Set(),
				});

			expect(skippedDeletions).toEqual([]);
			expect(instructions).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						action: 'delete',
						file: 'src/blocks/demo/orphan.tsx',
					}),
				])
			);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
});

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildWorkspace } from '../../workspace';
import {
	collectUiDeletionInstructions,
	collectUiSurfaceInstructions,
} from '../plan.ui';
import type { GenerationManifest } from '../../apply/manifest';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';

function makeBuilderOptions(root: string) {
	const workspace = buildWorkspace(root);
	const reporter = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};
	const layout = loadTestLayoutSync();

	const builderOptions = {
		reporter,
		context: {
			workspace,
			reporter,
			phase: 'generate' as const,
			generationState: buildEmptyGenerationState(),
		},
		input: {
			phase: 'generate' as const,
			options: {
				config: {} as never,
				namespace: 'Acme\\Jobs',
				origin: 'demo',
				sourcePath: path.join(root, 'wpk.config.ts'),
			},
			ir: {
				layout,
			} as any,
		},
		output: { actions: [], queueWrite: jest.fn() },
	};

	return { builderOptions, layout };
}

describe('plan.ui', () => {
	it('surfaces generated UI assets into the applied workspace', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-ui-'));
		const { layout, builderOptions } = makeBuilderOptions(root);
		try {
			const generatedDir = path.join(
				root,
				layout.resolve('ui.generated')
			);
			const appliedPath = path.posix.join(
				layout.resolve('ui.applied'),
				'index.tsx'
			);
			await fs.mkdir(generatedDir, { recursive: true });
			await fs.writeFile(
				path.join(generatedDir, 'index.tsx'),
				'// generated ui'
			);

			const manifest: GenerationManifest = {
				ui: {
					files: [
						{
							generated: path.posix.join(
								layout.resolve('ui.generated'),
								'index.tsx'
							),
							applied: appliedPath,
						},
					],
				},
			} as GenerationManifest;

			const { instructions, generatedSuffixes } =
				await collectUiSurfaceInstructions({
					options: builderOptions,
					manifest,
				});

			expect(instructions).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						action: 'write',
						file: appliedPath,
						base: path.posix.join(
							layout.resolve('plan.base'),
							appliedPath
						),
						incoming: path.posix.join(
							layout.resolve('plan.incoming'),
							appliedPath
						),
					}),
				])
			);
			expect(generatedSuffixes.has('index.tsx')).toBe(true);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it('produces deletion instructions for orphaned UI assets', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-ui-'));
		const { layout, builderOptions } = makeBuilderOptions(root);
		try {
			const appliedDir = path.join(root, layout.resolve('ui.applied'));
			const baseDir = path.join(root, layout.resolve('plan.base'));
			await fs.mkdir(appliedDir, { recursive: true });
			await fs.mkdir(baseDir, { recursive: true });

			const target = path.posix.join(
				layout.resolve('ui.applied'),
				'stale.tsx'
			);
			const contents = '// stale';
			await fs.writeFile(path.join(root, target), contents);
			await fs.mkdir(
				path.join(root, layout.resolve('plan.base'), 'src/ui'),
				{
					recursive: true,
				}
			);
			await fs.writeFile(
				path.join(root, layout.resolve('plan.base'), target),
				contents
			);

			const { instructions, skippedDeletions } =
				await collectUiDeletionInstructions({
					options: builderOptions,
					generatedSuffixes: new Set(),
				});

			expect(skippedDeletions).toEqual([]);
			expect(instructions).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						action: 'delete',
						file: target,
					}),
				])
			);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
});

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
import { makeIr, buildTestArtifactsPlan } from '@cli-tests/ir.test-support';

function makeBuilderOptions(root: string) {
	const workspace = buildWorkspace(root);
	const reporter = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
	const layout = loadTestLayoutSync();
	const artifacts = buildTestArtifactsPlan(layout);
	artifacts.plan = {
		planManifestPath: layout.resolve('plan.manifest'),
		planBaseDir: layout.resolve('plan.base'),
		planIncomingDir: layout.resolve('plan.incoming'),
		patchManifestPath: layout.resolve('patch.manifest'),
	};
	const ir = makeIr({ layout, artifacts });

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
				namespace: 'Acme\\Jobs',
				origin: 'demo',
				sourcePath: path.join(root, 'wpk.config.ts'),
			},
			ir,
		},
		output: { actions: [], queueWrite: jest.fn() },
	};

	return { builderOptions, layout, ir };
}

describe('plan.ui', () => {
	it('surfaces generated UI assets into the applied workspace', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-ui-'));
		const { builderOptions, ir } = makeBuilderOptions(root);
		try {
			const generatedDir = path.join(
				root,
				ir.artifacts.runtime.runtime.generated
			);
			const generatedPath = path.posix.join(
				ir.artifacts.runtime.runtime.generated,
				'index.tsx'
			);
			const appliedPath = path.posix.join(
				ir.artifacts.runtime.runtime.applied,
				'index.tsx'
			);
			await fs.mkdir(generatedDir, { recursive: true });
			await fs.writeFile(
				path.join(generatedDir, 'index.tsx'),
				'// generated ui'
			);

			const manifest: GenerationManifest = {
				version: 1,
				resources: {},
				runtime: {
					handle: 'ui-handle',
					files: [
						{
							generated: generatedPath,
							applied: appliedPath,
						},
					],
				},
			};

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
							ir.artifacts.plan.planBaseDir,
							appliedPath
						),
						incoming: path.posix.join(
							ir.artifacts.plan.planIncomingDir,
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
		const { builderOptions, ir } = makeBuilderOptions(root);
		try {
			const appliedDir = path.join(root, 'ui/applied');
			const baseDir = path.join(root, ir.artifacts.plan.planBaseDir);
			await fs.mkdir(appliedDir, { recursive: true });
			await fs.mkdir(baseDir, { recursive: true });

			const target = path.posix.join(
				ir.artifacts.runtime.runtime.applied,
				'stale.tsx'
			);
			const contents = '// stale';
			await fs.mkdir(path.join(root, path.dirname(target)), {
				recursive: true,
			});
			await fs.writeFile(path.join(root, target), contents);
			await fs.mkdir(
				path.dirname(
					path.join(root, ir.artifacts.plan.planBaseDir, target)
				),
				{
					recursive: true,
				}
			);
			await fs.writeFile(
				path.join(root, ir.artifacts.plan.planBaseDir, target),
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

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createTsConfigBuilder } from '../tsconfig';
import { buildWorkspace } from '../../workspace';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { makeIr, buildTestArtifactsPlan } from '@cli-tests/ir.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';

function makeApplyOptions(root: string) {
	const workspace = buildWorkspace(root);
	const reporter = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
	const ir = makeIr({
		resources: [makeResource({ id: 'res:job', name: 'job' }) as any],
	});
	const artifacts = buildTestArtifactsPlan(ir.layout);
	artifacts.surfaces = {
		'res:job': {
			resource: 'job',
			appDir: path.join(root, 'src/ui'),
			generatedAppDir: path.join(root, 'src/ui/generated'),
			pagePath: path.join(root, 'src/ui/page.tsx'),
			formPath: path.join(root, 'src/ui/form.tsx'),
			configPath: path.join(root, 'src/ui/config.tsx'),
		},
	};
	artifacts.blocks = {
		blk1: {
			key: 'demo/block',
			appliedDir: path.join(root, 'src/blocks'),
			generatedDir: path.join(root, 'generated/blocks'),
			jsonPath: path.join(root, 'generated/blocks/block.json'),
			tsEntry: path.join(root, 'generated/blocks/index.ts'),
			tsView: path.join(root, 'generated/blocks/view.tsx'),
			tsHelper: path.join(root, 'generated/blocks/helper.ts'),
			mode: 'js',
		},
	};
	artifacts.php.controllers = {
		'res:job': {
			appliedPath: path.join(root, 'inc/Rest/JobController.php'),
			generatedPath: path.join(root, 'generated/Rest/JobController.php'),
			className: 'JobController',
			namespace: 'Demo\\Rest',
		},
	};
	artifacts.bundler.configPath = path.join(
		root,
		artifacts.bundler.configPath
	);
	ir.artifacts = artifacts;

	return {
		input: {
			phase: 'generate' as const,
			options: {
				namespace: 'Acme\\Jobs',
				origin: 'demo',
				sourcePath: path.join(root, 'wpk.config.ts'),
			},
			ir,
		},
		reporter,
		output: { actions: [], queueWrite: jest.fn() },
		context: {
			workspace,
			reporter,
			phase: 'generate' as const,
			generationState: buildEmptyGenerationState(),
		},
	};
}

describe('tsconfig builder', () => {
	it('writes a layout-aware tsconfig when generating', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-tsc-'));
		const builder = createTsConfigBuilder();
		const options = makeApplyOptions(root);
		try {
			await builder.apply(options);

			const file = path.join(root, 'tsconfig.app.json');
			const contents = JSON.parse(await fs.readFile(file, 'utf8'));

			expect(contents.include).toEqual(
				expect.arrayContaining([
					'src/ui/**/*',
					'src/blocks/**/*',
					'inc/Rest/**/*',
				])
			);
			expect(contents.compilerOptions.paths).toEqual({
				'@/*': ['src/ui/*'],
				'@/admin/*': ['src/ui/admin/*'],
				'@/resources/*': ['src/ui/resources/*'],
			});
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it('is a no-op for apply phase', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-tsc-'));
		const builder = createTsConfigBuilder();
		const options = makeApplyOptions(root);
		try {
			const applyOptions = {
				...options,
				input: { ...options.input, phase: 'apply' as const },
			};

			await builder.apply(applyOptions);

			await expect(
				fs.readFile(path.join(root, 'tsconfig.app.json'), 'utf8')
			).rejects.toBeTruthy();
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
});

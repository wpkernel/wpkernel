import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createTsConfigBuilder } from '../tsconfig';
import { buildWorkspace } from '../../workspace';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';

function makeApplyOptions(root: string) {
	const workspace = buildWorkspace(root);
	const reporter = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};
	const defaultLayout = loadTestLayoutSync();
	const layout = loadTestLayoutSync({
		overrides: {
			'ui.applied': path.join(root, 'src/ui'),
			'blocks.applied': path.join(root, 'src/blocks'),
			'controllers.applied': path.join(root, 'inc/Rest'),
			'bundler.config': path.join(
				root,
				defaultLayout.resolve('bundler.config')
			),
		},
	});

	return {
		context: {
			workspace,
			reporter,
			phase: 'generate' as const,
		},
		input: {
			phase: 'generate' as const,
			options: {
				config: {} as never,
				namespace: 'Acme\\Jobs',
				origin: 'demo',
				sourcePath: path.join(root, 'wpk.config.ts'),
			},
			ir: { layout } as any,
		},
		reporter,
		output: { actions: [], queueWrite: jest.fn() },
		layout,
	};
}

describe('tsconfig builder', () => {
	it('writes a layout-aware tsconfig when generating', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-tsc-'));
		const builder = createTsConfigBuilder();
		const options = makeApplyOptions(root);
		const { layout } = options;
		try {
			await builder.apply(options);

			const file = path.join(root, 'tsconfig.app.json');
			const contents = JSON.parse(await fs.readFile(file, 'utf8'));

			expect(contents.include).toEqual(
				expect.arrayContaining([
					`${path.relative(root, layout.resolve('ui.applied'))}/**/*`,
					`${path.relative(root, layout.resolve('blocks.applied'))}/**/*`,
					`${path.relative(root, layout.resolve('controllers.applied'))}/**/*`,
				])
			);
			expect(contents.compilerOptions.paths).toEqual({
				'@/*': [
					`${path.relative(root, layout.resolve('ui.applied'))}/*`,
				],
				'@/admin/*': [
					`${path.relative(root, layout.resolve('ui.applied'))}/admin/*`,
				],
				'@/resources/*': [
					`${path.relative(root, layout.resolve('ui.applied'))}/resources/*`,
				],
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

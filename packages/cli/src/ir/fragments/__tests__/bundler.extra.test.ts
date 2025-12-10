import { createBundlerFragment } from '../ir.bundler.core';

describe('bundler fragment (branches)', () => {
	it('throws when artifacts are missing', () => {
		const fragment = createBundlerFragment();
		const output = { assign: jest.fn() } as any;

		expect(() =>
			fragment.apply({
				input: { draft: { artifacts: null } } as any,
				output,
				context: {} as any,
				reporter: {
					debug: jest.fn(),
					info: jest.fn(),
					warn: jest.fn(),
					error: jest.fn(),
					child() {
						return this;
					},
				},
			})
		).toThrow();
	});

	it('assigns bundler plan from artifacts', () => {
		const fragment = createBundlerFragment();
		const output = { assign: jest.fn() } as any;
		const artifacts = {
			runtime: {
				entry: {
					generated: '/gen/entry.tsx',
					applied: '/app/entry.tsx',
				},
				runtime: {
					generated: '/gen/runtime.ts',
					applied: '/app/runtime.ts',
				},
				blocksRegistrarPath: '/gen/blocks/auto-register.ts',
			},
			bundler: {
				configPath: '/gen/bundler.config.json',
				assetsPath: '/gen/assets/index.asset.json',
				shimsDir: '/gen/shims',
			},
		} as any;

		fragment.apply({
			input: { draft: { artifacts } } as any,
			output,
			context: {} as any,
			reporter: {
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				child() {
					return this;
				},
			},
		});

		expect(output.assign).toHaveBeenCalledWith({
			bundler: {
				entryPath: artifacts.runtime.entry.generated,
				configPath: artifacts.bundler.configPath,
				assetsPath: artifacts.bundler.assetsPath,
				viteConfigPath: 'vite.config.ts',
			},
		});
	});
});

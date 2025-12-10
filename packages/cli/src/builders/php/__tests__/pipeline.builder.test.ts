import {
	createPhpBuilderConfigHelper,
	getPhpBuilderConfigState,
} from '../pipeline.builder';
import { createReporterMock } from '@cli-tests/reporter';
import { makeIr } from '@cli-tests/ir.test-support';

const buildOptions = (overrides: Partial<unknown> = {}) =>
	({
		namespace: 'demo-plugin',
		config: {},
		...overrides,
	}) as any;

describe('php builder pipeline config helper', () => {
	it('does nothing outside generate phase or without IR', async () => {
		const helper = createPhpBuilderConfigHelper();
		const context = { workspace: {} };
		const reporter = createReporterMock();

		await helper.apply({
			input: { phase: 'init', ir: null, options: buildOptions() },
			context,
			reporter,
			output: { queueWrite: jest.fn() },
		} as any);

		expect(getPhpBuilderConfigState(context as any)).toEqual({
			driver: undefined,
			codemods: null,
		});
	});

	it('merges builder driver options and ignores adapter config', async () => {
		const helper = createPhpBuilderConfigHelper({
			driver: {
				binary: 'base-php',
				autoloadPaths: ['/base', '/shared '],
			},
		});
		const context = { workspace: {} };
		const reporter = createReporterMock();

		await helper.apply({
			input: {
				phase: 'generate',
				ir: makeIr(),
				options: buildOptions({
					config: {
						adapters: {
							php: () => ({
								driver: {
									binary: 'adapter-php',
									autoloadPaths: ['/adapter', '/base'],
									scriptPath: 'adapter.php',
								},
								codemods: {
									files: [' file.php ', '', 42 as any],
									configurationPath: '/path/to/codemods.json',
									diagnostics: { nodeDumps: true },
									driver: {
										binary: '',
										scriptPath: 'codemod.php',
										autoloadPaths: ['/codemod', '/adapter'],
									},
								},
							}),
						},
					},
				}),
			},
			context,
			reporter,
			output: { queueWrite: jest.fn() },
		} as any);

		const state = getPhpBuilderConfigState(context as any);

		expect(state.driver).toMatchObject({
			binary: 'base-php',
			scriptPath: expect.stringContaining(
				'php-json-ast/php/pretty-print.php'
			),
			autoloadPaths: ['/base', '/shared'],
		});
		// Codemods are driven by the IR artifacts now; adapter config is ignored.
		expect(state.codemods).toBeNull();
	});

	it('uses bundled defaults when no driver or codemods are provided', async () => {
		const helper = createPhpBuilderConfigHelper();
		const context = { workspace: {} };
		const reporter = createReporterMock();

		await helper.apply({
			input: {
				phase: 'generate',
				ir: makeIr(),
				options: buildOptions({
					config: {
						adapters: {
							php: () => ({
								driver: undefined,
								codemods: { files: [], driver: {} },
							}),
						},
					},
				}),
			},
			context,
			reporter,
			output: { queueWrite: jest.fn() },
		} as any);

		const state = getPhpBuilderConfigState(context as any);
		expect(state.driver?.scriptPath).toBeTruthy();
		expect(state.driver?.binary).toBeUndefined();
		expect(state.codemods).toBeNull();
	});
});

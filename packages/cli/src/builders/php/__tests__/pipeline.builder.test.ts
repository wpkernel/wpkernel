import path from 'node:path';
import { createPhpBuilder } from '../pipeline.builder';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
} from '../test-support/php-builder.test-support';
import { loadTestLayoutSync } from '../../../tests/layout.test-support';

const codemodApplyMock = jest.fn(async (_options, next) => {
	await next?.();
});
const createCodemodHelperImpl = jest.fn((options?: unknown) => ({
	key: 'builder.generate.php.codemod-ingestion',
	kind: 'builder' as const,
	apply: codemodApplyMock,
	options,
}));

const writerApplyMock = jest.fn(async (_options, next) => {
	await next?.();
});
const createWriterHelperImpl = jest.fn((options?: unknown) => ({
	key: 'builder.generate.php.writer',
	kind: 'builder' as const,
	apply: writerApplyMock,
	options,
}));

jest.mock('../pipeline.codemods', () => ({
	createPhpCodemodIngestionHelper: jest.fn((options) =>
		createCodemodHelperImpl(options)
	),
}));

jest.mock('../pipeline.writer', () => ({
	createWpProgramWriterHelper: jest.fn((options) =>
		createWriterHelperImpl(options)
	),
}));

const { createPhpCodemodIngestionHelper } = jest.requireMock(
	'../pipeline.codemods'
) as {
	createPhpCodemodIngestionHelper: jest.Mock;
};
const { createWpProgramWriterHelper } = jest.requireMock(
	'../pipeline.writer'
) as {
	createWpProgramWriterHelper: jest.Mock;
};

describe('createPhpBuilder - adapter codemods', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		codemodApplyMock.mockImplementation(async (_options, next) => {
			await next?.();
		});
		writerApplyMock.mockImplementation(async (_options, next) => {
			await next?.();
		});
	});

	it('threads adapter codemods through the helper pipeline', async () => {
		const builder = createPhpBuilder({
			driver: {
				binary: '/base/php',
				scriptPath: '/base/program-writer.php',
				importMetaUrl: 'file:///base/dist/index.js',
			},
		});

		const layout = loadTestLayoutSync();
		const pluginPath = path.posix.join(
			layout.resolve('php.generated'),
			'plugin.php'
		);
		const ir = createMinimalIr({
			config: {
				adapters: {
					php() {
						return {
							driver: {
								scriptPath: '/adapter/program-writer.php',
							},
							codemods: {
								files: [pluginPath, ''],
								configurationPath: 'codemods/baseline.json',
								diagnostics: { nodeDumps: true },
								driver: {
									binary: '/adapter/php',
									scriptPath: '/adapter/codemod.php',
									importMetaUrl:
										'file:///adapter/dist/index.js',
								},
							},
						};
					},
				},
			},
		});

		const context = createPipelineContext();
		const input = createBuilderInput({
			ir,
			options: {
				config: ir.config,
				namespace: ir.config.namespace,
				sourcePath: '',
				origin: '',
			},
		});
		const output = createBuilderOutput();

		await builder.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(createPhpCodemodIngestionHelper).toHaveBeenCalledTimes(1);
		expect(createCodemodHelperImpl).toHaveBeenCalledWith({
			files: [pluginPath, ''],
			configurationPath: 'codemods/baseline.json',
			enableDiagnostics: true,
			phpBinary: '/adapter/php',
			scriptPath: '/adapter/codemod.php',
			importMetaUrl: 'file:///adapter/dist/index.js',
			autoloadPaths: undefined,
		});
		expect(createWpProgramWriterHelper).toHaveBeenCalledTimes(1);
		expect(createWriterHelperImpl).toHaveBeenCalledWith({
			driver: {
				binary: '/base/php',
				scriptPath: '/adapter/program-writer.php',
				importMetaUrl: 'file:///base/dist/index.js',
				autoloadPaths: undefined,
			},
		});
		expect(codemodApplyMock).toHaveBeenCalled();
		expect(writerApplyMock).toHaveBeenCalled();
	});

	it('skips codemod helper when no valid target files are declared', async () => {
		const builder = createPhpBuilder();

		const ir = createMinimalIr({
			config: {
				adapters: {
					php() {
						return {
							codemods: {
								files: [123 as unknown as string],
							},
						};
					},
				},
			},
		});

		const context = createPipelineContext();
		const input = createBuilderInput({
			ir,
			options: {
				config: ir.config,
				namespace: ir.config.namespace,
				sourcePath: '',
				origin: '',
			},
		});
		const output = createBuilderOutput();

		await builder.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(createPhpCodemodIngestionHelper).not.toHaveBeenCalled();
		expect(createWpProgramWriterHelper).toHaveBeenCalledTimes(1);
	});

	it('defaults codemod driver overrides to the merged PHP driver options', async () => {
		const builder = createPhpBuilder({
			driver: {
				binary: '/base/php',
				scriptPath: '/base/codemod.php',
				importMetaUrl: 'file:///base/dist/index.js',
			},
		});

		const ir = createMinimalIr({
			config: {
				adapters: {
					php() {
						return {
							codemods: {
								files: ['plugin.php'],
								driver: {
									// no overrides provided
								},
							},
						};
					},
				},
			},
		});

		const context = createPipelineContext();
		const input = createBuilderInput({
			ir,
			options: {
				config: ir.config,
				namespace: ir.config.namespace,
				sourcePath: '',
				origin: '',
			},
		});
		const output = createBuilderOutput();

		await builder.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(createPhpCodemodIngestionHelper).toHaveBeenCalledTimes(1);
		expect(createCodemodHelperImpl).toHaveBeenCalledWith(
			expect.objectContaining({
				phpBinary: '/base/php',
				scriptPath: '/base/codemod.php',
				importMetaUrl: 'file:///base/dist/index.js',
				autoloadPaths: undefined,
			})
		);
	});

	it('does not override importMetaUrl-only driver configs', async () => {
		const builder = createPhpBuilder({
			driver: {
				importMetaUrl: 'file:///custom/driver/index.js',
			},
		});

		const ir = createMinimalIr();
		const context = createPipelineContext();
		const input = createBuilderInput({
			ir,
			options: {
				config: ir.config,
				namespace: ir.config.namespace,
				sourcePath: '',
				origin: '',
			},
		});
		const output = createBuilderOutput();

		await builder.apply(
			{ context, input, output, reporter: context.reporter },
			undefined
		);

		expect(createWpProgramWriterHelper).toHaveBeenCalledWith({
			driver: {
				importMetaUrl: 'file:///custom/driver/index.js',
			},
		});
	});
});

import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import { runAdapterExtensions } from '../../adapters';
import { mkdir } from 'node:fs/promises';
import { buildTsFormatter } from '../../builders/ts';
import type { WPKernelConfigV1 } from '../../config/types';
import { buildAdapterExtensionHook } from '@cli-tests/runtime/adapter-extensions.test-support';
import { type IRv1 } from '../../ir';

jest.mock('../../adapters', () => ({
	runAdapterExtensions: jest.fn(),
}));

const tsFormatterFormatMock = jest.fn(
	async (options: { filePath: string; contents: string }) => options.contents
);

jest.mock('../../builders/ts', () => ({
	buildTsFormatter: jest.fn(() => ({
		format: tsFormatterFormatMock,
	})),
}));

jest.mock('node:fs/promises', () => ({
	mkdir: jest.fn().mockResolvedValue(undefined),
}));

const runAdapterExtensionsMock = runAdapterExtensions as jest.MockedFunction<
	typeof runAdapterExtensions
>;
const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
const buildTsFormatterMock = buildTsFormatter as jest.MockedFunction<
	typeof buildTsFormatter
>;

beforeEach(() => {
	jest.clearAllMocks();
	tsFormatterFormatMock.mockClear();
});

describe('buildAdapterExtensionsExtension', () => {
	it('skips execution when pipeline phase is not generate', async () => {
		const factory = jest.fn(() => [{ name: 'noop', apply: jest.fn() }]);
		const config = {
			version: 1,
			namespace: 'test',
			resources: {},
			schemas: {},
			adapters: { extensions: [factory] },
		} as WPKernelConfigV1;
		const { hook, options } = await buildAdapterExtensionHook(config);

		const result = await hook({
			...options,
			context: { ...options.context, phase: 'apply' },
			options: { ...options.options, phase: 'apply' },
		});

		expect(result).toBeUndefined();
		expect(factory).not.toHaveBeenCalled();
		expect(runAdapterExtensionsMock).not.toHaveBeenCalled();
	});

	it('returns undefined when no adapter extensions are registered', async () => {
		const config = {
			version: 1,
			namespace: 'test',
			resources: {},
			schemas: {},
			adapters: { extensions: [] },
		} as WPKernelConfigV1;
		const { hook, options } = await buildAdapterExtensionHook(config);

		const result = await hook(options);

		expect(result).toBeUndefined();
		expect(runAdapterExtensionsMock).not.toHaveBeenCalled();
	});

	it('throws a developer error when adapter factories fail validation', async () => {
		const config = {
			version: 1,
			namespace: 'test',
			resources: {},
			schemas: {},
			adapters: {
				extensions: [() => [{ name: ' ', apply: jest.fn() }]],
			},
		} as WPKernelConfigV1;
		const { hook, options } = await buildAdapterExtensionHook(config);

		await expect(hook(options)).rejects.toThrow(WPKernelError);
		expect(runAdapterExtensionsMock).not.toHaveBeenCalled();
		expect(options.options.reporter.child).toHaveBeenCalledWith('adapter');
		expect(options.options.reporter.error).toHaveBeenCalledWith(
			'Adapter extensions failed to initialise.',
			{
				error: expect.stringContaining(
					'Adapter extensions must provide'
				),
			}
		);
	});

	it('runs adapter extensions and exposes the hook lifecycle helpers', async () => {
		const apply = jest.fn();
		const factory = jest.fn(() => [{ name: ' custom ', apply }]);
		const config = {
			version: 1,
			namespace: 'test',
			resources: {},
			schemas: {},
			adapters: { extensions: [factory] },
		} as WPKernelConfigV1;
		const { hook, options } = await buildAdapterExtensionHook(config);

		const commit = jest.fn().mockResolvedValue(undefined);
		const rollback = jest.fn().mockResolvedValue(undefined);
		const ir = {
			...options.artifact,
			meta: { ...options.artifact.meta, namespace: 'next' },
		} as IRv1;
		runAdapterExtensionsMock.mockResolvedValue({
			ir,
			commit,
			rollback,
		});

		const result = await hook(options);
		expect(result).toEqual({ artifact: ir, commit, rollback });

		expect(factory).toHaveBeenCalledWith(
			expect.objectContaining({ namespace: 'TestNamespace' })
		);
		expect(runAdapterExtensionsMock).toHaveBeenCalledTimes(1);
		expect(options.options.reporter.child).toHaveBeenCalledWith('adapter');
		expect(options.options.reporter.info).toHaveBeenNthCalledWith(
			1,
			'Running adapter extensions.',
			{ count: 1 }
		);
		expect(options.options.reporter.info).toHaveBeenNthCalledWith(
			2,
			'Adapter extensions completed successfully.',
			{ count: 1 }
		);

		const args = runAdapterExtensionsMock.mock.calls[0]?.[0];
		expect(args?.extensions).toEqual([
			expect.objectContaining({ name: 'custom', apply }),
		]);
		expect(args?.adapterContext.ir).toBe(ir);
		expect(args?.outputDir).toBe(
			options.options.workspace.resolve(
				options.artifact.artifacts.runtime.runtime.generated
			)
		);
		expect(args?.configDirectory).toBe(
			path.dirname(options.options.sourcePath)
		);

		await args?.ensureDirectory('relative/path');
		expect(mkdirMock).toHaveBeenCalledWith(
			path.join(options.options.workspace.root, 'relative/path'),
			{ recursive: true }
		);

		await args?.ensureDirectory('/absolute/path');
		expect(mkdirMock).toHaveBeenCalledWith('/absolute/path', {
			recursive: true,
		});

		await args?.writeFile('file.ts', 'contents');
		expect(options.options.workspace.write).toHaveBeenCalledWith(
			'file.ts',
			'contents',
			{ ensureDir: true }
		);

		expect(tsFormatterFormatMock).not.toHaveBeenCalled();
	});

	it('wraps thrown adapter factory errors', async () => {
		const config = {
			version: 1,
			namespace: 'test',
			resources: {},
			schemas: {},
			adapters: {
				extensions: [
					() => {
						throw 'boom';
					},
				],
			},
		} as WPKernelConfigV1;
		const { hook, options } = await buildAdapterExtensionHook(config);

		await expect(hook(options)).rejects.toThrow(WPKernelError);
		expect(runAdapterExtensionsMock).not.toHaveBeenCalled();
		expect(options.options.reporter.error).toHaveBeenCalledWith(
			'Adapter extensions failed to initialise.',
			{ error: 'boom' }
		);
	});

	it.each([
		{
			scenario: 'null candidate',
			factory: () => [null],
			message: 'Invalid adapter extension returned from factory.',
		},
		{
			scenario: 'missing apply function',
			factory: () => [
				{ name: 'invalid', apply: undefined } as unknown as {
					name: string;
					apply: () => void;
				},
			],
			message: 'Adapter extensions must define an apply() function.',
		},
	])(
		'throws when adapter extensions fail validation (%s)',
		async ({ factory, message }) => {
			const config = {
				version: 1,
				namespace: 'test',
				resources: {},
				schemas: {},
				adapters: { extensions: [factory as never] },
			} as WPKernelConfigV1;
			const { hook, options } = await buildAdapterExtensionHook(config);

			await expect(hook(options)).rejects.toThrow(WPKernelError);
			expect(runAdapterExtensionsMock).not.toHaveBeenCalled();
			expect(options.options.reporter.error).toHaveBeenCalledWith(
				'Adapter extensions failed to initialise.',
				{ error: message }
			);
		}
	);

	it('returns undefined when factories skip emitting extensions', async () => {
		const skip = jest.fn(() => undefined);
		const empty = jest.fn(() => []);
		const config = {
			version: 1,
			namespace: 'test',
			resources: {},
			schemas: {},
			adapters: { extensions: [skip, empty] },
		} as WPKernelConfigV1;
		const { hook, options } = await buildAdapterExtensionHook(config);

		const result = await hook(options);

		expect(result).toBeUndefined();
		expect(skip).toHaveBeenCalledTimes(1);
		expect(empty).toHaveBeenCalledTimes(1);
		expect(options.options.reporter.child).toHaveBeenCalledWith('adapter');
		expect(options.options.reporter.info).not.toHaveBeenCalled();
		expect(runAdapterExtensionsMock).not.toHaveBeenCalled();
	});

	it('forwards formatter helpers to the adapter runtime', async () => {
		const config = {
			version: 1,
			namespace: 'test',
			resources: {},
			schemas: {},
			adapters: {
				extensions: [
					() => [
						{
							name: 'formatters',
							apply: jest.fn(),
						},
					],
				],
			},
		} as WPKernelConfigV1;
		const { hook, options } = await buildAdapterExtensionHook(config);

		runAdapterExtensionsMock.mockResolvedValue({
			ir: options.artifact,
			commit: jest.fn(),
			rollback: jest.fn(),
		});

		await hook(options);

		const args = runAdapterExtensionsMock.mock.calls[0]?.[0];
		const formattedPhp = await args?.formatPhp(
			'file.php',
			'<?php echo 1; ?>'
		);
		await args?.formatTs('file.ts', 'export const value = 1;');

		expect(formattedPhp).toBe('<?php echo 1; ?>');
		expect(buildTsFormatterMock).toHaveBeenCalledTimes(1);
		expect(tsFormatterFormatMock).toHaveBeenCalledWith({
			filePath: 'file.ts',
			contents: 'export const value = 1;',
		});
	});

	it('normalises single adapter extensions into an array', async () => {
		const apply = jest.fn();
		const config = {
			version: 1,
			namespace: 'test',
			resources: {},
			schemas: {},
			adapters: {
				extensions: [() => ({ name: 'single', apply })],
			},
		} as WPKernelConfigV1;
		const { hook, options } = await buildAdapterExtensionHook(config);

		runAdapterExtensionsMock.mockResolvedValue({
			ir: options.artifact,
			commit: jest.fn(),
			rollback: jest.fn(),
		});

		await hook(options);

		const args = runAdapterExtensionsMock.mock.calls[0]?.[0];
		expect(args?.extensions).toEqual([
			expect.objectContaining({ name: 'single', apply }),
		]);
	});
});

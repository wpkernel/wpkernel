import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { runAdapterExtensions } from '..';
import { WPKernelError } from '@wpkernel/core/error';
import type {
	AdapterContext,
	AdapterExtension,
	WPKernelConfigV1,
} from '../../config/types';
import type { IRCapabilityScope, IRv1 } from '../../ir/publicTypes';
import { FileWriter } from '../../utils/file-writer';
import type { Reporter } from '@wpkernel/core/reporter';
import { createReporterMock } from '@cli-tests/reporter';
import { makeIr, makeIrMeta } from '@cli-tests/ir.test-support';

const TMP_OUTPUT = path.join(os.tmpdir(), 'wpk-extension-output-');

describe('runAdapterExtensions', () => {
	it('queues files in a sandbox and commits them after builders succeed', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const writer = new FileWriter();
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'telemetry',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(
						path.join(dir, 'telemetry.json'),
						JSON.stringify({ events: [] })
					);
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async (directoryPath: string) => {
					await fs.mkdir(directoryPath, { recursive: true });
				},
				writeFile: async (filePath, contents) => {
					await writer.write(filePath, contents);
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			const telemetryPath = path.join(outputDir, 'telemetry.json');
			await expect(fs.stat(telemetryPath)).rejects.toMatchObject({
				code: 'ENOENT',
			});

			await run.commit();

			const contents = await fs.readFile(telemetryPath, 'utf8');
			expect(JSON.parse(contents)).toEqual({ events: [] });

			const summary = writer.summarise();
			expect(summary.counts.written).toBe(1);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('rolls back sandbox files when builders fail', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'docs',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(path.join(dir, 'docs.md'), '# Docs');
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async (directoryPath: string) => {
					await fs.mkdir(directoryPath, { recursive: true });
				},
				writeFile: async () => {
					throw new Error('should not write');
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			await expect(run.rollback()).resolves.toBeUndefined();

			await expect(
				fs.stat(path.join(outputDir, 'docs.md'))
			).rejects.toMatchObject({
				code: 'ENOENT',
			});
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('reports extension failures and prevents partial writes', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'fail',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(path.join(dir, 'partial.txt'), 'data');
					throw new Error('boom');
				},
			};

			await expect(
				runAdapterExtensions({
					extensions: [extension],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async (directoryPath: string) => {
						await fs.mkdir(directoryPath, { recursive: true });
					},
					writeFile: async () => {
						throw new Error('should not write');
					},
					configDirectory: undefined,
					formatPhp: async (_filePath, contents) => contents,
					formatTs: async (_filePath, contents) => contents,
				})
			).rejects.toThrow('boom');

			expect(reporter.error).toHaveBeenCalled();
			await expect(
				fs.stat(path.join(outputDir, 'partial.txt'))
			).rejects.toMatchObject({
				code: 'ENOENT',
			});
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('returns early when no extensions are provided', async () => {
		const ir = createIr();
		const reporter = createReporterMock();
		const adapterContext = createAdapterContext(reporter, ir);

		const run = await runAdapterExtensions({
			extensions: [],
			adapterContext,
			ir,
			outputDir: '/tmp/unused',
			ensureDirectory: async () => {
				throw new Error('should not ensure directory');
			},
			writeFile: async () => {
				throw new Error('should not write');
			},
			configDirectory: undefined,
			formatPhp: async () => '',
			formatTs: async () => '',
		});

		expect(run.ir).toBe(ir);
		await expect(run.commit()).resolves.toBeUndefined();
		await expect(run.rollback()).resolves.toBeUndefined();
	});

	it('supports multiple commit calls without rewriting files', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const writer = new FileWriter();
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'analytics',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(
						path.join(dir, 'analytics.json'),
						JSON.stringify({ enabled: true })
					);
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async (directoryPath: string) => {
					await fs.mkdir(directoryPath, { recursive: true });
				},
				writeFile: async (filePath, contents) => {
					await writer.write(filePath, contents);
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			await run.commit();
			await expect(run.commit()).resolves.toBeUndefined();

			const analyticsPath = path.join(outputDir, 'analytics.json');
			const contents = await fs.readFile(analyticsPath, 'utf8');
			expect(JSON.parse(contents)).toEqual({ enabled: true });
			const summary = writer.summarise();
			expect(summary.counts.written).toBe(1);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('records dry-run statuses for unchanged and skipped files', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const writer = new FileWriter({ dryRun: true });

		try {
			const unchangedPath = path.join(outputDir, 'same.txt');
			await fs.writeFile(unchangedPath, 'stable\n', 'utf8');
			const skippedPath = path.join(outputDir, 'different.txt');
			await fs.writeFile(skippedPath, 'before\n', 'utf8');

			const statusUnchanged = await writer.write(unchangedPath, 'stable');
			expect(statusUnchanged).toBe('unchanged');

			const statusSkipped = await writer.write(skippedPath, 'after');
			expect(statusSkipped).toBe('skipped');

			const summary = writer.summarise();
			expect(summary.counts.unchanged).toBe(1);
			expect(summary.counts.skipped).toBe(1);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('sanitises IR clones before invoking extensions', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const adaptersSeen: Array<unknown> = [];

			const extension: AdapterExtension = {
				name: 'inspect',
				async apply({ ir: clonedIr }) {
					adaptersSeen.push(
						(clonedIr as Record<string, unknown>).config
					);
				},
			};

			await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async (directoryPath: string) => {
					await fs.mkdir(directoryPath, { recursive: true });
				},
				writeFile: async () => undefined,
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			expect(adaptersSeen).toHaveLength(1);
			expect(adaptersSeen[0]).toBeUndefined();
			expect(typeof adapterContext.config.adapters?.php).toBe('function');
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('rejects queued files that escape the output directory via symlink', async () => {
		if (process.platform === 'win32') {
			return;
		}

		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const outsideDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-extension-outside-')
		);
		const reporter = createReporterMock();

		try {
			await fs.symlink(outsideDir, path.join(outputDir, 'link'), 'dir');
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'escape',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(
						path.join(dir, 'link', 'steal.txt'),
						'data'
					);
				},
			};

			await expect(
				runAdapterExtensions({
					extensions: [extension],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async () => undefined,
					writeFile: async () => undefined,
					configDirectory: undefined,
					formatPhp: async (_filePath, contents) => contents,
					formatTs: async (_filePath, contents) => contents,
				})
			).rejects.toThrow('escape');
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
			await fs.rm(outsideDir, { recursive: true, force: true });
		}
	});

	it('supports multiple rollback calls', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'noop',
				async apply() {
					// no-op
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async () => {
					/* noop */
				},
				writeFile: async () => {
					/* noop */
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			await run.rollback();
			await expect(run.rollback()).resolves.toBeUndefined();
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('normalises WPKernelError instances thrown by extensions', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'fails-kernel-error',
				async apply() {
					throw new WPKernelError('DeveloperError', {
						message: 'bad extension',
					});
				},
			};

			await expect(
				runAdapterExtensions({
					extensions: [extension],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async () => {
						/* noop */
					},
					writeFile: async () => {
						/* noop */
					},
					configDirectory: undefined,
					formatPhp: async (_filePath, contents) => contents,
					formatTs: async (_filePath, contents) => contents,
				})
			).rejects.toBeInstanceOf(WPKernelError);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});

	it('falls back to JSON cloning when structuredClone is unavailable', async () => {
		const hadStructuredClone = 'structuredClone' in globalThis;
		const originalStructuredClone = globalThis.structuredClone;
		Object.defineProperty(globalThis, 'structuredClone', {
			value: undefined,
			configurable: true,
			writable: true,
		} as PropertyDescriptor);

		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'ir-updater',
				async apply({ updateIr, ir: currentIr }) {
					updateIr({
						...currentIr,
						meta: {
							...currentIr.meta,
							namespace: 'UpdatedNamespace',
						},
					});
				},
			};

			const run = await runAdapterExtensions({
				extensions: [extension],
				adapterContext,
				ir,
				outputDir,
				ensureDirectory: async () => {
					/* noop */
				},
				writeFile: async () => {
					/* noop */
				},
				configDirectory: undefined,
				formatPhp: async (_filePath, contents) => contents,
				formatTs: async (_filePath, contents) => contents,
			});

			expect(run.ir.meta.namespace).toBe('UpdatedNamespace');
			expect(ir.meta.namespace).toBe('Demo\\Namespace');
		} finally {
			if (hadStructuredClone) {
				Object.defineProperty(globalThis, 'structuredClone', {
					value: originalStructuredClone,
					configurable: true,
					writable: true,
				} as PropertyDescriptor);
			} else {
				Reflect.deleteProperty(globalThis, 'structuredClone');
			}
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});
	it('rejects writes outside the output directory', async () => {
		const outputDir = await fs.mkdtemp(TMP_OUTPUT);
		const reporter = createReporterMock();

		try {
			const ir = createIr();
			const adapterContext = createAdapterContext(reporter, ir);
			const extension: AdapterExtension = {
				name: 'escape',
				async apply({ queueFile, outputDir: dir }) {
					await queueFile(path.join(dir, '..', 'escape.txt'), 'nope');
				},
			};

			await expect(
				runAdapterExtensions({
					extensions: [extension],
					adapterContext,
					ir,
					outputDir,
					ensureDirectory: async (directoryPath: string) => {
						await fs.mkdir(directoryPath, { recursive: true });
					},
					writeFile: async () => {
						throw new Error('should not write');
					},
					configDirectory: undefined,
					formatPhp: async (_filePath, contents) => contents,
					formatTs: async (_filePath, contents) => contents,
				})
			).rejects.toThrow('Adapter extensions must write inside');

			expect(reporter.error).toHaveBeenCalled();
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});
});

function createIr(): IRv1 {
	return makeIr({
		namespace: 'Demo\\Namespace',
		meta: makeIrMeta('Demo\\Namespace', {
			sourcePath: '/workspace/wpk.config.ts',
			origin: 'file',
		}),
		php: {
			namespace: 'Demo\\Namespace',
			autoload: 'inc/',
			outputDir: '/fake/path',
		},
		capabilityMap: {
			fallback: {
				capability: 'manage_options',
				appliesTo: 'resource' as IRCapabilityScope,
			},
		},
	});
}

function createAdapterContext(reporter: Reporter, ir: IRv1): AdapterContext {
	return {
		config: createConfig(),
		namespace: 'Demo\\Namespace',
		reporter,
		ir,
	};
}

function createConfig(): WPKernelConfigV1 {
	return {
		version: 1,
		namespace: 'demo',
		schemas: {},
		resources: {},
		adapters: {
			php: () => ({ namespace: 'Demo\\Namespace' }),
			extensions: [() => ({ name: 'noop', apply: () => undefined })],
		},
	};
}

import {
	PATCH_MANIFEST_PATH,
	buildBuilderOutput,
	cleanupWorkspaceTargets,
	formatManifest,
	readManifest,
	resolveWorkspaceRoot,
} from '../apply';
import { createCommandReporterHarness } from '@wpkernel/test-utils/cli';
import { resolveFlags } from '../apply/flags';
import type {
	WPKernelConfigV1,
	LoadedWPKernelConfig,
} from '../../../config/types';
import type { Workspace } from '../../workspace';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { loadTestLayout } from '../../tests/layout.test-support';

const wpkConfig: WPKernelConfigV1 = {
	version: 1,
	namespace: 'Demo',
	schemas: {},
	resources: {},
};

const loadedConfig: LoadedWPKernelConfig = {
	config: wpkConfig,
	namespace: 'Demo',
	sourcePath: '/path/to/workspace/wpk.config.ts',
	configOrigin: 'wpk.config.ts',
};

describe('apply command helpers', () => {
	it('creates a builder output queue', () => {
		const output = buildBuilderOutput();
		expect(output.actions).toEqual([]);

		output.queueWrite({
			file: 'file.ts',
			contents: 'content',
		});

		expect(output.actions).toHaveLength(1);
	});

	it('returns null when no manifest content is present', async () => {
		const workspace = makeWorkspaceMock({
			readText: jest
				.fn<
					ReturnType<Workspace['readText']>,
					Parameters<Workspace['readText']>
				>()
				.mockResolvedValue(null),
		}) as unknown as Workspace;

		await expect(readManifest(workspace)).resolves.toBeNull();
	});

	it('parses manifest content and normalises values', async () => {
		const workspace = makeWorkspaceMock({
			readText: jest
				.fn<
					ReturnType<Workspace['readText']>,
					Parameters<Workspace['readText']>
				>()
				.mockImplementation(async (file: string) => {
					if (file === 'layout.manifest.json') {
						return null;
					}
					return JSON.stringify({
						summary: { applied: '2', conflicts: '0', skipped: 1 },
						records: [
							{
								file: 'app/file.ts',
								status: 'applied',
								description: 'Patched file',
								details: { conflict: false },
							},
							{
								file: null,
								status: undefined,
								description: 123,
								details: 'not-object',
							},
						],
					});
				}),
		}) as unknown as Workspace;

		const manifest = await readManifest(workspace);

		expect(manifest).toEqual({
			summary: { applied: 2, conflicts: 0, skipped: 1 },
			records: [
				{
					file: 'app/file.ts',
					status: 'applied',
					description: 'Patched file',
					details: { conflict: false },
				},
				{
					file: '',
					status: 'skipped',
					description: undefined,
					details: undefined,
				},
			],
			actions: [],
		});
	});

	it('throws a wpk error when manifest cannot be parsed', async () => {
		const workspace = makeWorkspaceMock({
			readText: jest
				.fn<
					ReturnType<Workspace['readText']>,
					Parameters<Workspace['readText']>
				>()
				.mockImplementation(async (file: string) =>
					file === 'layout.manifest.json' ? null : 'invalid-json'
				),
		}) as unknown as Workspace;

		await expect(readManifest(workspace)).rejects.toMatchObject({
			code: 'DeveloperError',
		});
	});

	it('formats manifest summaries including records', () => {
		const text = formatManifest({
			summary: { applied: 1, conflicts: 0, skipped: 0 },
			records: [
				{
					file: 'php/file.php',
					status: 'applied',
					description: 'Updated file',
				},
			],
			actions: [],
		});

		expect(text).toContain('Apply summary:');
		expect(text).toContain('Applied: 1');
		expect(text).toContain('- [applied] php/file.php - Updated file');
	});

	it('formats manifest records with skip reasons', () => {
		const text = formatManifest({
			summary: { applied: 0, conflicts: 0, skipped: 1 },
			records: [
				{
					file: 'inc/Rest/JobsController.php',
					status: 'skipped',
					description: 'Remove jobs shim',
					details: { reason: 'modified-target', action: 'delete' },
				},
			],
			actions: [],
		});

		expect(text).toContain(
			'- [skipped] inc/Rest/JobsController.php - Remove jobs shim (reason: modified-target)'
		);
	});

	it('formats manifest summaries when no records exist', () => {
		const text = formatManifest({
			summary: { applied: 0, conflicts: 0, skipped: 0 },
			records: [],
		});

		expect(text).toContain('No files were patched.');
	});

	it('cleans up workspace targets and reports outcomes', async () => {
		const removedTargets = new Map<string, boolean>([
			['inc/Rest/JobsController.php', true],
			['inc/Rest/BooksController.php', false],
		]);

		const workspace = makeWorkspaceMock({
			exists: jest
				.fn()
				.mockImplementation(
					async (file: string) => removedTargets.get(file) ?? false
				),
			rm: jest.fn(async (file: string) => {
				removedTargets.set(file, false);
			}),
		}) as unknown as Workspace;

		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		const result = await cleanupWorkspaceTargets({
			workspace,
			reporter,
			targets: [
				'inc/Rest/JobsController.php',
				'./inc/Rest/JobsController.php',
				'inc/Rest/BooksController.php',
				'../outside.php',
			],
		});

		expect(workspace.rm).toHaveBeenCalledTimes(1);
		expect(workspace.rm).toHaveBeenCalledWith(
			'inc/Rest/JobsController.php'
		);
		expect(result.removed).toEqual(['inc/Rest/JobsController.php']);
		expect(result.missing).toEqual(['inc/Rest/BooksController.php']);
		expect(result.rejected).toEqual(['../outside.php']);
		expect(reporter.info).toHaveBeenCalledWith(
			'wpk apply cleanup: removed leftover targets.',
			{ files: ['inc/Rest/JobsController.php'] }
		);
		expect(reporter.info).toHaveBeenCalledWith(
			'wpk apply cleanup: targets already absent.',
			{ files: ['inc/Rest/BooksController.php'] }
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'wpk apply cleanup: rejected unsafe cleanup targets.',
			{ files: ['../outside.php'] }
		);
	});

	it('resolves flags including cleanup entries', () => {
		const flags = resolveFlags({
			yes: true,
			backup: false,
			force: true,
			cleanup: ['inc/Rest/JobsController.php', 123 as unknown as string],
		});

		expect(flags).toEqual({
			yes: true,
			backup: false,
			force: true,
			allowDirty: false,
			cleanup: ['inc/Rest/JobsController.php'],
		});
	});

	it('resolves workspace root using the loaded config source path', () => {
		expect(resolveWorkspaceRoot(loadedConfig)).toBe('/path/to/workspace');
	});

	it('exposes the manifest path constant', async () => {
		const layout = await loadTestLayout({ strict: true });
		expect(PATCH_MANIFEST_PATH).toBe(layout.resolve('patch.manifest'));
	});
});

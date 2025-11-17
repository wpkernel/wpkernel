import path from 'node:path';
import { buildWorkspace } from '../../workspace';
import { createPatcher } from '../patcher';
import type { BuilderOutput } from '../../runtime/types';
import type { IRv1 } from '../../ir/publicTypes';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { makeIrMeta } from '../../tests/ir.test-support';
import {
	withWorkspace as baseWithWorkspace,
	buildReporter,
	buildOutput,
} from '@wpkernel/test-utils/builders/tests/builder-harness.test-support';
import type { BuilderHarnessContext } from '@wpkernel/test-utils/builders/tests/builder-harness.test-support';
import { loadTestLayout } from '../../tests/layout.test-support';

type PatcherWorkspaceContext = BuilderHarnessContext<
	ReturnType<typeof buildWorkspace>
>;

const withWorkspace = (
	run: (context: PatcherWorkspaceContext) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root) => buildWorkspace(root),
	});

async function buildIr(namespace: string, cwd: string): Promise<IRv1> {
	const layout = await loadTestLayout({ cwd, strict: true });
	return {
		meta: makeIrMeta(namespace, {
			origin: 'wpk.config.ts',
			sourcePath: 'wpk.config.ts',
		}),
		config: {
			version: 1,
			namespace,
			schemas: {},
			resources: {},
		},
		schemas: [],
		resources: [],
		capabilities: [],
		capabilityMap: {
			sourcePath: undefined,
			definitions: [],
			fallback: { capability: 'manage_options', appliesTo: 'resource' },
			missing: [],
			unused: [],
			warnings: [],
		},
		blocks: [],
		php: {
			namespace,
			autoload: 'inc/',
			outputDir: layout.resolve('php.generated'),
		},
	} satisfies IRv1;
}

describe('createPatcher', () => {
	it('records conflicts when merge cannot be resolved automatically', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const layout = await loadTestLayout({ cwd: workspaceRoot });

			const base = ['line-one', 'line-two', ''].join('\n');
			const incoming = ['line-one updated', 'line-two', ''].join('\n');
			const current = ['line-one user', 'line-two', ''].join('\n');

			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/Conflict.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'php/Conflict.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
									'php/Conflict.php'
								),
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(
					layout.resolve('plan.base'),
					'php',
					'Conflict.php'
				),
				base
			);
			await workspace.write(
				path.posix.join(
					layout.resolve('plan.incoming'),
					'php',
					'Conflict.php'
				),
				incoming
			);
			await workspace.write('php/Conflict.php', current, {
				ensureDir: true,
			});

			const ir = await buildIr('Demo', workspaceRoot);
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const merged = await workspace.readText('php/Conflict.php');
			expect(merged).toContain('<<<<<<<');
			expect(merged).toContain('=======');
			expect(merged).toContain('>>>>>>>');

			const manifestPath = layout.resolve('patch.manifest');
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});
			expect(manifest.actions).toEqual(
				expect.arrayContaining(['php/Conflict.php', manifestPath])
			);
			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining(['php/Conflict.php', manifestPath])
			);
			expect(reporter.warn).toHaveBeenCalledWith(
				'createPatcher: merge conflict detected.',
				expect.objectContaining({ file: 'php/Conflict.php' })
			);
		});
	});

	it('skips when no plan is present', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();

			const ir = await buildIr('Demo', workspaceRoot);
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			expect(reporter.debug).toHaveBeenCalledWith(
				'createPatcher: no patch instructions found.'
			);
			expect(output.actions).toHaveLength(0);
		});
	});

	it('skips entries with missing incoming artifacts', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const layout = await loadTestLayout({ cwd: workspaceRoot });

			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: './',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'placeholder.txt'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
									'missing.txt'
								),
								description: 'missing incoming',
							},
							{
								action: 'write',
								file: 'php/Skip.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'php/Skip.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
									'php/Skip.php'
								),
								description: 'missing incoming file',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(layout.resolve('plan.base'), 'php', 'Skip.php'),
				'base'
			);

			const ir = await buildIr('Demo', workspaceRoot);
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestPath = layout.resolve('patch.manifest');
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 2,
			});
			expect(manifest.records).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						status: 'skipped',
						description: 'missing incoming',
						details: { reason: 'empty-target' },
					}),
					expect.objectContaining({
						file: 'php/Skip.php',
						status: 'skipped',
						details: { reason: 'missing-incoming' },
					}),
				])
			);
			expect(manifest.actions).toEqual([manifestPath]);
			expect(output.actions.map((action) => action.file)).toEqual([
				manifestPath,
			]);
			expect(reporter.warn).toHaveBeenCalled();
		});
	});

	it('skips when incoming matches the current target', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const layout = await loadTestLayout({ cwd: workspaceRoot });

			const sharedContents = ['<?php', 'echo "noop";', ''].join('\n');

			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/Noop.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'php/Noop.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
									'php/Noop.php'
								),
								description: 'noop check',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(layout.resolve('plan.base'), 'php', 'Noop.php'),
				sharedContents
			);
			await workspace.write(
				path.posix.join(
					layout.resolve('plan.incoming'),
					'php',
					'Noop.php'
				),
				sharedContents
			);
			await workspace.write('php/Noop.php', sharedContents, {
				ensureDir: true,
			});

			const ir = await buildIr('Demo', workspaceRoot);
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestPath = layout.resolve('patch.manifest');
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 1,
			});
			expect(manifest.records[0]).toMatchObject({
				file: 'php/Noop.php',
				status: 'skipped',
				details: { reason: 'no-op' },
			});
			expect(manifest.actions).toEqual([manifestPath]);
			expect(output.actions.map((action) => action.file)).toEqual([
				manifestPath,
			]);
		});
	});

	it('applies deletion instructions for stale shims', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const layout = await loadTestLayout({ cwd: workspaceRoot });

			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'delete',
								file: 'php/Stale.php',
								description: 'Remove stale shim',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(
					layout.resolve('plan.base'),
					'php',
					'Stale.php'
				),
				'<?php',
				{ ensureDir: true }
			);
			await workspace.write('php/Stale.php', '<?php', {
				ensureDir: true,
			});

			const ir = await buildIr('Demo', workspaceRoot);
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const exists = await workspace.exists('php/Stale.php');
			expect(exists).toBe(false);

			const manifestPath = layout.resolve('patch.manifest');
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
			expect(manifest.records).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						file: 'php/Stale.php',
						status: 'applied',
						details: { action: 'delete' },
					}),
				])
			);
			expect(manifest.actions).toEqual(
				expect.arrayContaining([manifestPath, 'php/Stale.php'])
			);
			expect(output.actions.map((action) => action.file)).toEqual([
				manifestPath,
			]);
		});
	});

	it('skips shim deletion when the target differs from the base snapshot', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const layout = await loadTestLayout({ cwd: workspaceRoot });

			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'delete',
								file: 'php/Edited.php',
								description: 'Remove edited shim',
							},
						],
					},
					null,
					2
				)
			);

			const baseContents = '<?php // base shim\n';
			const editedContents = [
				'<?php // base shim',
				'// author edit',
			].join('\n');

			await workspace.write(
				path.posix.join(
					layout.resolve('plan.base'),
					'php',
					'Edited.php'
				),
				baseContents,
				{ ensureDir: true }
			);
			await workspace.write('php/Edited.php', editedContents, {
				ensureDir: true,
			});

			const ir = await buildIr('Demo', workspaceRoot);
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestPath = layout.resolve('patch.manifest');
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 1,
			});
			expect(manifest.records).toEqual([
				expect.objectContaining({
					file: 'php/Edited.php',
					status: 'skipped',
					details: { reason: 'modified-target', action: 'delete' },
				}),
			]);

			const existsContents = await workspace.readText('php/Edited.php');
			expect(existsContents).toBe(editedContents);
		});
	});

	it('records planned deletion skips in the manifest', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const layout = await loadTestLayout({ cwd: workspaceRoot });

			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [],
						skippedDeletions: [
							{
								file: 'php/Legacy.php',
								description: 'Remove legacy shim',
								reason: 'modified-target',
							},
						],
					},
					null,
					2
				)
			);

			const ir = await buildIr('Demo', workspaceRoot);
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply' as const,
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const manifestPath = layout.resolve('patch.manifest');
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 1,
			});
			expect(manifest.records).toEqual([
				expect.objectContaining({
					file: 'php/Legacy.php',
					status: 'skipped',
					description: 'Remove legacy shim',
					details: {
						action: 'delete',
						reason: 'modified-target',
					},
				}),
			]);
			expect(output.actions.map((action) => action.file)).toEqual([
				manifestPath,
			]);
		});
	});

	it('throws a wpk error when the plan JSON is invalid', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const layout = await loadTestLayout({ cwd: workspaceRoot });

			await workspace.write(
				layout.resolve('plan.manifest'),
				'{ invalid json ]'
			);

			const ir = await buildIr('Demo', workspaceRoot);
			const input = {
				phase: 'apply' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
				},
				ir,
			};

			const builder = createPatcher();
			await expect(
				builder.apply(
					{
						context: {
							workspace,
							reporter,
							phase: 'apply' as const,
							generationState: buildEmptyGenerationState(),
						},
						input,
						output,
						reporter,
					},
					undefined
				)
			).rejects.toMatchObject({ name: 'WPKernelError' });
		});
	});
});

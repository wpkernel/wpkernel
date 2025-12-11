import path from 'node:path';
import { buildWorkspace } from '../../workspace';
import { createPatcher } from '../patcher';
import type { BuilderOutput } from '../../runtime/types';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { makeIr } from '@cli-tests/ir.test-support';
import {
	withWorkspace as baseWithWorkspace,
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import type { BuilderHarnessContext } from '@cli-tests/builders/builder-harness.test-support';

type PatcherWorkspaceContext = BuilderHarnessContext<
	ReturnType<typeof buildWorkspace>
>;

const buildPlanArtifacts = () => {
	const ir = makeIr();
	return { ir, plan: ir.artifacts.plan };
};

const withWorkspace = (
	run: (context: PatcherWorkspaceContext) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root) => buildWorkspace(root),
	});

describe('createPatcher', () => {
	it('records conflicts when merge cannot be resolved automatically', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const { ir, plan } = buildPlanArtifacts();

			const base = ['line-one', 'line-two', ''].join('\n');
			const incoming = ['line-one updated', 'line-two', ''].join('\n');
			const current = ['line-one user', 'line-two', ''].join('\n');

			await workspace.write(
				plan.planManifestPath,
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/Conflict.php',
								base: path.posix.join(
									plan.planBaseDir,
									'php/Conflict.php'
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
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
				path.posix.join(plan.planBaseDir, 'php', 'Conflict.php'),
				base
			);
			await workspace.write(
				path.posix.join(plan.planIncomingDir, 'php', 'Conflict.php'),
				incoming
			);
			await workspace.write('php/Conflict.php', current, {
				ensureDir: true,
			});

			const input = {
				phase: 'apply' as const,
				options: {
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

			const manifestRaw = await workspace.readText(
				plan.patchManifestPath
			);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});
			expect(manifest.actions).toEqual(
				expect.arrayContaining([
					'php/Conflict.php',
					plan.patchManifestPath,
				])
			);
			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining([
					'php/Conflict.php',
					plan.patchManifestPath,
				])
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

			const { ir } = buildPlanArtifacts();
			const input = {
				phase: 'apply' as const,
				options: {
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
			const { ir, plan } = buildPlanArtifacts();

			await workspace.write(
				plan.planManifestPath,
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: './',
								base: path.posix.join(
									plan.planBaseDir,
									'placeholder.txt'
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
									'missing.txt'
								),
								description: 'missing incoming',
							},
							{
								action: 'write',
								file: 'php/Skip.php',
								base: path.posix.join(
									plan.planBaseDir,
									'php/Skip.php'
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
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
				path.posix.join(plan.planBaseDir, 'php', 'Skip.php'),
				'base'
			);

			const input = {
				phase: 'apply' as const,
				options: {
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

			const manifestPath = plan.patchManifestPath;
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
						details: expect.objectContaining({
							reason: 'empty-target',
						}),
					}),
					expect.objectContaining({
						file: 'php/Skip.php',
						status: 'skipped',
						details: expect.objectContaining({
							reason: 'missing-incoming',
						}),
					}),
				])
			);
			expect(manifest.actions).toEqual([plan.patchManifestPath]);
			expect(output.actions.map((action) => action.file)).toEqual([
				plan.patchManifestPath,
			]);
			expect(reporter.warn).toHaveBeenCalled();
		});
	});

	it('skips when incoming matches the current target', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const { ir, plan } = buildPlanArtifacts();

			const sharedContents = ['<?php', 'echo "noop";', ''].join('\n');

			await workspace.write(
				plan.planManifestPath,
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/Noop.php',
								base: path.posix.join(
									plan.planBaseDir,
									'php/Noop.php'
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
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
				path.posix.join(plan.planBaseDir, 'php', 'Noop.php'),
				sharedContents
			);
			await workspace.write(
				path.posix.join(plan.planIncomingDir, 'php', 'Noop.php'),
				sharedContents
			);
			await workspace.write('php/Noop.php', sharedContents, {
				ensureDir: true,
			});

			const input = {
				phase: 'apply' as const,
				options: {
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

			const manifestPath = plan.patchManifestPath;
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
				plan.patchManifestPath,
			]);
		});
	});

	it('applies deletion instructions for stale shims', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const { ir, plan } = buildPlanArtifacts();

			await workspace.write(
				plan.planManifestPath,
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
				path.posix.join(plan.planBaseDir, 'php', 'Stale.php'),
				'<?php',
				{ ensureDir: true }
			);
			await workspace.write('php/Stale.php', '<?php', {
				ensureDir: true,
			});

			const input = {
				phase: 'apply' as const,
				options: {
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

			const manifestPath = plan.patchManifestPath;
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
				plan.patchManifestPath,
			]);
		});
	});

	it('skips shim deletion when the target differs from the base snapshot', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const { ir, plan } = buildPlanArtifacts();

			await workspace.write(
				plan.planManifestPath,
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
				path.posix.join(plan.planBaseDir, 'php', 'Edited.php'),
				baseContents,
				{ ensureDir: true }
			);
			await workspace.write('php/Edited.php', editedContents, {
				ensureDir: true,
			});

			const input = {
				phase: 'apply' as const,
				options: {
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

			const manifestPath = plan.patchManifestPath;
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
			const { ir, plan } = buildPlanArtifacts();

			await workspace.write(
				plan.planManifestPath,
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

			const input = {
				phase: 'apply' as const,
				options: {
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

			const manifestPath = plan.patchManifestPath;
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
			const { ir, plan } = buildPlanArtifacts();

			await workspace.write(plan.planManifestPath, '{ invalid json ]');

			const input = {
				phase: 'apply' as const,
				options: {
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

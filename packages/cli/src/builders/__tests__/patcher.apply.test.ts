import { type BuilderOutput } from '@wpkernel/php-json-ast';
import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '@wpkernel/wp-json-ast';
import path from 'node:path';
import {
	withWorkspace as baseWithWorkspace,
	buildReporter,
	buildOutput,
	type BuilderHarnessContext,
} from '@cli-tests/builders/builder-harness.test-support';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { createPatcher } from '../patcher';
import { makeIr } from '@cli-tests/ir.test-support';
import { buildWorkspace } from '../../workspace';

type PatcherWorkspaceContext = BuilderHarnessContext<
	ReturnType<typeof buildWorkspace>
>;

const buildPlanArtifacts = () => {
	const ir = makeIr();
	const plan = ir.artifacts.plan;
	const phpGeneratedDir = path.posix.dirname(
		ir.artifacts.php?.pluginLoaderPath ?? ''
	);
	return { ir, plan, phpGeneratedDir };
};

const withWorkspace = (
	run: (context: PatcherWorkspaceContext) => Promise<void>
) =>
	baseWithWorkspace(run, { createWorkspace: (root) => buildWorkspace(root) });

describe('patcher.apply', () => {
	it('applies git merge patches and records manifest', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const { ir, plan, phpGeneratedDir } = buildPlanArtifacts();

			const baseContents = [
				'<?php',
				'class JobController {',
				'    public function handle() {}',
				'}',
				'',
			].join('\n');
			const incomingContents = [
				'<?php',
				`require_once __DIR__ . '/../${phpGeneratedDir}/Rest/JobController.php';`,
				'class JobController extends \\WPKernel\\Generated\\Rest\\JobController {',
				'    public function handle() {',
				'        parent::handle();',
				'    }',
				'}',
				'',
			].join('\n');

			await workspace.write(
				plan.planManifestPath,
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/JobController.php',
								base: path.posix.join(
									plan.planBaseDir,
									'php/JobController.php'
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
									'php/JobController.php'
								),
								description: 'Update Job controller shim',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(plan.planBaseDir, 'php', 'JobController.php'),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					plan.planIncomingDir,
					'php',
					'JobController.php'
				),
				incomingContents
			);
			await workspace.write('php/JobController.php', baseContents, {
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

			const updated = await workspace.readText('php/JobController.php');
			expect(updated).toBe(incomingContents);

			const manifestPath = plan.patchManifestPath;
			const basePath = path.posix.join(
				plan.planBaseDir,
				'php',
				'JobController.php'
			);
			const manifestRaw = await workspace.readText(manifestPath);
			expect(manifestRaw).toBeTruthy();
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
			expect(manifest.records).toEqual([
				expect.objectContaining({
					file: 'php/JobController.php',
					status: 'applied',
					description: 'Update Job controller shim',
				}),
			]);
			expect(manifest.actions).toEqual(
				expect.arrayContaining([
					'php/JobController.php',
					manifestPath,
					basePath,
				])
			);

			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining([
					'php/JobController.php',
					manifestPath,
					basePath,
				])
			);
			const updatedBase = await workspace.readText(basePath);
			expect(updatedBase).toBe(incomingContents);
			expect(reporter.info).toHaveBeenCalledWith(
				'createPatcher: completed patch application.',
				expect.objectContaining({ summary: expect.any(Object) })
			);
		});
	});

	it('restores shim when the target file is missing', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();

			const baseContents = '<?php /* base */';
			const incomingContents = '<?php /* incoming */';

			const { ir, plan } = buildPlanArtifacts();
			await workspace.write(
				plan.planManifestPath,
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/JobController.php',
								base: path.posix.join(
									plan.planBaseDir,
									'php/JobController.php'
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
									'php/JobController.php'
								),
								description: 'Update Job controller shim',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(plan.planBaseDir, 'php', 'JobController.php'),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					plan.planIncomingDir,
					'php',
					'JobController.php'
				),
				incomingContents
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

			const updated = await workspace.readText('php/JobController.php');
			expect(updated).toBe(incomingContents);
		});
	});

	it('restores shim when the target file is empty', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();

			const baseContents = '<?php /* base */';
			const incomingContents = '<?php /* incoming */';

			const { ir, plan } = buildPlanArtifacts();
			await workspace.write(
				plan.planManifestPath,
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/JobController.php',
								base: path.posix.join(
									plan.planBaseDir,
									'php/JobController.php'
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
									'php/JobController.php'
								),
								description: 'Update Job controller shim',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(plan.planBaseDir, 'php', 'JobController.php'),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					plan.planIncomingDir,
					'php',
					'JobController.php'
				),
				incomingContents
			);
			await workspace.write('php/JobController.php', '', {
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

			const updated = await workspace.readText('php/JobController.php');
			expect(updated).toBe(incomingContents);
		});
	});

	it('applies patch instructions during generate phase', async () => {
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
								file: 'php/JobController.php',
								base: path.posix.join(
									plan.planBaseDir,
									'php/JobController.php'
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
									'php/JobController.php'
								),
								description: 'Update Job controller shim',
							},
						],
					},
					null,
					2
				)
			);

			const baseContents = `<?php
	// ${AUTO_GUARD_BEGIN}
	require_once __DIR__ . '/generated.php';
	// ${AUTO_GUARD_END}
	`;
			const incomingContents = `<?php
	// ${AUTO_GUARD_BEGIN}
	require_once __DIR__ . '/generated.php';
	// ${AUTO_GUARD_END}
	do_action('demo_loaded');
			`;

			await workspace.write(
				path.posix.join(plan.planBaseDir, 'php', 'JobController.php'),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					plan.planIncomingDir,
					'php',
					'JobController.php'
				),
				incomingContents
			);
			await workspace.write('php/JobController.php', baseContents, {
				ensureDir: true,
			});

			const input = {
				phase: 'generate' as const,
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
						phase: 'generate' as const,
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
			expect(manifestRaw).toBeTruthy();
			expect(reporter.info).toHaveBeenCalledWith(
				'createPatcher: completed patch application.',
				expect.objectContaining({ summary: expect.any(Object) })
			);
		});
	});

	it('applies plugin loader updates when the guard is intact', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const { ir, plan } = buildPlanArtifacts();

			const baseLoader = [
				'<?php',
				`// ${AUTO_GUARD_BEGIN}`,
				"require_once __DIR__ . '/generated.php';",
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');
			const incomingLoader = [
				'<?php',
				`// ${AUTO_GUARD_BEGIN}`,
				"require_once __DIR__ . '/generated.php';",
				'bootstrap_wpk();',
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');

			const pluginLoaderPath = ir.artifacts.php.pluginLoaderPath;
			await workspace.write(
				plan.planManifestPath,
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: pluginLoaderPath,
								base: path.posix.join(
									plan.planBaseDir,
									pluginLoaderPath
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
									pluginLoaderPath
								),
								description: 'Update plugin loader',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(plan.planBaseDir, pluginLoaderPath),
				baseLoader,
				{ ensureDir: true }
			);
			await workspace.write(
				path.posix.join(plan.planIncomingDir, pluginLoaderPath),
				incomingLoader,
				{ ensureDir: true }
			);
			await workspace.write(pluginLoaderPath, baseLoader, {
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

			const updated = await workspace.readText(pluginLoaderPath);
			expect(updated).toBe(incomingLoader);

			const baseSnapshot = await workspace.readText(
				path.posix.join(plan.planBaseDir, pluginLoaderPath)
			);
			expect(baseSnapshot).toBe(incomingLoader);

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
						file: pluginLoaderPath,
						status: 'applied',
					}),
				])
			);
		});
	});

	it('preserves custom loaders when the guard is missing', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const { ir, plan } = buildPlanArtifacts();

			const baseLoader = [
				'<?php',
				`// ${AUTO_GUARD_BEGIN}`,
				"require_once __DIR__ . '/generated.php';",
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');
			const incomingLoader = [
				'<?php',
				`// ${AUTO_GUARD_BEGIN}`,
				"require_once __DIR__ . '/generated.php';",
				'bootstrap_wpk();',
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');
			const customLoader = [
				'<?php',
				'// custom bootstrap',
				'do_custom_bootstrap();',
				'',
			].join('\n');

			const pluginLoaderPath = ir.artifacts.php.pluginLoaderPath;
			await workspace.write(
				plan.planManifestPath,
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: pluginLoaderPath,
								base: path.posix.join(
									plan.planBaseDir,
									pluginLoaderPath
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
									pluginLoaderPath
								),
								description: 'Update plugin loader',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(plan.planBaseDir, pluginLoaderPath),
				baseLoader,
				{ ensureDir: true }
			);
			await workspace.write(
				path.posix.join(plan.planIncomingDir, pluginLoaderPath),
				incomingLoader,
				{ ensureDir: true }
			);
			await workspace.write(pluginLoaderPath, customLoader, {
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

			const merged = await workspace.readText(pluginLoaderPath);
			expect(merged).toContain('custom bootstrap');
			expect(merged).toContain('<<<<<<<');

			const baseSnapshot = await workspace.readText(
				path.posix.join(plan.planBaseDir, pluginLoaderPath)
			);
			expect(baseSnapshot).toBe(baseLoader);

			const manifestPath = plan.patchManifestPath;
			const manifestRaw = await workspace.readText(manifestPath);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});
			expect(manifest.records).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						file: pluginLoaderPath,
						status: 'conflict',
					}),
				])
			);
		});
	});

	it('merges shim updates while preserving user edits', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const { ir, plan, phpGeneratedDir } = buildPlanArtifacts();

			const baseContents = [
				'<?php',
				`require_once __DIR__ . '/../${phpGeneratedDir}/Rest/JobController.php';`,
				'class JobController extends \\Demo\\Plugin\\Generated\\Rest\\JobController',
				'{',
				'}',
				'',
			].join('\n');
			const incomingContents = [
				'<?php',
				`require_once __DIR__ . '/../../${phpGeneratedDir}/Rest/JobController.php';`,
				'class JobController extends \\Demo\\Plugin\\Generated\\Rest\\JobController',
				'{',
				'}',
				'',
			].join('\n');
			const currentContents = [
				'<?php',
				`require_once __DIR__ . '/../${phpGeneratedDir}/Rest/JobController.php';`,
				'class JobController extends \\Demo\\Plugin\\Generated\\Rest\\JobController',
				'{',
				'    public function custom()',
				'    {',
				'        return true;',
				'    }',
				'}',
				'',
			].join('\n');

			await workspace.write(
				plan.planManifestPath,
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/JobController.php',
								base: path.posix.join(
									plan.planBaseDir,
									'php/JobController.php'
								),
								incoming: path.posix.join(
									plan.planIncomingDir,
									'php/JobController.php'
								),
								description: 'Update Job controller shim',
							},
						],
					},
					null,
					2
				)
			);

			await workspace.write(
				path.posix.join(plan.planBaseDir, 'php', 'JobController.php'),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					plan.planIncomingDir,
					'php',
					'JobController.php'
				),
				incomingContents
			);
			await workspace.write('php/JobController.php', currentContents, {
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

			const updated = await workspace.readText('php/JobController.php');
			expect(updated).toContain(
				`require_once __DIR__ . '/../../${phpGeneratedDir}/Rest/JobController.php';`
			);
			expect(updated).toContain('public function custom()');

			const manifestRaw = await workspace.readText(
				plan.patchManifestPath
			);
			const manifest = JSON.parse(manifestRaw ?? '{}');
			expect(manifest.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
		});
	});
});

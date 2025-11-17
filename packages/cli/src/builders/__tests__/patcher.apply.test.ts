import { type BuilderOutput } from '@wpkernel/php-json-ast';
import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '@wpkernel/wp-json-ast';
import path from 'node:path';
import {
	withWorkspace as baseWithWorkspace,
	buildReporter,
	buildOutput,
	type BuilderHarnessContext,
} from '@wpkernel/test-utils/builders/tests/builder-harness.test-support';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { type IRv1 } from '../../ir';
import { createPatcher } from '../patcher';
import { makeIrMeta } from '../../tests/ir.test-support';
import { buildWorkspace } from '../../workspace';
import { loadTestLayoutSync } from '../../tests/layout.test-support';

type PatcherWorkspaceContext = BuilderHarnessContext<
	ReturnType<typeof buildWorkspace>
>;

const withWorkspace = (
	run: (context: PatcherWorkspaceContext) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root) => buildWorkspace(root),
	});

async function buildIr(namespace: string): Promise<IRv1> {
	const layout = loadTestLayoutSync();
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
		layout,
	} satisfies IRv1;
}

describe('patcher.apply', () => {
	it('applies git merge patches and records manifest', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const layout = loadTestLayoutSync();

			const baseContents = [
				'<?php',
				'class JobController {',
				'    public function handle() {}',
				'}',
				'',
			].join('\n');
			const incomingContents = [
				'<?php',
				`require_once __DIR__ . '/../${layout.resolve('php.generated')}/Rest/JobController.php';`,
				'class JobController extends \\WPKernel\\Generated\\Rest\\JobController {',
				'    public function handle() {',
				'        parent::handle();',
				'    }',
				'}',
				'',
			].join('\n');

			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/JobController.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'php/JobController.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
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
				path.posix.join(
					layout.resolve('plan.base'),
					'php',
					'JobController.php'
				),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					layout.resolve('plan.incoming'),
					'php',
					'JobController.php'
				),
				incomingContents
			);
			await workspace.write('php/JobController.php', baseContents, {
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

			const updated = await workspace.readText('php/JobController.php');
			expect(updated).toBe(incomingContents);

			const manifestPath = layout.resolve('patch.manifest');
			const basePath = path.posix.join(
				layout.resolve('plan.base'),
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

			const layout = loadTestLayoutSync();
			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/JobController.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'php/JobController.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
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
				path.posix.join(
					layout.resolve('plan.base'),
					'php',
					'JobController.php'
				),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					layout.resolve('plan.incoming'),
					'php',
					'JobController.php'
				),
				incomingContents
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

			const layout = loadTestLayoutSync();
			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/JobController.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'php/JobController.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
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
				path.posix.join(
					layout.resolve('plan.base'),
					'php',
					'JobController.php'
				),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					layout.resolve('plan.incoming'),
					'php',
					'JobController.php'
				),
				incomingContents
			);
			await workspace.write('php/JobController.php', '', {
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

			const updated = await workspace.readText('php/JobController.php');
			expect(updated).toBe(incomingContents);
		});
	});

	it('applies patch instructions during generate phase', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const reporter = buildReporter();
			const output = buildOutput<BuilderOutput['actions'][number]>();
			const layout = loadTestLayoutSync();

			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/JobController.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'php/JobController.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
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
				path.posix.join(
					layout.resolve('plan.base'),
					'php',
					'JobController.php'
				),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					layout.resolve('plan.incoming'),
					'php',
					'JobController.php'
				),
				incomingContents
			);
			await workspace.write('php/JobController.php', baseContents, {
				ensureDir: true,
			});

			const ir = await buildIr('Demo', workspaceRoot);
			const input = {
				phase: 'generate' as const,
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
						phase: 'generate' as const,
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
				'bootstrap_kernel();',
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');

			const layout = loadTestLayoutSync();
			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'plugin.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'plugin.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
									'plugin.php'
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
				path.posix.join(layout.resolve('plan.base'), 'plugin.php'),
				baseLoader,
				{ ensureDir: true }
			);
			await workspace.write(
				path.posix.join(layout.resolve('plan.incoming'), 'plugin.php'),
				incomingLoader,
				{ ensureDir: true }
			);
			await workspace.write('plugin.php', baseLoader, {
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

			const updated = await workspace.readText('plugin.php');
			expect(updated).toBe(incomingLoader);

			const baseSnapshot = await workspace.readText(
				path.posix.join(layout.resolve('plan.base'), 'plugin.php')
			);
			expect(baseSnapshot).toBe(incomingLoader);

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
						file: 'plugin.php',
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
				'bootstrap_kernel();',
				`// ${AUTO_GUARD_END}`,
				'',
			].join('\n');
			const customLoader = [
				'<?php',
				'// custom bootstrap',
				'do_custom_bootstrap();',
				'',
			].join('\n');

			const layout = loadTestLayoutSync();
			await workspace.write(
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'plugin.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'plugin.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
									'plugin.php'
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
				path.posix.join(layout.resolve('plan.base'), 'plugin.php'),
				baseLoader,
				{ ensureDir: true }
			);
			await workspace.write(
				path.posix.join(layout.resolve('plan.incoming'), 'plugin.php'),
				incomingLoader,
				{ ensureDir: true }
			);
			await workspace.write('plugin.php', customLoader, {
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

			const merged = await workspace.readText('plugin.php');
			expect(merged).toContain('custom bootstrap');
			expect(merged).toContain('<<<<<<<');

			const baseSnapshot = await workspace.readText(
				path.posix.join(layout.resolve('plan.base'), 'plugin.php')
			);
			expect(baseSnapshot).toBe(baseLoader);

			const manifestPath = layout.resolve('patch.manifest');
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
						file: 'plugin.php',
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

			const layout = loadTestLayoutSync();
			const phpGenerated = layout.resolve('php.generated');
			const baseContents = [
				'<?php',
				`require_once __DIR__ . '/../${phpGenerated}/Rest/JobController.php';`,
				'class JobController extends \\Demo\\Plugin\\Generated\\Rest\\JobController',
				'{',
				'}',
				'',
			].join('\n');
			const incomingContents = [
				'<?php',
				`require_once __DIR__ . '/../../${phpGenerated}/Rest/JobController.php';`,
				'class JobController extends \\Demo\\Plugin\\Generated\\Rest\\JobController',
				'{',
				'}',
				'',
			].join('\n');
			const currentContents = [
				'<?php',
				`require_once __DIR__ . '/../${phpGenerated}/Rest/JobController.php';`,
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
				layout.resolve('plan.manifest'),
				JSON.stringify(
					{
						instructions: [
							{
								action: 'write',
								file: 'php/JobController.php',
								base: path.posix.join(
									layout.resolve('plan.base'),
									'php/JobController.php'
								),
								incoming: path.posix.join(
									layout.resolve('plan.incoming'),
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
				path.posix.join(
					layout.resolve('plan.base'),
					'php',
					'JobController.php'
				),
				baseContents
			);
			await workspace.write(
				path.posix.join(
					layout.resolve('plan.incoming'),
					'php',
					'JobController.php'
				),
				incomingContents
			);
			await workspace.write('php/JobController.php', currentContents, {
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

			const updated = await workspace.readText('php/JobController.php');
			expect(updated).toContain(
				`require_once __DIR__ . '/../../${phpGenerated}/Rest/JobController.php';`
			);
			expect(updated).toContain('public function custom()');

			const manifestRaw = await workspace.readText(
				layout.resolve('patch.manifest')
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

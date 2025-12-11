import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { createApplyPlanBuilder } from '../plan';
import { buildWorkspace } from '../../workspace';
import {
	buildEmptyGenerationState,
	GENERATION_STATE_VERSION,
} from '../../apply/manifest';
import { makeIr } from '@cli-tests/ir.test-support';
import type { GenerationManifest } from '../../apply/manifest';
import { createReporterMock } from '@cli-tests/reporter';
import { buildOutput } from '@cli-tests/builders/builder-harness.test-support';
import { resolvePlanPaths } from '../plan.paths';

const DEFAULT_PLAN_MANIFEST_PATH = makeIr().artifacts.plan.planManifestPath;

function seedBlockArtifacts(ir: ReturnType<typeof makeIr>) {
	const generated = ir.artifacts.blockRoots.generated;
	const applied = ir.artifacts.blockRoots.applied;
	ir.artifacts.blocks = {
		[`${ir.meta.namespace}-block`]: {
			key: 'demo',
			appliedDir: applied,
			generatedDir: generated,
			jsonPath: path.posix.join(generated, 'demo/block.json'),
			tsEntry: path.posix.join(generated, 'demo/index.tsx'),
			tsView: path.posix.join(generated, 'demo/view.tsx'),
			tsHelper: path.posix.join(generated, 'demo/helper.ts'),
			mode: 'js',
			phpRenderPath: undefined,
		},
	};
}

async function withTempWorkspace(
	run: (context: {
		root: string;
		workspace: ReturnType<typeof buildWorkspace>;
	}) => Promise<void>
): Promise<void> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-plan-'));
	const workspace = buildWorkspace(root);
	try {
		await run({ root, workspace });
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

async function runPlan(options: {
	root: string;
	workspace: ReturnType<typeof buildWorkspace>;
	ir?: ReturnType<typeof makeIr> | null;
	generationState?: GenerationManifest;
	planPath?: string;
}): Promise<{ plan: any; reporter: ReturnType<typeof createReporterMock> }> {
	const irArg =
		options.ir === undefined
			? makeIr()
			: (options.ir as ReturnType<typeof makeIr> | null);
	const optsSeed = irArg ?? makeIr();
	const config = {
		version: 1 as const,
		namespace: optsSeed.meta.namespace,
		schemas: {},
		resources: {},
	};
	const reporter = createReporterMock();
	const output = buildOutput();
	const helper = createApplyPlanBuilder();
	const generationState =
		options.generationState ?? buildEmptyGenerationState();

	await helper.apply({
		context: {
			workspace: options.workspace,
			reporter,
			phase: 'generate',
			generationState,
		},
		input: {
			phase: 'generate',
			options: {
				namespace: config.namespace,
				origin: optsSeed.meta.origin,
				sourcePath: path.join(options.root, 'wpk.config.ts'),
			},
			ir: irArg,
		},
		output,
		reporter,
	});

	const planRaw = await options.workspace.readText(
		options.planPath ??
			options.ir?.artifacts?.plan?.planManifestPath ??
			DEFAULT_PLAN_MANIFEST_PATH
	);
	return { plan: JSON.parse(planRaw ?? '{}'), reporter };
}

describe('plan (orchestrator)', () => {
	it('emits loader, shim, and block surfacing instructions with default layout', async () => {
		await withTempWorkspace(async ({ root, workspace }) => {
			const ir = makeIr();
			const generatedRoot = ir.artifacts.blockRoots.generated;
			const generated = path.join(root, generatedRoot, 'demo');
			await fs.mkdir(generated, { recursive: true });
			await fs.writeFile(path.join(generated, 'index.tsx'), '// block');
			// seed bundler + vite artifacts so plan builder picks them up
			const planPaths = resolvePlanPaths({
				context: {
					workspace,
					reporter: createReporterMock(),
					phase: 'generate',
					generationState: buildEmptyGenerationState(),
				},
				input: {
					phase: 'generate',
					options: {
						config: {
							version: 1 as const,
							namespace: 'demo',
							schemas: {},
							resources: {},
						},
						namespace: 'demo',
						origin: 'wpk.config.ts',
						sourcePath: path.join(root, 'wpk.config.ts'),
					},
					ir,
				},
				output: buildOutput(),
				reporter: createReporterMock(),
			} as unknown as Parameters<typeof resolvePlanPaths>[0]);

			await workspace.writeJson(
				planPaths.bundlerConfig,
				{ driver: 'rollup' },
				{ ensureDir: true }
			);
			await workspace.write(planPaths.viteConfig, '// vite config', {
				ensureDir: true,
			});

			const irWithResources = makeIr({
				resources: [
					{
						name: 'jobs',
						schemaKey: 'jobs',
						schemaProvenance: 'manual',
						routes: [],
						hash: {
							algo: 'sha256',
							inputs: ['resource'],
							value: 'hash',
						},
						warnings: [],
					},
				],
			});
			seedBlockArtifacts(irWithResources);

			const { plan } = await runPlan({
				root,
				workspace,
				ir: irWithResources,
			});

			const plugin = plan.instructions?.find(
				(instr: any) =>
					instr.file ===
					irWithResources.artifacts.php.pluginLoaderPath
			);
			expect(plugin).toMatchObject({
				base: path.posix.join(
					irWithResources.artifacts.plan.planBaseDir,
					irWithResources.artifacts.php.pluginLoaderPath
				),
				incoming: path.posix.join(
					irWithResources.artifacts.plan.planIncomingDir,
					irWithResources.artifacts.php.pluginLoaderPath
				),
			});

			const shim = plan.instructions?.find((instr: any) =>
				instr.file?.endsWith('inc/Rest/JobsController.php')
			);
			expect(shim).toMatchObject({
				base: path.posix.join(
					irWithResources.artifacts.plan.planBaseDir,
					'inc/Rest/JobsController.php'
				),
				incoming: path.posix.join(
					irWithResources.artifacts.plan.planIncomingDir,
					'inc/Rest/JobsController.php'
				),
			});

			const blockSurfacing = plan.instructions?.find((instr: any) =>
				instr.file?.endsWith(
					path.posix.join(
						irWithResources.artifacts.blockRoots.applied,
						'demo/index.tsx'
					)
				)
			);
			expect(blockSurfacing).toBeDefined();

			const bundlerConfigInstruction = plan.instructions?.find(
				(instr: any) => instr.file === ir.artifacts.bundler.configPath
			);
			expect(bundlerConfigInstruction).toMatchObject({
				action: 'write',
				base: path.posix.join(
					irWithResources.artifacts.plan.planBaseDir,
					ir.artifacts.bundler.configPath
				),
				incoming: path.posix.join(
					irWithResources.artifacts.plan.planIncomingDir,
					ir.artifacts.bundler.configPath
				),
			});

			const viteInstruction = plan.instructions?.find(
				(instr: any) => instr.file === planPaths.viteConfig
			);
			expect(viteInstruction).toMatchObject({
				action: 'write',
				base: path.posix.join(
					irWithResources.artifacts.plan.planBaseDir,
					planPaths.viteConfig
				),
				incoming: path.posix.join(
					irWithResources.artifacts.plan.planIncomingDir,
					planPaths.viteConfig
				),
			});
		});
	});

	it('writes plan to custom layout paths and uses custom plugin loader path', async () => {
		await withTempWorkspace(async ({ root, workspace }) => {
			const ir = makeIr();
			ir.artifacts.plan = {
				...ir.artifacts.plan,
				planManifestPath: 'custom/plan.json',
				planBaseDir: 'base-dir',
				planIncomingDir: 'incoming-dir',
				patchManifestPath: 'custom/patch.json',
			};
			ir.artifacts.blockRoots = {
				applied: 'surfaced-blocks',
				generated: 'generated-blocks',
			};
			ir.artifacts.php = {
				...ir.artifacts.php,
				pluginLoaderPath: 'custom/plugin.php',
			};
			await workspace.write(ir.artifacts.bundler.configPath, '{}', {
				ensureDir: true,
			});
			await workspace.write('vite.config.ts', '// vite config', {
				ensureDir: true,
			});

			seedBlockArtifacts(ir);

			const { plan } = await runPlan({
				root,
				workspace,
				ir,
				planPath: ir.artifacts.plan.planManifestPath,
			});

			const plugin = plan.instructions?.find(
				(instr: any) => instr.file === ir.artifacts.php.pluginLoaderPath
			);
			expect(plugin).toMatchObject(
				expect.objectContaining({
					base: path.posix.join(
						ir.artifacts.plan.planBaseDir,
						ir.artifacts.php.pluginLoaderPath
					),
					incoming: path.posix.join(
						ir.artifacts.plan.planIncomingDir,
						ir.artifacts.php.pluginLoaderPath
					),
				})
			);
		});
	});

	it('emits deletion instruction for removed shims when snapshots match', async () => {
		await withTempWorkspace(async ({ root, workspace }) => {
			const ir = makeIr({ resources: [] });
			const shimPath = 'inc/Rest/JobsController.php';
			const basePath = path.join(
				root,
				ir.artifacts.plan.planBaseDir,
				shimPath
			);
			await fs.mkdir(path.dirname(basePath), { recursive: true });
			const contents = '<?php // base';
			await fs.writeFile(basePath, contents);
			const targetPath = path.join(root, shimPath);
			await fs.mkdir(path.dirname(targetPath), { recursive: true });
			await fs.writeFile(targetPath, contents);

			const { plan } = await runPlan({
				root,
				workspace,
				ir,
				generationState: {
					version: GENERATION_STATE_VERSION,
					resources: {
						jobs: {
							hash: 'hash',
							artifacts: { generated: [], shims: [shimPath] },
						},
					},
				},
			});

			expect(plan.skippedDeletions).toEqual([]);
			expect(plan.instructions).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						action: 'delete',
						file: shimPath,
					}),
				])
			);
		});
	});

	it('skips plugin loader when an unguarded user plugin exists', async () => {
		await withTempWorkspace(async ({ root, workspace }) => {
			const ir = makeIr();
			const pluginLoaderPath = ir.artifacts.php.pluginLoaderPath;
			await fs.writeFile(
				path.join(root, pluginLoaderPath),
				'<?php // user loader'
			);
			const { plan } = await runPlan({ root, workspace, ir });
			const plugin = plan.instructions?.find(
				(instr: any) => instr.file === pluginLoaderPath
			);
			expect(plugin).toBeDefined();
		});
	});

	it('warns and emits no instructions when IR is missing', async () => {
		await withTempWorkspace(async ({ root, workspace }) => {
			await expect(
				runPlan({
					root,
					workspace,
					ir: null,
				})
			).rejects.toMatchObject({
				message: 'Plan paths cannot be resolved without an IR.',
			});
		});
	});
});

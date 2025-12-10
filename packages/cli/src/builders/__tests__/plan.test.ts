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
import {
	loadTestLayout,
	loadTestLayoutSync,
} from '@wpkernel/test-utils/layout.test-support';
import { createReporterMock } from '@cli-tests/reporter';
import { buildOutput } from '@cli-tests/builders/builder-harness.test-support';
import { resolvePlanPaths } from '../plan.paths';

function seedBlockArtifacts(
	ir: ReturnType<typeof makeIr>,
	layout: { resolve: (id: string) => string }
) {
	const generated = layout.resolve('blocks.generated');
	const applied = layout.resolve('blocks.applied');
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

	const layout = await loadTestLayout({ cwd: options.workspace.root });
	const planRaw = await options.workspace.readText(
		options.planPath ?? layout.resolve('plan.manifest')
	);
	return { plan: JSON.parse(planRaw ?? '{}'), reporter };
}

describe('plan (orchestrator)', () => {
	it('emits loader, shim, and block surfacing instructions with default layout', async () => {
		await withTempWorkspace(async ({ root, workspace }) => {
			const layout = await loadTestLayout({ cwd: root });
			const generatedRoot = layout.resolve('blocks.generated');
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
					ir: makeIr(),
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

			const ir = makeIr({
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
			seedBlockArtifacts(ir, layout);

			const { plan } = await runPlan({ root, workspace, ir });

			const plugin = plan.instructions?.find(
				(instr: any) => instr.file === layout.resolve('plugin.loader')
			);
			expect(plugin).toMatchObject({
				base: path.posix.join(
					layout.resolve('plan.base'),
					layout.resolve('plugin.loader')
				),
				incoming: path.posix.join(
					layout.resolve('plan.incoming'),
					layout.resolve('plugin.loader')
				),
			});

			const shim = plan.instructions?.find((instr: any) =>
				instr.file?.endsWith('inc/Rest/JobsController.php')
			);
			expect(shim).toMatchObject({
				base:
					layout.resolve('plan.base') +
					'/inc/Rest/JobsController.php',
				incoming:
					layout.resolve('plan.incoming') +
					'/inc/Rest/JobsController.php',
			});

			const blockSurfacing = plan.instructions?.find((instr: any) =>
				instr.file?.endsWith('src/blocks/demo/index.tsx')
			);
			expect(blockSurfacing).toMatchObject({
				base: path.posix.join(
					layout.resolve('plan.base'),
					'src/blocks/demo/index.tsx'
				),
				incoming: path.posix.join(
					layout.resolve('plan.incoming'),
					'src/blocks/demo/index.tsx'
				),
			});

			const bundlerConfigInstruction = plan.instructions?.find(
				(instr: any) => instr.file === layout.resolve('bundler.config')
			);
			expect(bundlerConfigInstruction).toMatchObject({
				action: 'write',
				base: path.posix.join(
					layout.resolve('plan.base'),
					layout.resolve('bundler.config')
				),
				incoming: path.posix.join(
					layout.resolve('plan.incoming'),
					layout.resolve('bundler.config')
				),
			});

			const viteInstruction = plan.instructions?.find(
				(instr: any) => instr.file === planPaths.viteConfig
			);
			expect(viteInstruction).toMatchObject({
				action: 'write',
				base: path.posix.join(
					layout.resolve('plan.base'),
					planPaths.viteConfig
				),
				incoming: path.posix.join(
					layout.resolve('plan.incoming'),
					planPaths.viteConfig
				),
			});
		});
	});

	it('writes plan to custom layout paths and uses custom plugin loader path', async () => {
		await withTempWorkspace(async ({ root, workspace }) => {
			const layout = loadTestLayoutSync();
			const bundlerConfigPath = layout.resolve('bundler.config');
			const bundlerAssetsPath = layout.resolve('bundler.assets');
			const ir = makeIr({
				layout: {
					resolve(id: string) {
						const map: Record<string, string> = {
							'plan.manifest': 'custom/plan.json',
							'plan.base': 'base-dir',
							'plan.incoming': 'incoming-dir',
							'blocks.generated': 'generated-blocks',
							'blocks.applied': 'surfaced-blocks',
							'php.generated': 'generated-php',
							'plugin.loader': 'custom/plugin.php',
							'bundler.config': bundlerConfigPath,
							'bundler.assets': bundlerAssetsPath,
						};
						return map[id] ?? id;
					},
					all: {},
				},
			});
			await workspace.write(ir.layout.resolve('bundler.config'), '{}', {
				ensureDir: true,
			});
			await workspace.write('vite.config.ts', '// vite config', {
				ensureDir: true,
			});

			seedBlockArtifacts(ir, ir.layout);

			const { plan } = await runPlan({
				root,
				workspace,
				ir,
				planPath: path.posix.join('custom', 'plan.json'),
			});

			const plugin = plan.instructions?.find(
				(instr: any) => instr.file === 'custom/plugin.php'
			);
			expect(plugin).toMatchObject(
				expect.objectContaining({
					base: path.posix.join('base-dir', 'custom/plugin.php'),
					incoming: path.posix.join(
						'incoming-dir',
						'custom/plugin.php'
					),
				})
			);
		});
	});

	it('emits deletion instruction for removed shims when snapshots match', async () => {
		await withTempWorkspace(async ({ root, workspace }) => {
			const layout = await loadTestLayout({ cwd: root });
			const shimPath = 'inc/Rest/JobsController.php';
			const basePath = path.join(
				root,
				layout.resolve('plan.base'),
				shimPath
			);
			await fs.mkdir(path.dirname(basePath), { recursive: true });
			const contents = '<?php // base';
			await fs.writeFile(basePath, contents);
			const targetPath = path.join(root, shimPath);
			await fs.mkdir(path.dirname(targetPath), { recursive: true });
			await fs.writeFile(targetPath, contents);

			const ir = makeIr({ resources: [] });
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
			const layout = await loadTestLayout({ cwd: root });
			const pluginLoaderPath = layout.resolve('plugin.loader');
			await fs.writeFile(
				path.join(root, pluginLoaderPath),
				'<?php // user loader'
			);
			const { plan } = await runPlan({ root, workspace, ir: makeIr() });
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

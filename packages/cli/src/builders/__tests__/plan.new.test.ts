import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { createApplyPlanBuilder } from '../plan';
import { buildWorkspace } from '../../workspace';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { makeIr } from '@cli-tests/ir.test-support';
import { createReporterMock } from '@cli-tests/reporter';
import type { BuilderWriteAction } from '../../runtime/types';

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
	populate: (root: string) => Promise<void>,
	run: (root: string) => Promise<void>
): Promise<void> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-plan-'));
	try {
		await populate(root);
		await run(root);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

async function runPlanBuilder(root: string, ir = makeIr()): Promise<void> {
	const workspace = buildWorkspace(root);
	const reporter = createReporterMock();
	const actions: BuilderWriteAction[] = [];
	const helper = createApplyPlanBuilder();

	await helper.apply({
		context: {
			workspace,
			reporter,
			phase: 'generate',
			generationState: buildEmptyGenerationState(),
		},
		input: {
			phase: 'generate',
			options: {
				namespace: ir.meta.namespace,
				origin: ir.meta.origin,
				sourcePath: path.join(root, 'wpk.config.ts'),
			},
			ir,
		},
		output: {
			actions,
			queueWrite: (action) => actions.push(action),
		},
		reporter,
	});
}

describe('apply plan (layout-driven)', () => {
	it('writes plugin loader and shim instructions to layout-derived paths', async () => {
		await withTempWorkspace(
			async () => {},
			async (root) => {
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
				const layout = ir.layout;

				await runPlanBuilder(root, ir);

				const planPath = layout.resolve('plan.manifest');
				const planRaw = await buildWorkspace(root).readText(
					path.posix.join(planPath)
				);
				expect(planRaw).toBeTruthy();
				const plan = JSON.parse(planRaw ?? '{}') as {
					instructions?: Array<{
						file: string;
						base?: string;
						incoming?: string;
					}>;
				};

				const plugin = plan.instructions?.find(
					(instr) => instr.file === layout.resolve('plugin.loader')
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

				const shim = plan.instructions?.find((instr) =>
					instr.file?.endsWith('inc/Rest/JobsController.php')
				);
				expect(shim).toMatchObject({
					base: path.posix.join(
						layout.resolve('plan.base'),
						'inc/Rest/JobsController.php'
					),
					incoming: path.posix.join(
						layout.resolve('plan.incoming'),
						'inc/Rest/JobsController.php'
					),
				});
			}
		);
	});

	it('surfaces generated block assets into the applied blocks path', async () => {
		await withTempWorkspace(
			async (root) => {
				const blockRoots = makeIr().artifacts.blockRoots;
				const generated = path.join(
					root,
					blockRoots.generated,
					'example'
				);
				await fs.mkdir(generated, { recursive: true });
				await fs.writeFile(
					path.join(generated, 'index.tsx'),
					'// block'
				);
			},
			async (root) => {
				const ir = makeIr();
				seedBlockArtifacts(ir);
				await runPlanBuilder(root, ir);

				const planRaw = await buildWorkspace(root).readText(
					path.posix.join(ir.artifacts.plan.planManifestPath)
				);
				const plan = JSON.parse(planRaw ?? '{}') as {
					instructions?: Array<{ file: string }>;
				};

				expect(plan.instructions).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							file: path.posix.join(
								ir.artifacts.blockRoots.applied,
								'example',
								'index.tsx'
							),
						}),
					])
				);
			}
		);
	});

	it('honours custom layout for plugin loader paths', async () => {
		await withTempWorkspace(
			async () => {},
			async (root) => {
				const ir = makeIr();

				seedBlockArtifacts(ir);
				await runPlanBuilder(root, ir);

				const planRaw = await buildWorkspace(root).readText(
					ir.artifacts.plan.planManifestPath
				);
				expect(planRaw).toBeTruthy();
				const plan = JSON.parse(planRaw ?? '{}') as {
					instructions?: Array<{ file: string; base?: string }>;
				};

				const plugin = plan.instructions?.find(
					(instr) => instr.file === ir.artifacts.php.pluginLoaderPath
				);
				expect(plugin).toMatchObject({
					base: path.posix.join(
						ir.artifacts.plan.planBaseDir,
						ir.artifacts.php.pluginLoaderPath
					),
					incoming: path.posix.join(
						ir.artifacts.plan.planIncomingDir,
						ir.artifacts.php.pluginLoaderPath
					),
				});
			}
		);
	});
});

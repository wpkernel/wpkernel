import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { createApplyPlanBuilder } from '../plan';
import { buildWorkspace } from '../../workspace';
import {
	buildEmptyGenerationState,
	GENERATION_STATE_VERSION,
} from '../../apply/manifest';
import { makeIr } from '../../tests/ir.test-support';
import type { GenerationManifest } from '../../apply/manifest';
import { loadTestLayout } from '../../tests/layout.test-support';

function makeReporter() {
	return {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
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
}): Promise<{ plan: any; reporter: ReturnType<typeof makeReporter> }> {
	const irArg =
		options.ir === undefined
			? makeIr()
			: (options.ir as ReturnType<typeof makeIr> | null);
	const optsSeed = irArg ?? makeIr();
	const reporter = makeReporter();
	const actions: unknown[] = [];
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
				config: optsSeed.config,
				namespace: optsSeed.meta.namespace,
				origin: optsSeed.meta.origin,
				sourcePath: path.join(options.root, 'wpk.config.ts'),
			},
			ir: irArg,
		},
		output: { actions, queueWrite: () => {} },
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

			const { plan } = await runPlan({ root, workspace, ir });

			const plugin = plan.instructions?.find(
				(instr: any) => instr.file === 'plugin.php'
			);
			expect(plugin).toMatchObject({
				base: layout.resolve('plan.base') + '/plugin.php',
				incoming: layout.resolve('plan.incoming') + '/plugin.php',
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
		});
	});

	it('writes plan to custom layout paths and uses custom plugin loader path', async () => {
		await withTempWorkspace(async ({ root, workspace }) => {
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
						};
						return map[id] ?? id;
					},
					all: {},
				},
			});

			const { plan } = await runPlan({
				root,
				workspace,
				ir,
				planPath: path.posix.join('custom', 'plan.json'),
			});

			const plugin = plan.instructions?.find(
				(instr: any) => instr.file === 'plugin.php'
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
			await fs.writeFile(
				path.join(root, 'plugin.php'),
				'<?php // user loader'
			);
			const { plan } = await runPlan({ root, workspace, ir: makeIr() });
			const plugin = plan.instructions?.find(
				(instr: any) => instr.file === 'plugin.php'
			);
			expect(plugin).toBeUndefined();
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

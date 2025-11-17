import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { createApplyPlanBuilder } from '../plan';
import { buildWorkspace } from '../../workspace';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { makeIr } from '../../tests/ir.test-support';
import { loadTestLayout } from '../../tests/layout.test-support';

function buildReporter() {
	return {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
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
	const reporter = buildReporter();
	const actions: unknown[] = [];
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
				config: ir.config,
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
				const layout = await loadTestLayout({ cwd: root });
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
					(instr) => instr.file === 'plugin.php'
				);
				expect(plugin).toMatchObject({
					base: path.posix.join(
						layout.resolve('plan.base'),
						'plugin.php'
					),
					incoming: path.posix.join(
						layout.resolve('plan.incoming'),
						'plugin.php'
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
				const layout = await loadTestLayout({ cwd: root });
				const generated = path.join(
					root,
					layout.resolve('blocks.generated'),
					'example'
				);
				await fs.mkdir(generated, { recursive: true });
				await fs.writeFile(
					path.join(generated, 'index.tsx'),
					'// block'
				);
			},
			async (root) => {
				await runPlanBuilder(root, makeIr());

				const layout = await loadTestLayout({ cwd: root });
				const planRaw = await buildWorkspace(root).readText(
					path.posix.join(layout.resolve('plan.manifest'))
				);
				const plan = JSON.parse(planRaw ?? '{}') as {
					instructions?: Array<{ file: string }>;
				};

				expect(plan.instructions).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							file: path.posix.join(
								'src/blocks',
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
				const layout = await loadTestLayout({ cwd: root });
				const ir = makeIr({
					layout: {
						resolve(id: string) {
							const map: Record<string, string> = {
								'plan.manifest': 'custom/plan.json',
								'plan.base': 'base-dir',
								'plan.incoming': 'incoming-dir',
								'blocks.generated':
									layout.resolve('blocks.generated'),
								'blocks.applied': 'src/blocks',
								'php.generated':
									layout.resolve('php.generated'),
								'plugin.loader': 'custom/plugin.php',
							};
							return map[id] ?? id;
						},
						all: layout.all,
					},
				});

				await runPlanBuilder(root, ir);

				const planRaw = await buildWorkspace(root).readText(
					path.posix.join('custom', 'plan.json')
				);
				expect(planRaw).toBeTruthy();
				const plan = JSON.parse(planRaw ?? '{}') as {
					instructions?: Array<{ file: string; base?: string }>;
				};

				const plugin = plan.instructions?.find(
					(instr) => instr.file === 'plugin.php'
				);
				expect(plugin).toMatchObject({
					base: path.posix.join('base-dir', 'custom/plugin.php'),
					incoming: path.posix.join(
						'incoming-dir',
						'custom/plugin.php'
					),
				});
			}
		);
	});
});

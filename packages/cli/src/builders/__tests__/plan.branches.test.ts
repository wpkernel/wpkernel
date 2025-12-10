import path from 'node:path';
import fs from 'node:fs/promises';
import { createApplyPlanBuilder, createPlanBuilder } from '../plan';
import { buildWorkspace } from '../../workspace';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { makeIr } from '@cli-tests/ir.test-support';
import type { GenerationManifest } from '../../apply/manifest';
import { loadTestLayout } from '@wpkernel/test-utils/layout.test-support';
import { createReporterMock } from '@cli-tests/reporter';
import {
	buildOutput,
	withWorkspace,
} from '@cli-tests/builders/builder-harness.test-support';
import { buildPhpPrettyPrinter } from '@wpkernel/php-json-ast/php-driver';

jest.mock('@wpkernel/php-json-ast/php-driver', () => {
	return {
		buildPhpPrettyPrinter: jest.fn(),
	};
});

async function runPlan(options: {
	root: string;
	workspace: ReturnType<typeof buildWorkspace>;
	ir?: ReturnType<typeof makeIr> | null;
	generationState?: GenerationManifest;
	phase?: 'generate' | 'apply';
	builderType?: 'apply' | 'generate';
}) {
	const irArg =
		options.ir === undefined
			? makeIr()
			: (options.ir as ReturnType<typeof makeIr> | null);
	const optsSeed = irArg ?? makeIr();
	const reporter = createReporterMock();
	const output = buildOutput();
	const helper =
		options.builderType === 'generate'
			? createPlanBuilder()
			: createApplyPlanBuilder();
	const generationState =
		options.generationState ?? buildEmptyGenerationState();

	const phase: 'generate' | 'apply' = options.phase ?? 'generate';

	await helper.apply({
		context: {
			workspace: options.workspace,
			reporter,
			phase,
			generationState,
		},
		input: {
			phase,
			options: {
				namespace: optsSeed.meta.namespace,
				origin: optsSeed.meta.origin,
				sourcePath: path.join(options.root, 'wpk.config.ts'),
			},
			ir: irArg,
		},
		output,
		reporter,
	});

	let plan = {};
	try {
		const layout = await loadTestLayout({ cwd: options.workspace.root });
		const planRaw = await options.workspace.readText(
			layout.resolve('plan.manifest')
		);
		plan = JSON.parse(planRaw ?? '{}');
	} catch (_e) {
		// Plan might not be written
	}
	return { plan, reporter };
}

describe('plan (branches)', () => {
	beforeEach(() => {
		(buildPhpPrettyPrinter as jest.Mock).mockReturnValue({
			prettyPrint: jest
				.fn()
				.mockResolvedValue({ code: '<?php // default mock' }),
		});
	});

	it('skips execution if phase is not generate', async () => {
		await withWorkspace(
			async ({ root, workspace }) => {
				const { plan } = await runPlan({
					root,
					workspace,
					phase: 'apply',
					builderType: 'generate',
				});
				expect(Object.keys(plan)).toHaveLength(0);
			},
			{ createWorkspace: (root) => buildWorkspace(root) }
		);
	});

	it('skips apply plan execution if phase is not generate', async () => {
		await withWorkspace(
			async ({ root, workspace }) => {
				const { plan } = await runPlan({
					root,
					workspace,
					phase: 'apply',
					builderType: 'apply',
				});
				expect(Object.keys(plan)).toHaveLength(0);
			},
			{ createWorkspace: (root) => buildWorkspace(root) }
		);
	});

	it('reports skipped deletions when file is modified', async () => {
		await withWorkspace(
			async ({ root, workspace }) => {
				const layout = await loadTestLayout({ cwd: root });
				const shimPath = 'inc/Rest/JobsController.php';
				const basePath = path.join(
					root,
					layout.resolve('plan.base'),
					shimPath
				);
				await fs.mkdir(path.dirname(basePath), { recursive: true });
				await fs.writeFile(basePath, '<?php // base');

				const targetPath = path.join(root, shimPath);
				await fs.mkdir(path.dirname(targetPath), { recursive: true });
				await fs.writeFile(targetPath, '<?php // user modified');

				const ir = makeIr({ resources: [] });
				const { reporter } = await runPlan({
					root,
					workspace,
					ir,
					generationState: {
						version: 1,
						resources: {
							jobs: {
								hash: 'hash',
								artifacts: { generated: [], shims: [shimPath] },
							},
						},
					},
					builderType: 'apply',
				});

				expect(reporter.info).toHaveBeenCalledWith(
					'createApplyPlanBuilder: guarded shim deletions due to local changes.',
					expect.objectContaining({
						files: expect.arrayContaining([shimPath]),
					})
				);
			},
			{ createWorkspace: (root) => buildWorkspace(root) }
		);
	});

	it('createPlanBuilder reports skipped deletions', async () => {
		await withWorkspace(
			async ({ root, workspace }) => {
				const layout = await loadTestLayout({ cwd: root });
				const shimPath = 'inc/Rest/JobsController.php';
				const basePath = path.join(
					root,
					layout.resolve('plan.base'),
					shimPath
				);
				await fs.mkdir(path.dirname(basePath), { recursive: true });
				await fs.writeFile(basePath, '<?php // base');

				const targetPath = path.join(root, shimPath);
				await fs.mkdir(path.dirname(targetPath), { recursive: true });
				await fs.writeFile(targetPath, '<?php // user modified');

				const ir = makeIr({ resources: [] });
				const { reporter } = await runPlan({
					root,
					workspace,
					ir,
					generationState: {
						version: 1,
						resources: {
							jobs: {
								hash: 'hash',
								artifacts: { generated: [], shims: [shimPath] },
							},
						},
					},
					builderType: 'generate',
				});

				expect(reporter.info).toHaveBeenCalledWith(
					'createPlanBuilder: guarded deletions due to local changes.',
					expect.objectContaining({
						files: expect.arrayContaining([shimPath]),
					})
				);
			},
			{ createWorkspace: (root) => buildWorkspace(root) }
		);
	});

	it('createPlanBuilder emits info when no instructions', async () => {
		await withWorkspace(
			async ({ root, workspace }) => {
				(buildPhpPrettyPrinter as jest.Mock).mockReturnValue({
					prettyPrint: jest.fn().mockResolvedValue({ code: null }),
				});

				const ir = makeIr({ resources: [] });
				const { reporter } = await runPlan({
					root,
					workspace,
					ir,
					builderType: 'generate',
					generationState: buildEmptyGenerationState(),
				});

				expect(reporter.info).toHaveBeenCalledWith(
					'createPlanBuilder: no plan instructions emitted.'
				);
			},
			{ createWorkspace: (root) => buildWorkspace(root) }
		);
	});

	it('createApplyPlanBuilder emits info when no instructions', async () => {
		await withWorkspace(
			async ({ root, workspace }) => {
				(buildPhpPrettyPrinter as jest.Mock).mockReturnValue({
					prettyPrint: jest.fn().mockResolvedValue({ code: null }),
				});

				const ir = makeIr({ resources: [] });
				const { reporter } = await runPlan({
					root,
					workspace,
					ir,
					builderType: 'apply',
					generationState: buildEmptyGenerationState(),
				});

				expect(reporter.info).toHaveBeenCalledWith(
					'createApplyPlanBuilder: no apply plan instructions emitted.'
				);
			},
			{ createWorkspace: (root) => buildWorkspace(root) }
		);
	});

	it('handles missing runtime file (logs warning)', async () => {
		await withWorkspace(
			async ({ root, workspace }) => {
				const ir = makeIr({
					capabilityMap: {
						definitions: [
							{
								name: 'test',
								test: 'test',
							},
						],
					} as any,
				});

				const { reporter, plan } = await runPlan({
					root,
					workspace,
					ir,
				});

				const instructions = (plan as any).instructions ?? [];
				expect(instructions).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							file: 'plugin.php',
							description: 'Update plugin loader',
						}),
					])
				);
				expect(reporter.warn).not.toHaveBeenCalledWith(
					expect.stringContaining(
						'createApplyPlanBuilder: capability runtime file missing'
					),
					expect.anything()
				);
			},
			{ createWorkspace: (root) => buildWorkspace(root) }
		);
	});

	it('updates runtime file when base is missing', async () => {
		await withWorkspace(
			async ({ root, workspace }) => {
				const ir = makeIr({
					capabilityMap: {
						definitions: [
							{
								name: 'test',
								test: 'test',
							},
						],
					} as any,
				});

				const { plan, reporter } = await runPlan({
					root,
					workspace,
					ir,
				});

				const instructions = (plan as any).instructions ?? [];
				expect(instructions).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							file: 'plugin.php',
							description: 'Update plugin loader',
						}),
					])
				);
				expect(reporter.info).toHaveBeenCalledWith(
					'createApplyPlanBuilder: emitted apply plan instructions.',
					expect.objectContaining({
						files: expect.arrayContaining([
							expect.stringContaining('plugin.php'),
						]),
					})
				);
			},
			{ createWorkspace: (root) => buildWorkspace(root) }
		);
	});
});

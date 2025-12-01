import path from 'node:path';
import {
	withWorkspace as baseWithWorkspace,
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import type { BuilderOutput } from '../../runtime/types';
import { makeIr, makeIrMeta } from '@cli-tests/ir.test-support';
import type { Workspace } from '../../workspace/types';

const makeConfig = (namespace: string) => ({
	version: 1,
	namespace,
	schemas: {},
	resources: {},
});

describe('createApplyPlanBuilder pretty printer wiring', () => {
	afterEach(() => {
		jest.resetModules();
		jest.restoreAllMocks();
	});

	it('passes the resolved bridge script path to the PHP driver', async () => {
		jest.resetModules();

		const prettyPrinterFactory = jest.fn(() => ({
			prettyPrint: jest.fn(async () => ({ code: '<?php\n', ast: [] })),
		}));

		jest.doMock('@wpkernel/php-json-ast/php-driver', () => {
			const actual = jest.requireActual(
				'@wpkernel/php-json-ast/php-driver'
			);
			return {
				...actual,
				buildPhpPrettyPrinter: prettyPrinterFactory,
			} satisfies typeof actual;
		});

		const { createApplyPlanBuilder } = await import('../plan');
		const { buildWorkspace } = await import('../../workspace');
		const { buildEmptyGenerationState } = await import(
			'../../apply/manifest'
		);
		await baseWithWorkspace(
			async ({ workspace, root: workspaceRoot }) => {
				const reporter = buildReporter();
				const output = buildOutput<BuilderOutput['actions'][number]>();
				const helper = createApplyPlanBuilder();
				const meta = makeIrMeta('demo-plugin', {
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
					origin: 'typescript',
					features: ['phpAutoload'],
				});
				const ir = makeIr({
					namespace: meta.namespace,
					meta,
				});
				const config = makeConfig(ir.meta.namespace);

				await helper.apply(
					{
						context: {
							workspace: workspace as unknown as Workspace,
							reporter,
							phase: 'generate',
							generationState: buildEmptyGenerationState(),
						},
						input: {
							phase: 'generate',
							options: {
								config,
								namespace: config.namespace,
								origin: ir.meta.origin,
								sourcePath: meta.sourcePath,
							},
							ir,
						},
						output,
						reporter,
					},
					undefined
				);
			},
			{ createWorkspace: (root: string) => buildWorkspace(root) }
		);

		expect(prettyPrinterFactory).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace: expect.any(Object),
				scriptPath: expect.stringContaining('/php/pretty-print.php'),
			})
		);
	});
});

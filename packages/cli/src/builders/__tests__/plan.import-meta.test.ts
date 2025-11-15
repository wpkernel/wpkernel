import path from 'node:path';
import {
	withWorkspace as baseWithWorkspace,
	buildReporter,
	buildOutput,
} from '@wpkernel/test-utils/builders/tests/builder-harness.test-support';
import type { BuilderOutput } from '../../runtime/types';

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
		const { makePhpIrFixture } = await import(
			'@wpkernel/test-utils/builders/php/resources.test-support'
		);

		await baseWithWorkspace(
			async ({ workspace, root: workspaceRoot }) => {
				const reporter = buildReporter();
				const output = buildOutput<BuilderOutput['actions'][number]>();
				const helper = createApplyPlanBuilder();
				const ir = makePhpIrFixture();

				await helper.apply(
					{
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
								sourcePath: path.join(
									workspaceRoot,
									'wpk.config.ts'
								),
							},
							ir,
						},
						output,
						reporter,
					},
					undefined
				);
			},
			{ createWorkspace: (root) => buildWorkspace(root) }
		);

		expect(prettyPrinterFactory).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace: expect.any(Object),
				scriptPath: expect.stringContaining('/php/pretty-print.php'),
			})
		);
	});
});

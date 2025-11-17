import path from 'node:path';
import fs from 'node:fs/promises';
import { sanitizeNamespace } from '@wpkernel/core/namespace';
import { createNoopReporter as buildNoopReporter } from '@wpkernel/core/reporter';
import * as reporterExports from '@wpkernel/core/reporter';
import type { WPKernelConfigV1 } from '../../config/types';
import {
	createBaseConfig,
	FIXTURE_CONFIG_PATH,
	FIXTURE_ROOT,
} from '../shared/test-helpers';
import { buildWorkspace } from '../../workspace';
import * as workspaceExports from '../../workspace';
import { createIr } from '../createIr';
import {
	withWorkspace,
	makeWorkspaceMock,
} from '../../../tests/workspace.test-support';
import { makeWPKernelConfigFixture } from '@wpkernel/test-utils/printers.test-support';

jest.mock('../../builders', () => {
	const { createHelper } = jest.requireActual('../../runtime');
	const createStubBuilder = (key: string) =>
		createHelper({
			key,
			kind: 'builder',
			async apply() {
				// Intentionally left blank for offline test execution.
			},
		});

	return {
		createBundler: jest.fn(() =>
			createStubBuilder('builder.generate.stub.bundler')
		),
		createApplyPlanBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.plan')
		),
		createPatcher: jest.fn(() =>
			createStubBuilder('builder.generate.stub.patcher')
		),
		createPhpBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.php')
		),
		createJsBlocksBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.blocks')
		),
		createTsBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts')
		),
		createTsCapabilityBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts-capability')
		),
		createTsIndexBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts-index')
		),
		createPhpDriverInstaller:
			jest.requireActual('../../builders').createPhpDriverInstaller,
	};
});

jest.setTimeout(60000);

describe('createIr', () => {
	it('builds IR for a basic configuration', async () => {
		const schemaPath = path.relative(
			path.dirname(FIXTURE_CONFIG_PATH),
			path.join(FIXTURE_ROOT, 'schemas', 'todo.schema.json')
		);

		const config = makeWPKernelConfigFixture({
			namespace: 'todo-app',
			schemas: {
				todo: {
					path: schemaPath,
					generated: {
						types: './generated/todo.ts',
					},
				},
			} satisfies WPKernelConfigV1['schemas'],
			resources: {
				todo: {
					name: 'todo',
					schema: 'todo',
					routes: {
						list: {
							path: '/todo-app/v1/todo',
							method: 'GET',
							capability: 'manage_todo',
						},
					},
				},
			} satisfies WPKernelConfigV1['resources'],
		});

		await withWorkspace(
			async (workspaceRoot) => {
				await fs.cp(FIXTURE_ROOT, workspaceRoot, { recursive: true });

				const copiedConfigPath = path.join(
					workspaceRoot,
					path.basename(FIXTURE_CONFIG_PATH)
				);

				const options = {
					config,
					namespace: config.namespace,
					origin: 'typescript',
					sourcePath: copiedConfigPath,
				} as const;

				const workspace = buildWorkspace(workspaceRoot);
				const ir = await createIr(options, {
					workspace,
					reporter: buildNoopReporter(),
				});

				expect(ir.meta).toEqual(
					expect.objectContaining({
						version: 1,
						namespace: config.namespace,
						origin: 'typescript',
						sanitizedNamespace: sanitizeNamespace(config.namespace),
					})
				);

				expect(ir.config).toBe(config);
				expect(ir.schemas).toHaveLength(1);
				expect(ir.schemas[0]).toEqual(
					expect.objectContaining({
						key: 'todo',
						provenance: 'manual',
						sourcePath: expect.stringContaining(
							'schemas/todo.schema.json'
						),
					})
				);

				expect(ir.resources).toHaveLength(1);
				expect(ir.resources[0]).toEqual(
					expect.objectContaining({
						name: 'todo',
						schemaKey: 'todo',
						routes: [
							expect.objectContaining({
								path: '/todo-app/v1/todo',
								method: 'GET',
								capability: 'manage_todo',
							}),
						],
						cacheKeys: expect.objectContaining({
							list: expect.objectContaining({
								segments: expect.arrayContaining([
									'todo',
									'list',
								]),
							}),
							get: expect.objectContaining({
								segments: expect.arrayContaining([
									'todo',
									'get',
								]),
							}),
						}),
					})
				);

				expect(Array.isArray(ir.blocks)).toBe(true);
				expect(ir.capabilityMap).toEqual(
					expect.objectContaining({
						fallback: expect.objectContaining({
							capability: expect.any(String),
						}),
						warnings: expect.any(Array),
					})
				);
				expect(ir.php).toEqual(
					expect.objectContaining({
						namespace: expect.any(String),
						autoload: 'inc/',
						outputDir: ir.layout.resolve('php.generated'),
					})
				);
				expect(Array.isArray(ir.diagnostics)).toBe(true);
			},
			{ chdir: false }
		);
	});

	it('collects diagnostics generated during IR construction', async () => {
		const config = createBaseConfig();
		config.resources = {
			remote: {
				name: 'remote',
				schema: 'auto',
				routes: {
					list: {
						path: '/external/items',
						method: 'GET',
					},
				},
			},
		} satisfies WPKernelConfigV1['resources'];

		await withWorkspace(
			async (workspaceRoot) => {
				const options = {
					config,
					namespace: config.namespace,
					origin: 'typescript',
					sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
				} as const;

				const workspace = buildWorkspace(workspaceRoot);
				const ir = await createIr(options, {
					workspace,
					reporter: buildNoopReporter(),
				});

				expect(ir.diagnostics).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							code: 'IR.RES.route.remote.namespace',
							severity: 'warn',
							target: expect.objectContaining({
								type: 'resource',
								id: expect.stringMatching(/^res:/),
							}),
						}),
					])
				);
			},
			{ chdir: false }
		);
	});

	it('uses provided pipeline, environment workspace and reporter overrides', async () => {
		const config = createBaseConfig();
		const options = {
			config,
			namespace: config.namespace,
			origin: 'test-origin',
			sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
		} as const;

		const pipelineRunResult = {
			ir: { meta: { namespace: config.namespace } },
		} as const;
		const pipeline = {
			ir: { use: jest.fn() },
			builders: { use: jest.fn() },
			extensions: { use: jest.fn() },
			run: jest.fn(async (input) => {
				expect(input.phase).toBe('init');
				expect(input.workspace).toBe(workspace);
				expect(input.reporter).toBe(reporter);

				return pipelineRunResult;
			}),
		};

		const workspace = makeWorkspaceMock({
			root: '/tmp/custom-workspace',
		});
		const reporterChild = jest.fn();
		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: reporterChild,
		} as unknown as ReturnType<typeof buildNoopReporter>;
		reporterChild.mockReturnValue(reporter);

		const ir = await createIr(options, {
			pipeline: pipeline as never,
			workspace,
			reporter,
			phase: 'init',
		});

		expect(ir).toBe(pipelineRunResult.ir);
		expect(pipeline.ir.use).toHaveBeenCalled();
		expect(pipeline.builders.use).toHaveBeenCalled();
		expect(pipeline.extensions.use).toHaveBeenCalledTimes(1);
		expect(pipeline.run).toHaveBeenCalledTimes(1);
	});

	it('falls back to creating workspace and reporter when overrides are absent', async () => {
		const config = createBaseConfig();
		const options = {
			config,
			namespace: config.namespace,
			origin: 'test-origin',
			sourcePath: path.join(process.cwd(), 'configs', 'wpk.config.ts'),
		} as const;

		const createdWorkspace = makeWorkspaceMock({
			root: '/tmp/generated-workspace',
		});
		const createdReporterChild = jest.fn();
		const createdReporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: createdReporterChild,
		} as unknown;
		createdReporterChild.mockReturnValue(createdReporter);

		const workspaceSpy = jest
			.spyOn(workspaceExports, 'buildWorkspace')
			.mockReturnValue(createdWorkspace as never);
		const reporterSpy = jest
			.spyOn(reporterExports, 'createNoopReporter')
			.mockReturnValue(createdReporter as never);

		const pipelineRunResult = {
			ir: { meta: { namespace: config.namespace } },
		} as const;
		const pipeline = {
			ir: { use: jest.fn() },
			builders: { use: jest.fn() },
			extensions: { use: jest.fn() },
			run: jest.fn(async (input) => {
				expect(input.workspace).toBe(createdWorkspace);
				expect(input.reporter).toBe(createdReporter);
				expect(input.phase).toBe('generate');
				expect(input.sourcePath).toBe(options.sourcePath);
				expect(input.namespace).toBe(options.namespace);

				return pipelineRunResult;
			}),
		};

		const ir = await createIr(options, { pipeline: pipeline as never });

		expect(ir).toBe(pipelineRunResult.ir);
		expect(pipeline.ir.use).toHaveBeenCalled();
		expect(pipeline.builders.use).toHaveBeenCalled();
		expect(pipeline.extensions.use).toHaveBeenCalledTimes(1);
		expect(pipeline.run).toHaveBeenCalledTimes(1);
		expect(workspaceSpy).toHaveBeenCalledWith(
			path.dirname(options.sourcePath)
		);
		expect(reporterSpy).toHaveBeenCalledTimes(1);

		workspaceSpy.mockRestore();
		reporterSpy.mockRestore();
	});
});

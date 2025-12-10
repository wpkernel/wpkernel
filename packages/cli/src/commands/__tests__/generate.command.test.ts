import path from 'node:path';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import {
	assignCommandContext,
	createCommandWorkspaceHarness,
	createCommandReporterHarness,
} from '@cli-tests/cli';
import {
	buildGenerateCommand,
	type BuildGenerateCommandOptions,
} from '../generate';
import { PATCH_MANIFEST_ID } from '../apply/constants';
import { resolveGenerationStatePath } from '../../apply/manifest';
import type {
	Pipeline,
	PipelineRunOptions,
	PipelineRunResult,
} from '../../runtime';
import type {
	ReadinessHelperDescriptor,
	ReadinessPlan,
	ReadinessRegistry,
} from '../../dx';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';
import { resolvePatchPaths } from '../../builders/patcher.paths';
import { buildTestArtifactsPlan, makeIr } from '@cli-tests/ir.test-support';
import { createDefaultResource } from '@cli-tests/ir/resource-builder.mock';
import { ensureLayoutManifest } from '@wpkernel/test-utils/layout-manifest.test-support';

jest.mock('../../ir/fragments/ir.layout.core', () => {
	const actual = jest.requireActual('../../ir/fragments/ir.layout.core');
	return {
		...actual,
		loadLayoutFromWorkspace: jest.fn(async () => loadTestLayoutSync()),
	};
});

const buildIrArtifact = (workspaceRoot: string): PipelineRunResult['ir'] =>
	makeIr({
		namespace: 'Demo',
		meta: {
			sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
			origin: 'typescript',
			features: [],
		},
		resources: [],
		schemas: [],
		artifacts: buildTestArtifactsPlan(loadTestLayoutSync()),
	});

function createWorkspaceStub() {
	const harness = createCommandWorkspaceHarness({
		root: path.join(process.cwd(), 'workspace'),
	});
	void ensureLayoutManifest(harness.workspace.root);
	return harness.workspace;
}

function createPipelineStub(
	_workspace: ReturnType<typeof createWorkspaceStub>,
	runImpl?: (options: PipelineRunOptions) => Promise<PipelineRunResult>
): { pipeline: Pipeline; runMock: jest.Mock } {
	const runMock = jest.fn(async (options: PipelineRunOptions) => {
		const layout = loadTestLayoutSync();
		await ensureLayoutManifest(options.workspace.root);
		await options.workspace.write(
			path.join(layout.resolve('entry.generated'), 'index.ts'),
			"console.log('hello world');\n"
		);
		const patchPaths = resolvePatchPaths({
			plan: buildTestArtifactsPlan(layout).plan,
		});
		await options.workspace.write(patchPaths.planPath, '{}');
		await options.workspace.write(layout.resolve(PATCH_MANIFEST_ID), '{}');

		return {
			ir: buildIrArtifact(options.workspace.root),
			diagnostics: [],
			steps: [],
		} satisfies PipelineRunResult;
	});

	const executor = runImpl ? jest.fn(runImpl) : runMock;

	const pipeline = {
		ir: { use: jest.fn() },
		builders: { use: jest.fn() },
		extensions: { use: jest.fn() },
		use: jest.fn(),
		run: executor as unknown as Pipeline['run'],
	} as unknown as Pipeline;

	return { pipeline, runMock: executor };
}

function createReadinessRegistryStub() {
	const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
	const readinessPlanMock = jest.fn(
		(keys: ReadinessPlan['keys']) =>
			({
				keys,
				run: readinessRun,
			}) as ReadinessPlan
	);
	const readinessDescriptors = [
		{
			key: 'workspace-hygiene',
			metadata: {
				label: 'Workspace hygiene',
				scopes: ['generate'],
			},
		},
		{
			key: 'composer',
			metadata: { label: 'Composer dependencies', scopes: ['generate'] },
		},
		{
			key: 'tsx-runtime',
			metadata: { label: 'TSX runtime', scopes: ['generate'] },
		},
	] satisfies ReadinessHelperDescriptor[];
	const readinessRegistry = {
		plan: readinessPlanMock,
		describe: jest.fn(() => readinessDescriptors),
	} as unknown as ReadinessRegistry;
	const buildReadinessRegistry = jest.fn(() => readinessRegistry);

	return {
		buildReadinessRegistry,
		readinessPlanMock,
		readinessRun,
		readinessDescriptors,
	};
}

describe('GenerateCommand', () => {
	it('runs the pipeline and writes the summary output', async () => {
		const workspace = createWorkspaceStub();
		const { pipeline, runMock } = createPipelineStub(workspace);
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const readiness = createReadinessRegistryStub();

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const renderSummary = jest.fn().mockReturnValue('summary output\n');

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary,
			buildReadinessRegistry: readiness.buildReadinessRegistry,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		const { stdout } = assignCommandContext(command, {
			cwd: workspace.root,
		});

		command.dryRun = false;
		command.verbose = false;

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(runMock).toHaveBeenCalled();
		expect(workspace.begin).toHaveBeenCalledWith('generate');
		expect(workspace.commit).toHaveBeenCalledWith('generate');
		expect(workspace.rollback).not.toHaveBeenCalledWith('generate');
		const layout = loadTestLayoutSync();
		expect(renderSummary).toHaveBeenCalledWith(
			expect.objectContaining({ counts: expect.any(Object) }),
			false,
			false,
			{
				php: layout.resolve('php.generated'),
				entry: layout.resolve('entry.generated'),
				runtime: layout.resolve('runtime.generated'),
				blocks: path.posix.join(
					layout.resolve('blocks.generated'),
					'auto-register.ts'
				),
			}
		);
		expect(stdout.toString()).toBe('summary output\n');
		expect(command.summary).toEqual(
			expect.objectContaining({
				dryRun: false,
				entries: expect.arrayContaining([
					expect.objectContaining({
						path: expect.stringContaining(
							path.posix.join(
								loadTestLayoutSync().resolve('entry.generated'),
								'index.ts'
							)
						),
						status: 'written',
					}),
				]),
			})
		);
		expect(readiness.readinessPlanMock).toHaveBeenCalledWith(
			readiness.readinessDescriptors.map((descriptor) => descriptor.key)
		);
		expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		const readinessContext = readiness.readinessRun.mock.calls[0]?.[0] as {
			environment: { allowDirty: boolean };
		};
		expect(readinessContext.environment.allowDirty).toBe(false);
	});

	it('rolls back workspace changes during dry-run', async () => {
		const workspace = createWorkspaceStub();
		const { pipeline, runMock } = createPipelineStub(workspace);
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const readiness = createReadinessRegistryStub();

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const renderSummary = jest.fn().mockReturnValue('dry-run summary\n');

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary,
			buildReadinessRegistry: readiness.buildReadinessRegistry,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		const { stdout } = assignCommandContext(command, {
			cwd: workspace.root,
		});

		command.dryRun = true;
		command.verbose = false;

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(runMock).toHaveBeenCalled();
		expect(workspace.rollback).toHaveBeenCalledWith('generate');
		expect(workspace.commit).not.toHaveBeenCalledWith('generate');
		expect(command.summary).toEqual(
			expect.objectContaining({
				dryRun: true,
				entries: expect.arrayContaining([
					expect.objectContaining({
						status: 'skipped',
						reason: 'dry-run',
					}),
				]),
			})
		);
		expect(stdout.toString()).toBe('dry-run summary\n');
		expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		const readinessContext = readiness.readinessRun.mock.calls[0]?.[0] as {
			environment: { allowDirty: boolean };
		};
		expect(readinessContext.environment.allowDirty).toBe(false);
	});

	it('warns when diagnostics are emitted by the pipeline', async () => {
		const workspace = createWorkspaceStub();
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const readiness = createReadinessRegistryStub();

		const { pipeline } = createPipelineStub(workspace, async (options) => {
			await options.workspace.write(
				path.join('.generated', 'index.ts'),
				'file contents\n'
			);
			return {
				ir: buildIrArtifact(options.workspace.root),
				diagnostics: [
					{
						type: 'conflict',
						key: 'builder.conflict',
						mode: 'override',
						message: 'conflict detected',
						helpers: ['first', 'second'],
						kind: 'core.builder',
					},
				],
				steps: [],
			} satisfies PipelineRunResult;
		});

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary: jest.fn().mockReturnValue('summary\n'),
			buildReadinessRegistry: readiness.buildReadinessRegistry,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		assignCommandContext(command, { cwd: workspace.root });

		command.dryRun = false;
		command.verbose = false;

		await command.execute();

		expect(reporter.warn).toHaveBeenCalledWith(
			'Pipeline diagnostic reported.',
			expect.objectContaining({
				message: 'conflict detected',
				kind: 'core.builder',
			})
		);
		expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
	});

	it('passes allowDirty through readiness context when flag enabled', async () => {
		const workspace = createWorkspaceStub();
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const readiness = createReadinessRegistryStub();

		const { pipeline } = createPipelineStub(workspace);

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary: jest.fn().mockReturnValue('summary\n'),
			buildReadinessRegistry: readiness.buildReadinessRegistry,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		assignCommandContext(command, { cwd: workspace.root });

		command.allowDirty = true;

		await command.execute();

		expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		const readinessContext = readiness.readinessRun.mock.calls[0]?.[0] as {
			environment: { allowDirty: boolean };
		};
		expect(readinessContext.environment.allowDirty).toBe(true);
	});

	it('propagates failures from the pipeline as exit codes', async () => {
		const workspace = createWorkspaceStub();
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const readiness = createReadinessRegistryStub();

		const { pipeline } = createPipelineStub(workspace, async () => {
			throw new WPKernelError('ValidationError', {
				message: 'pipeline failed',
			});
		});

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary: jest.fn().mockReturnValue('summary\n'),
			buildReadinessRegistry: readiness.buildReadinessRegistry,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		assignCommandContext(command, { cwd: workspace.root });

		command.dryRun = false;
		command.verbose = false;

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
		expect(workspace.rollback).toHaveBeenCalledWith('generate');
		expect(reporter.error).toHaveBeenCalled();
		expect(command.summary).toBeNull();
		expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
	});

	it('fails when the apply manifest is missing after generation', async () => {
		const workspace = createWorkspaceStub();
		workspace.exists = jest.fn(async () => false);

		const { pipeline } = createPipelineStub(workspace);
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const readiness = createReadinessRegistryStub();

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const renderSummary = jest.fn().mockReturnValue('summary output\n');

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary,
			buildReadinessRegistry: readiness.buildReadinessRegistry,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		const { stdout } = assignCommandContext(command, {
			cwd: workspace.root,
		});

		command.dryRun = false;
		command.verbose = false;

		const stderrSpy = jest
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true);

		const exitCode = await command.execute();

		stderrSpy.mockRestore();

		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(stdout.toString()).toBe('');
		expect(reporter.error).toHaveBeenCalledWith(
			'Failed to locate apply manifest after generation.',
			expect.objectContaining({
				manifestPath: resolvePatchPaths({
					plan: buildTestArtifactsPlan(loadTestLayoutSync()).plan,
				}).planPath,
				workspace: workspace.root,
			})
		);
		expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
	});

	it('removes stale generated artifacts when generated paths change', async () => {
		const workspace = createWorkspaceStub();
		const layout = loadTestLayoutSync();
		const generationStatePath = await resolveGenerationStatePath(workspace);

		const phpGenerated = layout.resolve('php.generated');
		const controllersApplied = layout.resolve('controllers.applied');

		await workspace.writeJson(generationStatePath, {
			version: 1,
			resources: {
				books: {
					hash: 'legacy',
					artifacts: {
						generated: [
							path.posix.join(
								phpGenerated,
								'Rest',
								'BooksController.php'
							),
						],
						shims: [
							path.posix.join(
								controllersApplied,
								'Rest',
								'BooksController.php'
							),
						],
					},
				},
			},
		});

		const { pipeline, runMock } = createPipelineStub(
			workspace,
			async (options) => {
				const pipelineLayout = loadTestLayoutSync();
				const patchPaths = resolvePatchPaths({
					plan: buildTestArtifactsPlan(pipelineLayout).plan,
				});

				await options.workspace.write(
					path.join(
						pipelineLayout.resolve('entry.generated'),
						'index.ts'
					),
					"console.log('hello world');\n"
				);
				await options.workspace.write(patchPaths.planPath, '{}');
				await options.workspace.write(
					loadTestLayoutSync().resolve(PATCH_MANIFEST_ID),
					'{}'
				);

				const ir = buildIrArtifact(options.workspace.root);
				const baseResource = createDefaultResource();
				const resource = {
					...baseResource,
					name: 'books',
					schemaKey: 'books',
					hash: {
						...baseResource.hash,
						value: 'next',
					},
				};

				return {
					ir: {
						...ir,
						resources: [resource],
						php: {
							...ir.php,
							outputDir: 'next-php-output',
						},
					},
					diagnostics: [],
					steps: [],
				} satisfies PipelineRunResult;
			}
		);

		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const readiness = createReadinessRegistryStub();

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(workspace.root, 'wpk.config.ts'),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const renderSummary = jest.fn().mockReturnValue('summary output\n');

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary,
			buildReadinessRegistry: readiness.buildReadinessRegistry,
		} as BuildGenerateCommandOptions);

		const command = new GenerateCommand();
		assignCommandContext(command, { cwd: workspace.root });

		command.dryRun = false;
		command.verbose = false;

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(runMock).toHaveBeenCalled();
		expect(workspace.rm).toHaveBeenCalledWith(
			path.posix.join(phpGenerated, 'Rest', 'BooksController.php'),
			undefined
		);
		expect(workspace.rm).not.toHaveBeenCalledWith(
			expect.stringContaining('.ast.json'),
			expect.anything()
		);
		expect(workspace.writeJson).toHaveBeenCalledWith(
			generationStatePath,
			expect.objectContaining({
				resources: {
					books: expect.objectContaining({
						artifacts: expect.objectContaining({
							generated: expect.arrayContaining([
								path.posix.join(
									'next-php-output',
									'Rest',
									'BooksController.php'
								),
							]),
						}),
					}),
				},
			}),
			expect.any(Object)
		);
		expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
	});
});

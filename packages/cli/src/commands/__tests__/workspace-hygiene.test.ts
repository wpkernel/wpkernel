import path from 'node:path';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import {
	assignCommandContext,
	createCommandReporterHarness,
	createCommandWorkspaceHarness,
} from '@wpkernel/test-utils/cli';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { loadTestLayoutSync } from '../../tests/layout.test-support';

describe('workspace hygiene readiness wiring', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	it('propagates --allow-dirty for generate command readiness', async () => {
		const runCommandReadiness = jest.fn().mockResolvedValue(undefined);
		jest.doMock('../readiness', () => ({
			runCommandReadiness,
		}));

		const workspaceHarness = createCommandWorkspaceHarness({
			root: path.join(process.cwd(), 'generate-workspace'),
		});
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		const loadWPKernelConfig = jest.fn().mockResolvedValue({
			config: { version: 1 },
			sourcePath: path.join(
				workspaceHarness.workspace.root,
				'wpk.config.ts'
			),
			configOrigin: 'wpk.config.ts',
			namespace: 'Demo',
		});

		const layout = loadTestLayoutSync();

		const pipelineRun = jest.fn().mockResolvedValue({
			ir: {
				meta: {
					version: 1,
					namespace: 'Demo',
					sourcePath: path.join(
						workspaceHarness.workspace.root,
						'wpk.config.ts'
					),
					origin: 'typescript',
					sanitizedNamespace: 'Demo',
				},
				config: {
					version: 1,
					namespace: 'Demo',
					resources: {},
					schemas: {},
				},
				schemas: [],
				resources: [],
				capabilities: [],
				capabilityMap: {
					definitions: [],
					fallback: {
						capability: 'manage_options',
						appliesTo: 'resource',
					},
					missing: [],
					unused: [],
					warnings: [],
				},
				blocks: [],
				php: {
					namespace: 'Demo',
					autoload: 'inc',
					outputDir: layout.resolve('php.generated'),
				},
				diagnostics: [],
				layout,
			},
			diagnostics: [],
			steps: [],
		});

		const pipeline = {
			ir: { use: jest.fn() },
			builders: { use: jest.fn() },
			extensions: { use: jest.fn() },
			use: jest.fn(),
			run: pipelineRun,
		};

		const { buildGenerateCommand } = await import('../generate');

		const GenerateCommand = buildGenerateCommand({
			loadWPKernelConfig,
			buildWorkspace: jest
				.fn()
				.mockReturnValue(workspaceHarness.workspace),
			createPipeline: jest.fn().mockReturnValue(pipeline),
			registerFragments: jest.fn(),
			registerBuilders: jest.fn(),
			buildAdapterExtensionsExtension: jest
				.fn()
				.mockReturnValue({ key: 'adapter', register: jest.fn() }),
			buildReporter: jest.fn().mockReturnValue(reporter),
			renderSummary: jest.fn().mockReturnValue('summary\n'),
			validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
			buildReadinessRegistry: jest.fn().mockReturnValue({
				plan: jest
					.fn()
					.mockImplementation((keys: readonly string[]) => ({
						keys,
						run: jest.fn().mockResolvedValue({ outcomes: [] }),
					})),
				describe: jest.fn(() => [
					{
						key: 'workspace-hygiene',
						metadata: {
							label: 'Workspace hygiene',
							scopes: ['generate'],
						},
					},
				]),
			}) as never,
		});

		const command = new GenerateCommand();
		command.allowDirty = true;

		assignCommandContext(command, { cwd: workspaceHarness.workspace.root });

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(runCommandReadiness).toHaveBeenCalledWith(
			expect.objectContaining({
				scopes: ['generate'],
				allowDirty: true,
			})
		);
	});

	it('propagates --allow-dirty for apply command readiness', async () => {
		const runCommandReadiness = jest.fn().mockResolvedValue(undefined);
		jest.doMock('../readiness', () => ({
			runCommandReadiness,
		}));

		const workspace = makeWorkspaceMock({
			root: path.join(process.cwd(), 'apply'),
		});
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		const { buildApplyCommand } = await import('../apply');

		const ApplyCommand = buildApplyCommand({
			loadWPKernelConfig: jest.fn().mockResolvedValue({
				config: { version: 1 },
				sourcePath: path.join(workspace.root, 'wpk.config.ts'),
				configOrigin: 'wpk.config.ts',
				namespace: 'Demo',
			}),
			buildWorkspace: jest.fn().mockReturnValue(workspace),
			createPatcher: jest.fn().mockReturnValue({
				apply: jest.fn().mockResolvedValue({
					summary: { applied: 0, conflicts: 0, skipped: 0 },
					records: [],
					actions: [],
				}),
			}),
			buildReporter: jest.fn().mockReturnValue(reporter),
			buildBuilderOutput: jest.fn().mockReturnValue({
				log: jest.fn(),
				build: jest.fn().mockResolvedValue(undefined),
			}),
			readManifest: jest.fn().mockResolvedValue({
				summary: { applied: 0, conflicts: 0, skipped: 0 },
				records: [],
				actions: [],
			}),
			resolveWorkspaceRoot: jest.fn().mockReturnValue(workspace.root),
			promptConfirm: jest.fn().mockResolvedValue(true),
			ensureGitRepository: jest.fn().mockResolvedValue(undefined),
			createBackups: jest.fn().mockResolvedValue(undefined),
			appendApplyLog: jest.fn().mockResolvedValue(undefined),
			buildReadinessRegistry: jest.fn().mockReturnValue({
				plan: jest
					.fn()
					.mockImplementation((keys: readonly string[]) => ({
						keys,
						run: jest.fn().mockResolvedValue({ outcomes: [] }),
					})),
				describe: jest.fn(() => [
					{
						key: 'workspace-hygiene',
						metadata: {
							label: 'Workspace hygiene',
							scopes: ['apply'],
						},
					},
				]),
			}) as never,
		});

		const command = new ApplyCommand();
		command.allowDirty = true;

		assignCommandContext(command, { cwd: workspace.root });

		const exitCode = await command.execute();

		expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(runCommandReadiness).toHaveBeenCalledWith(
			expect.objectContaining({
				scopes: ['apply'],
				allowDirty: true,
			})
		);
	});
});

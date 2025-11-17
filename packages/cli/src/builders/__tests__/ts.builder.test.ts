import path from 'node:path';
import type { ResourceConfig } from '@wpkernel/core/resource';
import {
	createTsBuilder,
	buildAdminScreenCreator,
	buildDataViewFixtureCreator,
	buildDataViewInteractivityFixtureCreator,
	buildDataViewRegistryCreator,
	type TsBuilderCreator,
} from '../ts';
import {
	withWorkspace as baseWithWorkspace,
	buildWPKernelConfigSource,
	buildDataViewsConfig,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	type BuilderHarnessContext,
} from '@wpkernel/test-utils/builders/tests/ts.test-support';
import { buildWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace';
import { validateGeneratedImports } from '../../commands/run-generate/validation';
import { loadTestLayout } from '../../tests/layout.test-support';

const withWorkspace = (
	run: (context: BuilderHarnessContext<Workspace>) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root: string) => buildWorkspace(root),
	});

jest.mock('../../commands/run-generate/validation', () => ({
	validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
	jest.clearAllMocks();
});

describe('createTsBuilder - orchestration', () => {
	it('skips generation when no resources expose DataViews metadata', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource({ dataviews: null });
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				dataviews: null,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const testLayout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = { ...ir, layout: testLayout };

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
					},
					input: {
						phase: 'generate',
						options,
						ir: irWithLayout,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(reporter.debug).toHaveBeenCalledWith(
				'createTsBuilder: no resources registered.'
			);
			expect(output.actions).toHaveLength(0);
			expect(validateGeneratedImports).not.toHaveBeenCalled();
			await expect(
				workspace.exists(
					path.join(
						testLayout.resolve('ui.generated'),
						'app',
						'job',
						'admin',
						'JobsAdminScreen.tsx'
					)
				)
			).resolves.toBe(false);
		});
	});

	it('supports extending the builder with custom creators', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/bootstrap/kernel.ts',
				'export const wpk = { getUIRuntime: () => ({}) };\n'
			);

			const dataviews = buildDataViewsConfig();
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const testLayout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = { ...ir, layout: testLayout };

			const reporter = buildReporter();
			const output = buildOutput();
			const customCreator: TsBuilderCreator = {
				key: 'builder.generate.ts.custom.test',
				async create({ project, descriptor, emit }) {
					const creatorLayout = await loadTestLayout({
						cwd: project.getDirectoryOrThrow('.').getPath(),
					});
					const filePath = path.join(
						creatorLayout.resolve('ui.generated'),
						'extras',
						`${descriptor.key}.ts`
					);
					const sourceFile = project.createSourceFile(filePath, '', {
						overwrite: true,
					});
					sourceFile.addStatements((writer) => {
						writer.write('export const marker = ');
						writer.quote(descriptor.name);
						writer.write(';');
						writer.newLine();
					});

					await emit({ filePath, sourceFile });
				},
			};

			const builder = createTsBuilder({
				creators: [
					buildAdminScreenCreator(),
					buildDataViewFixtureCreator(),
					buildDataViewInteractivityFixtureCreator(),
					buildDataViewRegistryCreator(),
					customCreator,
				],
			});

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
					},
					input: {
						phase: 'generate',
						options,
						ir: irWithLayout,
					},
					output,
					reporter,
				},
				undefined
			);

			const uiGeneratedRoot = testLayout.resolve('ui.generated');

			const customArtifactPath = path.join(
				uiGeneratedRoot,
				'extras',
				'job.ts'
			);

			await expect(
				workspace.readText(customArtifactPath)
			).resolves.toContain("export const marker = 'job';");
			expect(output.actions.map((action) => action.file)).toEqual([
				path.join(
					uiGeneratedRoot,
					'app',
					'job',
					'admin',
					'JobsAdminScreen.tsx'
				),
				path.join(uiGeneratedRoot, 'fixtures', 'dataviews', 'job.ts'),
				path.join(
					uiGeneratedRoot,
					'fixtures',
					'interactivity',
					'job.ts'
				),
				path.join(uiGeneratedRoot, 'registry', 'dataviews', 'job.ts'),
				customArtifactPath,
			]);
			const debugCalls = (reporter.debug as jest.Mock).mock.calls;
			const debugMessage = debugCalls[debugCalls.length - 1]?.[0];
			expect(debugMessage).toContain(
				'createTsBuilder: 5 files written ('
			);
			expect(debugMessage).toContain(testLayout.resolve('ui.generated'));
		});
	});

	it('invokes lifecycle hooks around creators', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const testLayout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = { ...ir, layout: testLayout };

			const hooks = {
				onBeforeCreate: jest.fn(),
				onAfterCreate: jest.fn(),
				onAfterEmit: jest.fn(),
			};

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder({ hooks });

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
					},
					input: {
						phase: 'generate',
						options,
						ir: irWithLayout,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(hooks.onBeforeCreate).toHaveBeenCalledTimes(4);
			expect(hooks.onAfterCreate).toHaveBeenCalledTimes(4);
			expect(hooks.onBeforeCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					descriptor: expect.objectContaining({ key: 'job' }),
				})
			);
			expect(hooks.onAfterCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					descriptor: expect.objectContaining({ key: 'job' }),
				})
			);

			expect(hooks.onAfterEmit).toHaveBeenCalledTimes(1);
			const afterEmitArg = hooks.onAfterEmit.mock.calls[0][0];
			const emitted = afterEmitArg.emitted.map((file: string) =>
				file.replace(/\\/g, '/')
			);
			expect(emitted).toEqual(
				expect.arrayContaining([
					path.posix.join(
						testLayout.resolve('ui.generated'),
						'app/job/admin/JobsAdminScreen.tsx'
					),
					path.posix.join(
						testLayout.resolve('ui.generated'),
						'fixtures/dataviews/job.ts'
					),
					path.posix.join(
						testLayout.resolve('ui.generated'),
						'fixtures/interactivity/job.ts'
					),
					path.posix.join(
						testLayout.resolve('ui.generated'),
						'registry/dataviews/job.ts'
					),
				])
			);
			expect(afterEmitArg.workspace).toBe(workspace);
			expect(afterEmitArg.reporter).toBe(reporter);

			expect(validateGeneratedImports).toHaveBeenCalledTimes(1);
			const validationCall = (validateGeneratedImports as jest.Mock).mock
				.calls[0]?.[0];
			expect(validationCall.projectRoot).toBe(workspace.root);
			expect(
				validationCall.summary.entries.map(
					(entry: { path: string }) => entry.path
				)
			).toEqual(
				expect.arrayContaining([
					path.posix.join(
						testLayout.resolve('ui.generated'),
						'app/job/admin/JobsAdminScreen.tsx'
					),
					path.posix.join(
						testLayout.resolve('ui.generated'),
						'fixtures/dataviews/job.ts'
					),
					path.posix.join(
						testLayout.resolve('ui.generated'),
						'fixtures/interactivity/job.ts'
					),
					path.posix.join(
						testLayout.resolve('ui.generated'),
						'registry/dataviews/job.ts'
					),
				])
			);
		});
	});

	it('generates registry metadata that mirrors the config module', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig();
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const testLayout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = { ...ir, layout: testLayout };

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
					},
					input: {
						phase: 'generate',
						options,
						ir: irWithLayout,
					},
					output,
					reporter,
				},
				undefined
			);

			const registryPath = path.join(
				testLayout.resolve('ui.generated'),
				'registry',
				'dataviews',
				'job.ts'
			);
			const registryContents = await workspace.readText(registryPath);

			expect(registryContents).toContain(
				'export const jobDataViewRegistryEntry: DataViewRegistryEntry = {'
			);
			expect(registryContents).toContain("resource: 'job'");
			expect(registryContents).toContain("preferencesKey: 'jobs/admin'");
			expect(registryContents).toContain(
				'metadata: wpkConfigModule.wpkConfig.resources["job"].ui!.admin!.dataviews as unknown as Record<string, unknown>'
			);
		});
	});

	it('falls back to a namespace-scoped preferences key when omitted', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig({
				preferencesKey: undefined,
			});
			const rawConfigSource = buildWPKernelConfigSource();
			const configSource = rawConfigSource.replace(
				"        preferencesKey: 'jobs/admin',\n",
				''
			);
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const testLayout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = { ...ir, layout: testLayout };

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
					},
					input: {
						phase: 'generate',
						options,
						ir: irWithLayout,
					},
					output,
					reporter,
				},
				undefined
			);

			const registryPath = path.join(
				testLayout.resolve('ui.generated'),
				'registry',
				'dataviews',
				'job.ts'
			);
			const registryContents = await workspace.readText(registryPath);

			expect(registryContents).toContain(
				"preferencesKey: 'demo-namespace/dataviews/job'"
			);
		});
	});

	it('emits artifacts for each resource exposing DataViews configuration', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/resources/job.ts',
				'export const job = { ui: { admin: { dataviews: {} } } };\n'
			);
			await workspace.write(
				'src/resources/task.ts',
				'export const task = { ui: { admin: { dataviews: {} } } };\n'
			);

			const jobDataViews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews: jobDataViews,
				resourceKey: 'job',
				resourceName: 'Job',
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const testLayout = await loadTestLayout({ cwd: workspace.root });

			const taskDataViews = buildDataViewsConfig({
				screen: {
					component: 'TasksAdminScreen',
					route: '/admin/tasks',
				},
			});

			const taskResource: ResourceConfig = {
				name: 'Task',
				schema: 'auto',
				routes: {},
				cacheKeys: {},
				ui: { admin: { dataviews: taskDataViews } },
			} as ResourceConfig;

			options.config.resources.task = taskResource;
			ir.config.resources.task = taskResource;
			ir.resources.push({
				name: 'Task',
				schemaKey: 'task',
				schemaProvenance: 'manual',
				routes: [],
				cacheKeys: {
					list: { segments: ['task', 'list'], source: 'config' },
					get: { segments: ['task', 'get'], source: 'config' },
				},
				hash: 'task-hash',
				warnings: [],
			});
			const irWithLayout = { ...ir, layout: testLayout };

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
					},
					input: {
						phase: 'generate',
						options,
						ir: irWithLayout,
					},
					output,
					reporter,
				},
				undefined
			);

			const uiGeneratedRoot = testLayout.resolve('ui.generated');

			await expect(
				workspace.exists(
					path.join(
						uiGeneratedRoot,
						'app',
						'Job',
						'admin',
						'JobsAdminScreen.tsx'
					)
				)
			).resolves.toBe(true);
			await expect(
				workspace.exists(
					path.join(
						uiGeneratedRoot,
						'app',
						'Task',
						'admin',
						'TasksAdminScreen.tsx'
					)
				)
			).resolves.toBe(true);
			expect(output.actions.map((action) => action.file)).toEqual([
				path.join(
					uiGeneratedRoot,
					'app',
					'Job',
					'admin',
					'JobsAdminScreen.tsx'
				),
				path.join(uiGeneratedRoot, 'fixtures', 'dataviews', 'job.ts'),
				path.join(
					uiGeneratedRoot,
					'fixtures',
					'interactivity',
					'job.ts'
				),
				path.join(uiGeneratedRoot, 'registry', 'dataviews', 'job.ts'),
				path.join(
					uiGeneratedRoot,
					'app',
					'Task',
					'admin',
					'TasksAdminScreen.tsx'
				),
				path.join(uiGeneratedRoot, 'fixtures', 'dataviews', 'task.ts'),
				path.join(
					uiGeneratedRoot,
					'fixtures',
					'interactivity',
					'task.ts'
				),
				path.join(uiGeneratedRoot, 'registry', 'dataviews', 'task.ts'),
			]);
		});
	});
});

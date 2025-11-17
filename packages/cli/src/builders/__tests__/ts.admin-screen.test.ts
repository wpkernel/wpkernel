import path from 'node:path';
import {
	createTsBuilder,
	buildAdminScreenCreator,
	buildDataViewFixtureCreator,
} from '../ts';
import {
	withWorkspace as baseWithWorkspace,
	buildWPKernelConfigSource,
	buildDataViewsConfig,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	normalise,
	prefixRelative,
	type BuilderHarnessContext,
} from '@wpkernel/test-utils/builders/tests/ts.test-support';
import { buildWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace';
import { makeIr } from '../../tests/ir.test-support';
import type { BuildIrOptions } from '../../ir/publicTypes';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { loadTestLayout } from '../../tests/layout.test-support';

jest.mock('../../commands/run-generate/validation', () => ({
	validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
}));

const withWorkspace = (
	run: (context: BuilderHarnessContext<Workspace>) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root: string) => buildWorkspace(root),
	});

function materialiseArtifacts(
	artifacts: ReturnType<typeof buildBuilderArtifacts>
): { buildOptions: BuildIrOptions; typedIr: ReturnType<typeof makeIr> } {
	const buildOptions = artifacts.options as unknown as BuildIrOptions;
	const typedIr = makeIr({
		namespace: artifacts.ir.meta.namespace,
		meta: artifacts.ir.meta as any,
		config: buildOptions.config as any,
		schemas: artifacts.ir.schemas as any,
		resources: artifacts.ir.resources as any,
		capabilityMap: artifacts.ir.capabilityMap as any,
		php: artifacts.ir.php as any,
		ui: artifacts.ir.ui as any,
	});

	return { buildOptions, typedIr };
}

describe('createTsBuilder - admin screen creator', () => {
	it('generates admin screens with resolved relative imports', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/bootstrap/kernel.ts',
				'export const kernel = { getUIRuntime: () => ({}) };\n'
			);
			await workspace.write(
				'src/resources/job.ts',
				'export const job = { ui: { admin: { dataviews: {} } } };\n'
			);

			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder({
				creators: [
					buildAdminScreenCreator(),
					buildDataViewFixtureCreator(),
				],
			});

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: typedIr,
					},
					output,
					reporter,
				},
				undefined
			);

			const layout = await loadTestLayout({ cwd: workspace.root });
			const screenPathFs = path.join(
				layout.resolve('ui.generated'),
				'app',
				'job',
				'admin',
				'JobsAdminScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPathFs);

			expect(screenContents).toContain(
				'/** @jsxImportSource @wordpress/element */'
			);
			expect(screenContents).toContain(
				"import { WPKernelError, WPK_NAMESPACE } from '@wpkernel/core/contracts';"
			);
			expect(screenContents).toContain(
				"const jobsAdminScreenInteractivityFeature = 'admin-screen';"
			);
			expect(screenContents).toContain(
				'const jobsAdminScreenInteractivityContext = \'{"feature":"admin-screen","resource":"job"}\';'
			);
			expect(screenContents).toContain(
				'const interactivityNamespace = getJobsAdminScreenInteractivityNamespace();'
			);
			expect(screenContents).toContain(
				'data-wp-interactive={interactivityNamespace}'
			);
			expect(screenContents).toContain(
				'data-wp-context={jobsAdminScreenInteractivityContext}'
			);

			const expectedResourceImport = normalise(
				path
					.relative(
						path.dirname(workspace.resolve(screenPathFs)),
						workspace.resolve('src/resources/job.ts')
					)
					.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
			);
			const expectedKernelImport = normalise(
				path
					.relative(
						path.dirname(workspace.resolve(screenPathFs)),
						workspace.resolve('src/bootstrap/kernel.ts')
					)
					.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
			);

			expect(screenContents).toContain(
				`import { job } from '${prefixRelative(expectedResourceImport)}';`
			);
			expect(screenContents).toContain(
				`import { kernel } from '${prefixRelative(expectedKernelImport)}';`
			);
			expect(screenContents).toContain(
				"export const jobsAdminScreenRoute = '/admin/jobs';"
			);
			expect(screenContents).toContain('context: {');
			expect(screenContents).toContain("resourceName: 'job'");

			expect(output.actions.map((action) => action.file)).toContain(
				path.posix.join(
					layout.resolve('ui.generated'),
					'app/job/admin/JobsAdminScreen.tsx'
				)
			);
		});
	});

	it('uses the resource key when resolving default imports', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/bootstrap/kernel.ts',
				'export const kernel = { getUIRuntime: () => ({}) };\n'
			);
			await workspace.write(
				'src/resources/job-board.ts',
				'export const jobBoard = { ui: { admin: { dataviews: {} } } };\n'
			);

			const dataviews = buildDataViewsConfig({
				screen: { component: 'JobBoardAdminScreen' },
			});
			const configSource = buildWPKernelConfigSource({
				resourceKey: 'job-board',
				resourceName: 'Job Board',
				dataviews: { screen: { component: 'JobBoardAdminScreen' } },
			});
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				resourceKey: 'job-board',
				resourceName: 'Job Board',
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder({
				creators: [buildAdminScreenCreator()],
			});

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: typedIr,
					},
					output,
					reporter,
				},
				undefined
			);

			const layout = await loadTestLayout({ cwd: workspace.root });
			const screenPath = path.join(
				layout.resolve('ui.generated'),
				'app',
				'Job Board',
				'admin',
				'JobBoardAdminScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			const expectedResourceImport = normalise(
				path
					.relative(
						path.dirname(workspace.resolve(screenPath)),
						workspace.resolve('src/resources/job-board.ts')
					)
					.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
			);

			expect(screenContents).toContain(
				`import { jobBoard } from '${prefixRelative(expectedResourceImport)}';`
			);
			expect(screenContents).not.toContain('@/resources/Job Board');
		});
	});

	it('falls back to configured aliases when imports cannot be resolved', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource({
				resourceKey: 'job-board',
				resourceName: 'Job Board',
			});
			await workspace.write('wpk.config.ts', configSource);

			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				resourceKey: 'job-board',
				resourceName: 'Job Board',
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: typedIr,
					},
					output,
					reporter,
				},
				undefined
			);

			const layout = await loadTestLayout({ cwd: workspace.root });
			const screenPath = path.join(
				layout.resolve('ui.generated'),
				'app',
				'Job Board',
				'admin',
				'JobsAdminScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			const expectedResourceImport = normalise(
				path
					.relative(
						path.dirname(workspace.resolve(screenPath)),
						workspace.resolve('src/resources/job-board.ts')
					)
					.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
			);

			expect(screenContents).toContain(
				`import { jobBoard } from '${prefixRelative(expectedResourceImport)}';`
			);
			expect(screenContents).toContain(
				"import { kernel } from '@/bootstrap/kernel';"
			);
		});
	});

	it('respects custom screen metadata for imports and naming', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig({
				screen: {
					component: 'JobsAdminCustomScreen',
					route: '/custom/jobs',
					resourceImport: '@/custom/resources/jobResource',
					resourceSymbol: 'jobResource',
					wpkernelImport: '@/custom/kernel/runtime',
					wpkernelSymbol: 'customKernel',
				},
			});

			const configSource = buildWPKernelConfigSource({
				dataviews: {
					screen: {
						component: 'JobsAdminCustomScreen',
						route: '/custom/jobs',
						resourceImport: '@/custom/resources/jobResource',
						resourceSymbol: 'jobResource',
						wpkernelImport: '@/custom/kernel/runtime',
						wpkernelSymbol: 'customKernel',
					},
				},
			});
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: typedIr,
					},
					output,
					reporter,
				},
				undefined
			);

			const layout = await loadTestLayout({ cwd: workspace.root });
			const screenPath = path.join(
				layout.resolve('ui.generated'),
				'app',
				'job',
				'admin',
				'JobsAdminCustomScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			expect(screenContents).toContain(
				"import { customKernel } from '@/custom/kernel/runtime';"
			);
			expect(screenContents).toContain(
				"import { jobResource } from '@/custom/resources/jobResource';"
			);
			expect(screenContents).toContain(
				'<JobsAdminCustomScreenContent />'
			);
			expect(screenContents).toContain(
				"export const jobsAdminCustomScreenRoute = '/custom/jobs';"
			);
			expect(screenContents).toContain(
				'const runtime = customKernel.getUIRuntime?.();'
			);
			expect(screenContents).toContain('resource={jobResource}');
		});
	});

	it('derives component naming from resource names when overrides are omitted', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig();
			delete (dataviews as { screen?: typeof dataviews.screen }).screen;

			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				resourceName: 'Job Board',
				resourceKey: 'job-board',
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: typedIr,
					},
					output,
					reporter,
				},
				undefined
			);

			const layout = await loadTestLayout({ cwd: workspace.root });
			const screenPath = path.join(
				layout.resolve('ui.generated'),
				'app',
				'Job Board',
				'admin',
				'JobBoardAdminScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			expect(screenContents).toContain(
				'function JobBoardAdminScreenContent()'
			);
			expect(screenContents).toContain(
				'export function JobBoardAdminScreen('
			);
			expect(screenContents).not.toContain('Route =');
		});
	});

	it('sanitizes scoped component identifiers for generated admin screens', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/bootstrap/kernel.ts',
				'export const kernel = { getUIRuntime: () => ({}) };\n'
			);
			await workspace.write(
				'src/resources/job.ts',
				'export const job = { ui: { admin: { dataviews: {} } } };\n'
			);

			const dataviews = buildDataViewsConfig({
				screen: {
					component: '@acme/jobs-admin/JobListScreen',
					route: '/scoped/jobs',
				},
			});
			const configSource = buildWPKernelConfigSource({
				dataviews: {
					screen: {
						component: '@acme/jobs-admin/JobListScreen',
						route: '/scoped/jobs',
					},
				},
			});
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder({
				creators: [buildAdminScreenCreator()],
			});

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: typedIr,
					},
					output,
					reporter,
				},
				undefined
			);

			const layout = await loadTestLayout({ cwd: workspace.root });
			const screenPath = path.join(
				layout.resolve('ui.generated'),
				'app',
				'job',
				'admin',
				'@acme',
				'jobs-admin',
				'JobListScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			expect(screenContents).toContain(
				"export const jobListScreenRoute = '/scoped/jobs';"
			);
			expect(screenContents).toContain(
				"const jobListScreenInteractivityFeature = 'admin-screen';"
			);
			expect(screenContents).toContain(
				'const jobListScreenInteractivityContext = \'{"feature":"admin-screen","resource":"job"}\';'
			);
			expect(screenContents).toContain(
				'const interactivityNamespace = getJobListScreenInteractivityNamespace();'
			);
			expect(screenContents).toContain(
				'function normalizeJobListScreenInteractivitySegment'
			);
			expect(screenContents).toContain('export function JobListScreen(');
			expect(screenContents).not.toMatch(
				/@acme\/jobs-admin\/JobListScreen/
			);
		});
	});
});

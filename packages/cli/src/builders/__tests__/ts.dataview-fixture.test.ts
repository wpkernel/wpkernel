import fs from 'node:fs/promises';
import path from 'node:path';
import { createTsBuilder } from '../ts';
import {
	withWorkspace as baseWithWorkspace,
	buildWPKernelConfigSource,
	buildDataViewsConfig,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	prefixRelative,
	normalise,
	type BuilderHarnessContext,
} from '@wpkernel/test-utils/builders/tests/ts.test-support';
import { buildWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace';
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

describe('createTsBuilder - DataView fixture creator', () => {
	it('generates fixtures referencing the wpk config via a relative path', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);
			const layout = await loadTestLayout({ cwd: workspace.root });

			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const irWithLayout = { ...ir, layout };

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

			const fixturePath = path.join(
				layout.resolve('ui.generated'),
				'fixtures',
				'dataviews',
				'job.ts'
			);
			const fixtureContents = await workspace.readText(fixturePath);

			const expectedConfigImport = prefixRelative(
				normalise(
					path
						.relative(
							path.dirname(workspace.resolve(fixturePath)),
							workspace.resolve('wpk.config.ts')
						)
						.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
				)
			);

			expect(fixtureContents).toContain(
				`import * as wpkConfigModule from '${expectedConfigImport}';`
			);
			expect(fixtureContents).toContain(
				"wpkConfigModule.wpkConfig.resources['job'].ui!.admin!.dataviews"
			);
			expect(fixtureContents).toContain(
				'export const jobDataViewConfig: ResourceDataViewConfig<unknown, unknown>'
			);
		});
	});

	it('emits interactivity fixtures with default helpers', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const layout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = { ...ir, layout };

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

			// const layout = await loadTestLayout({ cwd: workspace.root });
			const interactivityPath = path.join(
				layout.resolve('ui.generated'),
				'fixtures',
				'interactivity',
				'job.ts'
			);
			const interactivityContents =
				await workspace.readText(interactivityPath);

			expect(interactivityContents).toContain(
				"import { createDataViewInteraction, type DataViewInteractionResult } from '@wpkernel/ui/dataviews';"
			);
			expect(interactivityContents).toContain(
				"const jobsAdminScreenInteractivityFeature = 'admin-screen';"
			);
			expect(interactivityContents).toContain(
				'export const jobsAdminScreenInteractivityNamespace = getJobsAdminScreenInteractivityNamespace();'
			);
			expect(interactivityContents).toContain(
				'export interface CreateJobsAdminScreenDataViewInteractionOptions'
			);
			expect(interactivityContents).toContain(
				'export function createJobsAdminScreenDataViewInteraction(options: CreateJobsAdminScreenDataViewInteractionOptions = {})'
			);
			expect(interactivityContents).toContain(
				'bindings[candidate.id] = candidate.action as InteractionActionInput<unknown, unknown>;'
			);
		});
	});

	it('sanitizes interactivity fixtures when screen components are scoped', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig({
				screen: {
					component: '@acme/jobs-admin/JobListScreen',
				},
			});
			const configSource = buildWPKernelConfigSource({
				dataviews: {
					screen: {
						component: '@acme/jobs-admin/JobListScreen',
					},
				},
			});
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const layout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = { ...ir, layout };

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

			const interactivityPath = path.join(
				layout.resolve('ui.generated'),
				'fixtures',
				'interactivity',
				'job.ts'
			);
			const interactivityContents =
				await workspace.readText(interactivityPath);

			expect(interactivityContents).toContain(
				"const jobListScreenInteractivityFeature = 'admin-screen';"
			);
			expect(interactivityContents).toContain(
				'export const jobListScreenInteractivityNamespace = getJobListScreenInteractivityNamespace();'
			);
			expect(interactivityContents).toContain(
				'function normalizeJobListScreenInteractivitySegment'
			);
			expect(interactivityContents).toContain(
				'export interface CreateJobListScreenDataViewInteractionOptions'
			);
			expect(interactivityContents).toContain(
				'export function createJobListScreenDataViewInteraction(options: CreateJobListScreenDataViewInteractionOptions = {})'
			);
			expect(interactivityContents).not.toMatch(
				/@acme\/jobs-admin\/JobListScreen/
			);
		});
	});

	it('derives fixture names from the resource key', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				resourceKey: 'job-board',
				resourceName: 'Job Board',
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const layout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = { ...ir, layout };

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

			const fixturePath = path.join(
				layout.resolve('ui.generated'),
				'fixtures',
				'dataviews',
				'job-board.ts'
			);
			const fixtureContents = await workspace.readText(fixturePath);

			expect(fixtureContents).toContain(
				'export const jobBoardDataViewConfig: ResourceDataViewConfig<unknown, unknown>'
			);
		});
	});

	it('falls back to alias when wpk config path is outside the workspace root', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const layout = await loadTestLayout({ cwd: workspace.root });
			const externalDir = path.join(
				path.dirname(root),
				'external-kernel-config'
			);
			await fs.mkdir(externalDir, { recursive: true });
			const externalConfigPath = path.join(externalDir, 'wpk.config.ts');
			await fs.writeFile(externalConfigPath, buildWPKernelConfigSource());

			try {
				const dataviews = buildDataViewsConfig();
				const { ir, options } = buildBuilderArtifacts({
					dataviews,
					sourcePath: externalConfigPath,
				});
				const irWithLayout = { ...ir, layout };

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

				const fixturePath = path.join(
					layout.resolve('ui.generated'),
					'fixtures',
					'dataviews',
					'job.ts'
				);
				const fixtureContents = await workspace.readText(fixturePath);

				expect(fixtureContents).toContain(
					"import * as wpkConfigModule from '@/external-kernel-config/wpk.config';"
				);
			} finally {
				await fs.rm(externalDir, { recursive: true, force: true });
			}
		});
	});
});

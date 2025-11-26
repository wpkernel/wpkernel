import path from 'node:path';
import { createTsBuilder, buildAdminScreenCreator } from '../ts';
import {
	withWorkspace as baseWithWorkspace,
	buildWPKernelConfigSource,
	buildDataViewsConfig,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	type BuilderHarnessContext,
} from '@cli-tests/builders/ts.test-support';
import { buildWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace';
import { loadTestLayout } from '@wpkernel/test-utils/layout.test-support';
import { buildEmptyGenerationState } from '../../apply/manifest';

const withWorkspace = (
	run: (context: BuilderHarnessContext<Workspace>) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root: string) => buildWorkspace(root),
	});

describe('createTsBuilder - orchestration (IR-driven)', () => {
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
			await expect(
				workspace.exists(
					path.join(
						testLayout.resolve('ui.generated'),
						'app/job/admin/JobAdminScreen.tsx'
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

			const builder = createTsBuilder({
				creators: [
					buildAdminScreenCreator(),
					{
						key: 'builder.generate.ts.custom.test',
						async create({ project, descriptor, emit }) {
							const filePath = path.join(
								testLayout.resolve('ui.generated'),
								'extras',
								`${descriptor.key}.ts`
							);
							const sourceFile = project.createSourceFile(
								filePath,
								'',
								{ overwrite: true }
							);
							sourceFile.addStatements(
								`export const marker = '${descriptor.name}';`
							);
							await emit({ filePath, sourceFile });
						},
					},
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

			expect(await workspace.exists(customArtifactPath)).toBe(true);
			const screenPath = path.join(
				uiGeneratedRoot,
				'app',
				'job',
				'admin',
				'JobAdminScreen.tsx'
			);
			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining([screenPath, customArtifactPath])
			);
		});
	});

	it('emits admin screens for resources declaring dataviews', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const testLayout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = { ...ir, layout: testLayout };

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
						options,
						ir: irWithLayout,
					},
					output,
					reporter,
				},
				undefined
			);

			const uiGeneratedRoot = testLayout.resolve('ui.generated');

			const screenPath = path.join(
				uiGeneratedRoot,
				'app',
				'job',
				'admin',
				'JobAdminScreen.tsx'
			);
			expect(await workspace.exists(screenPath)).toBe(true);
			expect(output.actions.map((action) => action.file)).toEqual(
				expect.arrayContaining([
					path.join(
						uiGeneratedRoot,
						'app',
						'job',
						'admin',
						'JobAdminScreen.tsx'
					),
				])
			);
		});
	});
});

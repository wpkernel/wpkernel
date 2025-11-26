import path from 'node:path';
import { createTsBuilder, buildAdminScreenCreator } from '../ts';
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
} from '@cli-tests/builders/ts.test-support';
import { buildWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { loadTestLayout } from '@wpkernel/test-utils/layout.test-support';

jest.mock('../../commands/run-generate/validation', () => ({
	validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
}));

const withWorkspace = (
	run: (context: BuilderHarnessContext<Workspace>) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root: string) => buildWorkspace(root),
	});

describe('createTsBuilder - admin screen creator', () => {
	it('generates admin screens with resolved relative imports', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/admin/runtime.ts',
				[
					"import type { WPKernelUIRuntime } from '@wpkernel/core/data';",
					'',
					'export const adminScreenRuntime = {',
					'  setUIRuntime: (_: WPKernelUIRuntime) => {},',
					'  getUIRuntime: () => ({} as WPKernelUIRuntime),',
					'};',
					'',
				].join('\n')
			);
			await workspace.write(
				'src/resources/job.ts',
				'export const job = { ui: { admin: { view: "dataviews" } } };\n'
			);

			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const dataviews = buildDataViewsConfig();
			const artifacts = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const testLayout = await loadTestLayout({ cwd: workspace.root });
			const irWithLayout = {
				...artifacts.ir,
				layout: testLayout,
			};

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
						options: artifacts.options,
						ir: irWithLayout,
					},
					output,
					reporter,
				},
				undefined
			);

			const screenFileName = 'JobAdminScreen.tsx';
			const screenPathFs = path.join(
				testLayout.resolve('ui.generated'),
				'app',
				'job',
				'admin',
				screenFileName
			);
			const appliedScreenPath = path.join(
				testLayout.resolve('ui.applied'),
				'app',
				'job',
				'admin',
				screenFileName
			);
			const emittedFiles = output.actions.map((action) => action.file);
			expect(emittedFiles).toContain(screenPathFs.replace(/\\/g, '/'));
			const screenContents = await workspace.readText(screenPathFs);
			expect(screenContents).not.toBeNull();

			expect(screenContents as string).toContain(
				"import { WPKernelError, WPK_NAMESPACE } from '@wpkernel/core/contracts';"
			);
			expect(screenContents as string).toContain(
				"const jobAdminScreenInteractivityFeature = 'admin-screen';"
			);
			expect(screenContents as string).toContain(
				'data-wp-interactive={interactivityNamespace}'
			);
			expect(screenContents as string).toContain(
				'data-wp-context={jobAdminScreenInteractivityContext}'
			);

			const expectedResourceImport = normalise(
				path
					.relative(
						path.dirname(appliedScreenPath),
						path.join(
							testLayout.resolve('ui.applied'),
							'resources',
							'job.ts'
						)
					)
					.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
			);
			expect(screenContents).toContain(
				`import { job } from '${prefixRelative(expectedResourceImport)}';`
			);
			const expectedRuntimeImport = path.posix
				.relative(
					path.posix.dirname(appliedScreenPath),
					path.posix.join(
						testLayout.resolve('ui.applied'),
						'runtime.ts'
					)
				)
				.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '');
			expect(screenContents).toContain(
				`from '${prefixRelative(expectedRuntimeImport)}'`
			);
			expect(screenContents).toContain(
				"export const jobAdminScreenRoute = 'job-job';"
			);

			expect(output.actions.map((action) => action.file)).toContain(
				path.posix.join(
					testLayout.resolve('ui.generated'),
					'app/job/admin/JobAdminScreen.tsx'
				)
			);
		});
	});
});

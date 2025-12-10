import path from 'node:path';
import { createAdminScreenBuilder } from '../ts';
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
import { buildTestArtifactsPlan } from '@cli-tests/ir.test-support';
import { resolveAdminPaths } from '../ts/admin-screen';

jest.mock('../../commands/run-generate/validation', () => ({
	validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
}));

const withWorkspace = (
	run: (context: BuilderHarnessContext<Workspace>) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root: string) => buildWorkspace(root),
	});

describe('createAdminScreenBuilder', () => {
	it('generates admin screens with resolved relative imports', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/runtime.ts',
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
			const irWithLayout = artifacts.ir;
			const baseArtifacts = buildTestArtifactsPlan(irWithLayout.layout);
			// Wire surfaces/resources/runtime paths directly via artifacts so no layout lookups are required.
			irWithLayout.artifacts = {
				...baseArtifacts,
				runtime: {
					entry: {
						generated: 'src/runtime/entry.ts',
						applied: 'src/runtime/entry.ts',
					},
					runtime: {
						generated: 'src/runtime.ts',
						applied: 'src/runtime.ts',
					},
					blocksRegistrarPath: 'src/runtime/blocks.ts',
					uiLoader: undefined,
				},
				surfaces: {
					[artifacts.ir.resources[0]!.id]: {
						resource: artifacts.ir.resources[0]!.name,
						appDir: 'src/ui',
						generatedAppDir: 'src/ui/generated',
						pagePath: 'src/ui/page.tsx',
						formPath: 'src/ui/form.tsx',
						configPath: 'src/ui/config.tsx',
					},
				},
				resources: {
					[artifacts.ir.resources[0]!.id]: {
						modulePath: 'src/resources/job.ts',
						typeDefPath: 'types/job.d.ts',
						typeSource: 'inferred',
						schemaKey: 'job',
					},
				},
				plan: baseArtifacts.plan,
				bundler: baseArtifacts.bundler,
				php: baseArtifacts.php,
			};

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createAdminScreenBuilder();

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

			const resourceId = artifacts.ir.resources[0]!.id;
			const surfacePlan = irWithLayout.artifacts.surfaces[resourceId]!;
			const resourcePlan = irWithLayout.artifacts.resources[resourceId]!;
			const paths = resolveAdminPaths(surfacePlan, {
				identifier: 'JobAdminScreen',
				fileName: 'page',
				directories: [],
			});
			const screenPathFs = paths.generatedScreenPath;
			const appliedScreenPath = paths.appliedScreenPath;
			const emittedFiles = output.actions.map((action) => action.file);
			expect(emittedFiles).toContain(screenPathFs.replace(/\\/g, '/'));
			const screenContents = await workspace.readText(screenPathFs);
			expect(screenContents).not.toBeNull();

			const relativeImport = (from: string, target: string) =>
				prefixRelative(
					normalise(
						path
							.relative(path.dirname(from), target)
							.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
					)
				);
			const expectedResourceImport = relativeImport(
				appliedScreenPath,
				resourcePlan.modulePath
			);
			expect(screenContents).toContain(
				`import { job } from "${expectedResourceImport}";`
			);
			const expectedRuntimeImport = relativeImport(
				appliedScreenPath,
				irWithLayout.artifacts.runtime.runtime.applied
			);
			expect(screenContents).toContain(`from "${expectedRuntimeImport}"`);
			expect(screenContents).toContain(
				'export const jobAdminScreenRoute = "demo-namespace-job";'
			);

			expect(output.actions.map((action) => action.file)).toContain(
				paths.generatedScreenPath
			);
		});
	});
});

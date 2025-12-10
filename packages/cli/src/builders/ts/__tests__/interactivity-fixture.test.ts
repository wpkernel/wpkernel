import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';
import { createDataViewInteractivityFixtureBuilder } from '../interactivity-fixture';
import { buildEmptyGenerationState } from '../../../apply/manifest';

function buildWorkspace() {
	const writes: Array<{ file: string; contents: string }> = [];
	const workspace = makeWorkspaceMock({
		write: async (
			file: string,
			data: string | Buffer,
			_options?: unknown
		) => {
			writes.push({ file, contents: String(data) });
		},
		resolve: (...parts: string[]) => path.join(process.cwd(), ...parts),
	});
	return { workspace, writes };
}

describe('interactivity fixture builder', () => {
	it('skips when no ui resources', async () => {
		const ir = makeIr();
		ir.artifacts.surfaces = {};
		const reporter = buildReporter();
		const { workspace, writes } = buildWorkspace();
		const output = buildOutput();

		await createDataViewInteractivityFixtureBuilder().apply(
			{
				input: {
					phase: 'generate',
					options: {
						namespace: ir.meta.namespace,
						origin: ir.meta.origin,
						sourcePath: ir.meta.sourcePath,
					},
					ir,
				},
				context: {
					workspace,
					reporter,
					phase: 'generate',
					generationState: buildEmptyGenerationState(),
				},
				output,
				reporter,
			},
			undefined
		);

		expect(writes).toHaveLength(0);
	});

	it('emits fixture when plans and dataviews exist', async () => {
		const ir = makeIr();
		const resource = makeResource({ id: 'res:job', name: 'job' });
		ir.resources = [resource];
		resource.ui = {
			admin: { view: 'dataviews', interactivity: { feature: 'custom' } },
		} as any;
		ir.artifacts.resources[resource.id] = {
			modulePath: `/generated/app/${resource.name}/resource.ts`,
			typeDefPath: '/generated/types/job.d.ts',
			typeSource: 'inferred',
		};
		ir.artifacts.surfaces[resource.id] = {
			resource: resource.name,
			appDir: `/app/${resource.name}`,
			generatedAppDir: `/generated/app/${resource.name}`,
			pagePath: `/app/${resource.name}/page.tsx`,
			formPath: `/app/${resource.name}/form.tsx`,
			configPath: `/app/${resource.name}/config.tsx`,
		};

		const reporter = buildReporter();
		const { workspace, writes } = buildWorkspace();
		const output = buildOutput();

		await createDataViewInteractivityFixtureBuilder().apply(
			{
				input: {
					phase: 'generate',
					options: {
						namespace: ir.meta.namespace,
						origin: ir.meta.origin,
						sourcePath: ir.meta.sourcePath,
					},
					ir,
				},
				context: {
					workspace,
					reporter,
					phase: 'generate',
					generationState: buildEmptyGenerationState(),
				},
				output,
				reporter,
			},
			undefined
		);

		expect(
			writes.some((w) => w.file.includes('fixtures/interactivity'))
		).toBe(true);
	});
});

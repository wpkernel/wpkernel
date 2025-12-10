import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';
import { createAppFormBuilder } from '../app-form';

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

describe('app-form builder', () => {
	it('skips outside generate phase', async () => {
		const ir = makeIr();
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createAppFormBuilder().apply(
			{
				input: {
					phase: 'init',
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
					phase: 'init',
					generationState: buildEmptyGenerationState(),
				},
				output,
				reporter,
			},
			undefined
		);

		expect(writes).toHaveLength(0);
	});

	it('skips when no ui plan', async () => {
		const ir = makeIr();
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createAppFormBuilder().apply(
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

	it('skips when ui plan missing generatedAppDir', async () => {
		const ir = makeIr();
		const resource = makeResource({ name: 'job' });
		ir.resources = [resource];
		ir.artifacts.surfaces[resource.id] = {
			resource: resource.id,
			appDir: '',
			generatedAppDir: '',
			pagePath: '',
			formPath: '',
			configPath: '',
		};
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createAppFormBuilder().apply(
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

	it('emits form when plan has generatedAppDir', async () => {
		const ir = makeIr();
		const resource = makeResource({
			name: 'job',
			storage: {
				mode: 'wp-post',
				supports: ['title'],
				meta: { rating: { type: 'number' }, flag: { type: 'boolean' } },
				taxonomies: { topics: { taxonomy: 'topics' } },
				statuses: ['draft', 'publish'],
			} as any,
		});
		ir.resources = [resource];
		ir.artifacts.surfaces[resource.id] = {
			resource: resource.id,
			appDir: `/app/${resource.name}`,
			generatedAppDir: `/generated/app/${resource.name}`,
			pagePath: '',
			formPath: '',
			configPath: '',
		};
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createAppFormBuilder().apply(
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

		const formWrite = writes.find((w) => w.file.endsWith('form.tsx'));
		expect(formWrite).toBeDefined();
		expect(formWrite?.contents).toContain('QuickForm');
		expect(formWrite?.contents).toContain('rating');
		expect(formWrite?.contents).toContain('topics');
	});
});

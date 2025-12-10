import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createAppConfigBuilder } from '../app-config';
import { buildEmptyGenerationState } from '../../../apply/manifest';

function buildWorkspace() {
	const writes: Array<{ file: string; contents: string }> = [];
	const workspace = makeWorkspaceMock({
		write: async (file: string, contents: string | Buffer) => {
			writes.push({ file, contents: String(contents) });
		},
		resolve: (...parts: string[]) => path.join(process.cwd(), ...parts),
	});
	return { workspace, writes };
}

describe('app-config builder', () => {
	it('skips when not in generate phase', async () => {
		const ir = makeIr();
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createAppConfigBuilder().apply(
			{
				input: {
					phase: 'apply',
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
					phase: 'apply',
					generationState: buildEmptyGenerationState(),
				},
				output,
				reporter,
			},
			undefined
		);

		expect(writes).toHaveLength(0);
	});

	it('skips when ui plan missing', async () => {
		const ir = makeIr();
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createAppConfigBuilder().apply(
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

	it('writes config when ui plan exists', async () => {
		const ir = makeIr();
		const resource = makeResource({
			name: 'job',
			storage: {
				mode: 'wp-post',
				supports: ['title'],
				meta: {
					rating: { type: 'number' },
				},
				taxonomies: {
					topics: { taxonomy: 'topics' },
				},
			} as any,
		});
		ir.resources = [resource];
		ir.artifacts.surfaces[resource.id] = {
			resource: resource.name,
			appDir: `/app/${resource.name}`,
			generatedAppDir: `/generated/app/${resource.name}`,
			pagePath: '',
			formPath: '',
			configPath: '',
		};
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createAppConfigBuilder().apply(
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

		const configWrite = writes.find((w) => w.file.endsWith('config.tsx'));
		expect(configWrite).toBeDefined();
		expect(configWrite?.contents).toContain("id: 'title'");
		expect(configWrite?.contents).toContain("id: 'rating'");
		expect(configWrite?.contents).toContain("id: 'topics'");
	});

	it('handles resources without storage gracefully', async () => {
		const ir = makeIr();
		const resource = makeResource({ name: 'ghost', storage: undefined });
		ir.resources = [resource];
		ir.artifacts.surfaces[resource.id] = {
			appDir: '',
			resource: resource.name,
			generatedAppDir: `/generated/app/${resource.name}`,
			pagePath: '',
			formPath: '',
			configPath: '',
		};
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createAppConfigBuilder().apply(
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

		const configWrite = writes.find((w) => w.file.endsWith('config.tsx'));
		expect(configWrite).toBeDefined();
	});
});

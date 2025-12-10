import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';
import { createTsResourcesBuilder } from '../resources';
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

describe('createTsResourcesBuilder', () => {
	it('skips when no resources', async () => {
		const ir = makeIr();
		ir.resources = [];
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsResourcesBuilder().apply(
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

	it('writes resource definition when artifact plan exists', async () => {
		const ir = makeIr();
		const resource = makeResource({ id: 'res:job', name: 'job' });
		ir.resources = [resource];
		ir.artifacts.resources[resource.id] = {
			modulePath: `/generated/app/${resource.name}/resource.ts`,
			typeDefPath: `/generated/types/${resource.name}.d.ts`,
			typeSource: 'schema',
			schemaKey: resource.schemaKey,
		};

		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsResourcesBuilder().apply(
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

		expect(writes.some((w) => w.file.includes('app/job/resource.ts'))).toBe(
			true
		);
	});
});

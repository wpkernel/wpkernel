import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';
import { createDataViewRegistryBuilder } from '../registry';
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

describe('registry builder', () => {
	it('warns when resource is missing', async () => {
		const ir = makeIr();
		ir.artifacts.surfaces = {
			missing: {
				resource: 'missing',
				appDir: '/app/missing',
				generatedAppDir: '/generated/app/missing',
				pagePath: '',
				formPath: '',
				configPath: '',
			},
		};
		ir.artifacts.runtime = {
			entry: {
				generated: '/generated/entry/index.tsx',
				applied: '/app/entry/index.tsx',
			},
			runtime: {
				generated: '/generated/runtime',
				applied: '/app/runtime',
			},
			blocksRegistrarPath: '/generated/blocks/auto-register.ts',
			uiLoader: undefined,
		};
		const reporter = buildReporter();
		const { workspace } = buildWorkspace();
		const output = buildOutput();

		await createDataViewRegistryBuilder().apply(
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

		expect(reporter.warn).toHaveBeenCalled();
	});

	it('skips when no dataviews present', async () => {
		const ir = makeIr();
		const resource = makeResource({ name: 'job', id: 'res:job' });
		resource.ui = { admin: { view: 'dataviews' } } as any;
		ir.resources = [resource];
		ir.artifacts.surfaces = {
			'res:job': {
				resource: 'job',
				appDir: '/app/job',
				generatedAppDir: '/generated/app/job',
				pagePath: '',
				formPath: '',
				configPath: '',
			},
		};
		ir.artifacts.runtime = {
			entry: {
				generated: '/generated/entry/index.tsx',
				applied: '/app/entry/index.tsx',
			},
			runtime: {
				generated: '/generated/runtime',
				applied: '/app/runtime',
			},
			blocksRegistrarPath: '/generated/blocks/auto-register.ts',
			uiLoader: undefined,
		};
		const reporter = buildReporter();
		const { workspace, writes } = buildWorkspace();
		const output = buildOutput();

		await createDataViewRegistryBuilder().apply(
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

		expect(writes.length).toBeGreaterThan(0);
	});
});

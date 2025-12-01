import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createDataViewRegistryBuilder } from '../registry';

function buildWorkspace() {
	const writes: Array<{ file: string; contents: string }> = [];
	const workspace = makeWorkspaceMock({
		write: async (file: string, contents: string) => {
			writes.push({ file, contents: String(contents) });
		},
		resolve: (...parts: string[]) => path.join(process.cwd(), ...parts),
	});
	return { workspace, writes };
}

describe('registry builder', () => {
	it('warns when resource is missing', async () => {
		const ir = makeIr();
		ir.ui = {
			resources: [
				{
					resource: 'missing',
					dataviews: {} as any,
					preferencesKey: '',
				},
			],
		};
		const reporter = buildReporter();
		const { workspace } = buildWorkspace();
		const output = buildOutput();

		await createDataViewRegistryBuilder().apply(
			{
				input: {
					phase: 'generate',
					options: {
						config: ir.config,
						namespace: ir.meta.namespace,
					},
					ir,
				},
				context: {
					workspace,
					reporter,
					phase: 'generate',
					generationState: { files: new Map(), alias: new Map() },
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
		ir.resources = [
			{ ...ir.resources[0], name: 'job', id: 'res:job' } as any,
		];
		ir.ui = {
			resources: [{ resource: 'job', preferencesKey: 'prefs' }] as any,
		};
		const reporter = buildReporter();
		const { workspace, writes } = buildWorkspace();
		const output = buildOutput();

		await createDataViewRegistryBuilder().apply(
			{
				input: {
					phase: 'generate',
					options: {
						config: ir.config,
						namespace: ir.meta.namespace,
					},
					ir,
				},
				context: {
					workspace,
					reporter,
					phase: 'generate',
					generationState: { files: new Map(), alias: new Map() },
				},
				output,
				reporter,
			},
			undefined
		);

		expect(writes).toHaveLength(0);
	});
});

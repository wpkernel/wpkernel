import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createDataViewInteractivityFixtureBuilder } from '../interactivity-fixture';

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

describe('interactivity fixture builder', () => {
	it('skips when no ui resources', async () => {
		const ir = makeIr();
		ir.ui = { resources: [] };
		const reporter = buildReporter();
		const { workspace, writes } = buildWorkspace();
		const output = buildOutput();

		await createDataViewInteractivityFixtureBuilder().apply(
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

	it('emits fixture when plans and dataviews exist', async () => {
		const ir = makeIr();
		const resource = {
			...ir.resources[0],
			id: 'res:job',
			name: 'job',
		} as any;
		ir.resources = [resource];
		ir.ui = {
			resources: [
				{
					resource: resource.name,
					dataviews: {
						fields: [],
						defaultView: { type: 'table' },
						interactivity: { feature: 'custom' },
						screen: {},
					},
					preferencesKey: 'prefs',
					menu: {},
				},
			],
		};
		ir.artifacts.resources[resource.id] = {
			modulePath: path.posix.join(
				ir.layout.resolve('ui.resources.applied'),
				`${resource.name}.ts`
			),
			typeDefPath: '',
			typeSource: 'inferred',
		};

		const reporter = buildReporter();
		const { workspace, writes } = buildWorkspace();
		const output = buildOutput();

		await createDataViewInteractivityFixtureBuilder().apply(
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

		expect(
			writes.some((w) => w.file.includes('fixtures/interactivity'))
		).toBe(true);
	});
});

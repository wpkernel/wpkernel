import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createAppConfigBuilder } from '../app-config';

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

describe('app-config builder', () => {
	it('skips when not in generate phase', async () => {
		const ir = makeIr();
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createAppConfigBuilder().apply(
			{
				input: {
					phase: 'init',
					options: {
						config: ir.config,
						namespace: ir.meta.namespace,
					},
					ir,
				},
				context: {
					workspace,
					reporter,
					phase: 'init',
					generationState: { files: new Map(), alias: new Map() },
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
		ir.artifacts.uiResources[resource.id] = {
			appDir: path.posix.join(
				ir.layout.resolve('ui.applied'),
				'app',
				resource.name
			),
			generatedAppDir: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'app',
				resource.name
			),
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
		ir.artifacts.uiResources[resource.id] = {
			appDir: '',
			generatedAppDir: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'app',
				resource.name
			),
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

		const configWrite = writes.find((w) => w.file.endsWith('config.tsx'));
		expect(configWrite).toBeDefined();
	});
});

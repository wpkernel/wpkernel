import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createTsResourcesBuilder } from '../resources';

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

	it('writes resource definition when artifact plan exists', async () => {
		const ir = makeIr();
		const resource = {
			id: 'res:job',
			name: 'job',
			schemaKey: 'job',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: { list: { segments: [], source: 'default' } } as any,
			hash: { algo: 'sha256', inputs: [], value: 'job' },
			warnings: [],
		} as any;
		ir.resources = [resource];
		ir.artifacts.resources[resource.id] = {
			modulePath: path.posix.join(
				ir.layout.resolve('ui.resources.applied'),
				`${resource.name}.ts`
			),
			typeDefPath: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'types',
				`${resource.name}.d.ts`
			),
			typeSource: 'schema',
		};

		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsResourcesBuilder().apply(
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

		expect(writes.some((w) => w.file.includes('resources/job.ts'))).toBe(
			true
		);
	});
});

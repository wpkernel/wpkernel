import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createTsTypesBuilder } from '../ts.types';

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

const baseResource = {
	id: 'res:job',
	name: 'job',
	schemaKey: 'job',
	schemaProvenance: 'manual',
	routes: [],
	cacheKeys: { list: { segments: [], source: 'default' } } as any,
	hash: { algo: 'sha256', inputs: [], value: 'job' },
	warnings: [],
} as any;

describe('ts.types builder (branches)', () => {
	it('skips when not in generate phase', async () => {
		const ir = makeIr();
		ir.resources = [{ ...baseResource }];
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsTypesBuilder().apply(
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

	it('skips when resource plan is missing', async () => {
		const ir = makeIr();
		ir.resources = [{ ...baseResource }];
		ir.schemas = [];
		ir.artifacts.schemas = {};
		ir.artifacts.resources = {};
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsTypesBuilder().apply(
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

	it('writes empty interface when storage is undefined', async () => {
		const ir = makeIr();
		const resource = { ...baseResource, storage: undefined };
		ir.resources = [resource];
		ir.schemas.push({
			key: resource.schemaKey,
			hash: { algo: 'sha256', inputs: [], value: 'schema' },
			schema: { type: 'object', properties: {} },
			sourcePath: 'schema.json',
			warnings: [],
			source: 'config',
		});
		ir.artifacts.schemas[resource.schemaKey] = {
			schemaPath: 'schema.json',
			typeDefPath: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'types',
				`${resource.name}.d.ts`
			),
			typeSource: 'inferred',
		};
		ir.artifacts.resources[resource.id] = {
			modulePath: '',
			typeDefPath: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'types',
				`${resource.name}.d.ts`
			),
			typeSource: 'inferred',
		};
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsTypesBuilder().apply(
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

		expect(writes.some((w) => w.contents.includes('interface Job'))).toBe(
			true
		);
	});

	it('handles wp-post storage and identity fields', async () => {
		const ir = makeIr();
		const resource = {
			...baseResource,
			storage: {
				mode: 'wp-post',
				postType: 'job',
				supports: ['title'],
				meta: {},
				taxonomies: {},
				statuses: [],
			},
			identity: { type: 'number', param: 'id' },
		};
		ir.resources = [resource];
		ir.schemas.push({
			key: resource.schemaKey,
			hash: { algo: 'sha256', inputs: [], value: 'schema' },
			schema: { type: 'object', properties: {} },
			sourcePath: 'schema.json',
			warnings: [],
			source: 'config',
		});
		ir.artifacts.schemas[resource.schemaKey] = {
			schemaPath: 'schema.json',
			typeDefPath: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'types',
				`${resource.name}.d.ts`
			),
			typeSource: 'inferred',
		};
		ir.artifacts.resources[resource.id] = {
			modulePath: '',
			typeDefPath: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'types',
				`${resource.name}.d.ts`
			),
			typeSource: 'inferred',
		};
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsTypesBuilder().apply(
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

		const dts =
			writes.find((w) => w.file.endsWith('job.d.ts'))?.contents ?? '';
		expect(dts).toContain('interface Job');
		expect(dts).toContain('id');
		expect(dts).toContain('title');
	});

	it('uses schema fallback by resource name when schemaKey is missing', async () => {
		const ir = makeIr();
		const resource = {
			...baseResource,
			schemaKey: undefined,
			name: 'article',
		};
		ir.resources = [resource];
		ir.schemas.push({
			key: 'article',
			hash: { algo: 'sha256', inputs: [], value: 'schema' },
			schema: { type: 'object', properties: {} },
			sourcePath: 'schema.json',
			warnings: [],
			source: 'config',
		});
		ir.artifacts.schemas.article = {
			schemaPath: 'schema.json',
			typeDefPath: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'types',
				'article.d.ts'
			),
			typeSource: 'inferred',
		};
		ir.artifacts.resources[resource.id] = {
			modulePath: '',
			typeDefPath: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'types',
				'article.d.ts'
			),
			typeSource: 'inferred',
		};

		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsTypesBuilder().apply(
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

		expect(writes.some((w) => w.file.endsWith('article.d.ts'))).toBe(true);
	});

	it('reports warn when generation fails', async () => {
		const ir = makeIr();
		const resource = { ...baseResource };
		ir.resources = [resource];
		ir.schemas.push({
			key: resource.schemaKey,
			hash: { algo: 'sha256', inputs: [], value: 'schema' },
			schema: { type: 'object', properties: {} },
			sourcePath: 'schema.json',
			warnings: [],
			source: 'config',
		});
		ir.artifacts.schemas[resource.schemaKey] = {
			schemaPath: 'schema.json',
			typeDefPath: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'types',
				`${resource.name}.d.ts`
			),
			typeSource: 'inferred',
		};
		ir.artifacts.resources[resource.id] = {
			modulePath: '',
			typeDefPath: path.posix.join(
				ir.layout.resolve('ui.generated'),
				'types',
				`${resource.name}.d.ts`
			),
			typeSource: 'inferred',
		};

		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		workspace.write = jest.fn(async () => {
			throw new Error('boom');
		});

		await createTsTypesBuilder().apply(
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
		expect(reporter.warn).toHaveBeenCalled();
	});
});

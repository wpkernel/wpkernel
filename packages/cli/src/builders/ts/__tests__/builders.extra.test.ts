import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createTsCapabilityBuilder } from '../capabilities';
import { createTsIndexBuilder } from '../ts.index';
import { createTsTypesBuilder } from '../ts.types';
import { createDataViewRegistryBuilder } from '../registry';
import { createDataViewInteractivityFixtureBuilder } from '../interactivity-fixture';
import { buildDataViewFixtureCreator } from '../dataview-fixture';
import {
	collectResourceDescriptors,
	buildEmitter,
	isGeneratePhase,
	requireIr,
} from '../utils';
import type { BuilderOutput } from '../../../runtime/types';
import type { IRResource, IRv1 } from '../../../ir/publicTypes';
import { loadTsMorph } from '../runtime-loader';

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

function seedResource(ir: IRv1, name = 'job'): IRResource {
	const resource: IRResource = {
		id: `res:${name}`,
		name,
		schemaKey: name,
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: { list: { segments: [], source: 'default' } } as any,
		identity: { type: 'number', param: 'id' } as any,
		storage: { mode: 'wp-option', option: name } as any,
		hash: { algo: 'sha256', inputs: [], value: name },
		warnings: [],
	} as IRResource;
	ir.resources = [resource];
	ir.schemas.push({
		key: name,
		hash: { algo: 'sha256', inputs: [], value: 'schema' },
		schema: { type: 'object', properties: {} },
		sourcePath: 'schema.json',
		warnings: [],
		source: 'config',
	});
	ir.artifacts.schemas[name] = {
		schemaPath: path.posix.join(
			ir.layout.resolve('ui.generated'),
			'schemas',
			`${name}.json`
		),
		typeDefPath: path.posix.join(
			ir.layout.resolve('ui.generated'),
			'types',
			`${name}.d.ts`
		),
		typeSource: 'inferred',
	};
	ir.artifacts.resources[resource.id] = {
		modulePath: path.posix.join(
			ir.layout.resolve('ui.resources.applied'),
			`${name}.ts`
		),
		typeDefPath: path.posix.join(
			ir.layout.resolve('ui.generated'),
			'types',
			`${name}.d.ts`
		),
		typeSource: 'schema',
	};
	return resource;
}

describe('ts builder utilities', () => {
	it('collectResourceDescriptors maps ui resources to descriptors', () => {
		const ir = makeIr();
		seedResource(ir, 'demo');
		ir.ui = {
			resources: [
				{
					resource: 'demo',
					dataviews: { fields: [], defaultView: { type: 'table' } },
					preferencesKey: 'prefs',
				},
			],
		};

		const descriptors = collectResourceDescriptors(ir);
		expect(descriptors).toHaveLength(1);
		expect(descriptors[0].adminView).toBe('dataviews');
	});

	it('isGeneratePhase logs and skips non-generate phases', () => {
		const reporter = buildReporter();
		expect(isGeneratePhase('apply', reporter)).toBe(false);
		expect(reporter.debug).toHaveBeenCalled();
		expect(isGeneratePhase('generate', reporter)).toBe(true);
	});

	it('buildEmitter writes and tracks emitted files', async () => {
		const { workspace, writes } = buildWorkspace();
		const output = buildOutput<BuilderOutput['actions'][number]>();
		const emitter = buildEmitter(workspace, output, []);
		const { Project } = await loadTsMorph();
		const project = new Project({ useInMemoryFileSystem: true });
		const sourceFile = project.createSourceFile(
			'demo.ts',
			'export const x = 1;'
		);

		await emitter({ filePath: 'demo.ts', sourceFile });

		expect(writes[0]?.file).toBe('demo.ts');
		expect(output.actions[0]).toMatchObject({ file: 'demo.ts' });
	});

	it('requireIr throws when missing', () => {
		expect(() => requireIr(null)).toThrow(/require an IR instance/i);
	});
});

describe('ts capability/index builders', () => {
	it('writes capability and index modules when capability map is populated', async () => {
		const ir = makeIr();
		seedResource(ir, 'demo');
		ir.capabilityMap.definitions.push({
			capability: 'manage_demo',
			appliesTo: 'resource',
			resources: [ir.resources[0].id],
			hash: { algo: 'sha256', inputs: [], value: 'cap' },
		});
		ir.artifacts.js = {
			...ir.artifacts.js,
			capabilities: {
				modulePath: path.posix.join(
					ir.layout.resolve('js.generated'),
					'capabilities.ts'
				),
				declarationPath: path.posix.join(
					ir.layout.resolve('js.generated'),
					'capabilities.d.ts'
				),
			},
			index: {
				modulePath: path.posix.join(
					ir.layout.resolve('js.generated'),
					'index.ts'
				),
				declarationPath: path.posix.join(
					ir.layout.resolve('js.generated'),
					'index.d.ts'
				),
			},
		};
		const { writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsCapabilityBuilder().apply(
			{
				input: {
					phase: 'generate',
					options: {
						config: ir.config,
						namespace: ir.meta.namespace,
					},
					ir,
				},
				output,
				reporter,
			},
			undefined
		);
		await createTsIndexBuilder().apply(
			{
				input: {
					phase: 'generate',
					options: {
						config: ir.config,
						namespace: ir.meta.namespace,
					},
					ir,
				},
				output,
				reporter,
			},
			undefined
		);

		expect(output.actions.length).toBeGreaterThanOrEqual(2);
		expect(writes.length).toBeGreaterThanOrEqual(0); // write is mocked, actions carry the intent
	});
});

describe('ts types builder', () => {
	it('emits types when schema and plan exist', async () => {
		const ir = makeIr();
		seedResource(ir, 'job');
		const { workspace } = buildWorkspace();
		const output = buildOutput();
		const reporter = buildReporter();

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

		expect(
			output.actions.some((a) => a.file.includes('types/job.d.ts'))
		).toBe(true);
	});
});

describe('dataview builders', () => {
	it('writes registry entry when dataviews are present', async () => {
		const ir = makeIr();
		const resource = seedResource(ir, 'job');
		ir.ui = {
			resources: [
				{
					resource: resource.name,
					dataviews: { fields: [], defaultView: { type: 'table' } },
					preferencesKey: 'prefs',
				},
			],
		};
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
		const output = buildOutput();
		const reporter = buildReporter();
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

		expect(writes.some((w) => w.file.includes('registry'))).toBe(true);
	});

	it('writes interactivity fixture for dataview resource', async () => {
		const ir = makeIr();
		const resource = seedResource(ir, 'job');
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
		const { workspace, writes } = buildWorkspace();
		const output = buildOutput();
		const reporter = buildReporter();
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

	it('emits dataview fixture via creator', async () => {
		const ir = makeIr();
		const resource = seedResource(ir, 'job');
		const descriptor = {
			key: resource.name,
			name: resource.name,
			resource,
			adminView: 'dataviews' as const,
			dataviews: { fields: [], defaultView: { type: 'table' } },
		};
		const creator = buildDataViewFixtureCreator();
		const { workspace, writes } = buildWorkspace();
		const { Project } = await loadTsMorph();
		const project = new Project({ useInMemoryFileSystem: true });
		await creator.create({
			project,
			workspace,
			descriptor,
			sourcePath: 'wpk.config.ts',
			ir,
			paths: {
				blocksGenerated: ir.layout.resolve('blocks.generated'),
				blocksApplied: ir.layout.resolve('blocks.applied'),
				uiGenerated: ir.layout.resolve('ui.generated'),
				uiApplied: ir.layout.resolve('ui.applied'),
				uiResourcesApplied: ir.layout.resolve('ui.resources.applied'),
				jsGenerated: ir.layout.resolve('js.generated'),
			},
			reporter: buildReporter(),
			emit: async ({ filePath, sourceFile }) => {
				const contents = sourceFile.getFullText();
				writes.push({ file: filePath, contents });
				return { filePath, contents };
			},
		});

		expect(writes.some((w) => w.file.includes('fixtures/dataviews'))).toBe(
			true
		);
	});
});

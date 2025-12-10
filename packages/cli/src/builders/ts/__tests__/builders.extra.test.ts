import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';
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

function seedResource(ir: IRv1, name = 'job'): IRResource {
	const resource = makeResource({
		id: `res:${name}`,
		name,
		schemaKey: `${name}.schema`,
		storage: { mode: 'wp-option', option: name } as IRResource['storage'],
	});
	ir.resources = [resource];
	ir.schemas.push({
		id: `sch:${name}`,
		key: resource.schemaKey,
		hash: { algo: 'sha256', inputs: [], value: `schema:${name}` },
		schema: { type: 'object', properties: {} },
		sourcePath: `schemas/${name}.json`,
		provenance: 'manual',
	});
	const typesRoot = ir.layout.resolve('types.generated');
	const appGenerated = ir.layout.resolve('app.generated');
	const appApplied = ir.layout.resolve('app.applied');
	ir.artifacts.schemas[resource.schemaKey] = {
		typeDefPath: path.posix.join(typesRoot, `${name}.d.ts`),
	};
	ir.artifacts.resources[resource.id] = {
		modulePath: path.posix.join(appGenerated, name, 'resource.ts'),
		typeDefPath: path.posix.join(typesRoot, `${name}.d.ts`),
		typeSource: 'schema',
		schemaKey: resource.schemaKey,
	};
	ir.artifacts.surfaces[resource.id] = {
		resource: resource.name,
		appDir: path.posix.join(appApplied, resource.name),
		generatedAppDir: path.posix.join(appGenerated, resource.name),
		pagePath: path.posix.join(appApplied, resource.name, 'page.tsx'),
		formPath: path.posix.join(appApplied, resource.name, 'form.tsx'),
		configPath: path.posix.join(appApplied, resource.name, 'config.tsx'),
	};
	return resource;
}

describe('ts builder utilities', () => {
	it('collectResourceDescriptors maps ui resources to descriptors', () => {
		const ir = makeIr();
		const resource = seedResource(ir, 'demo');
		resource.ui = { admin: { view: 'dataviews' } };

		const descriptors = collectResourceDescriptors(ir);
		expect(descriptors).toHaveLength(1);
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
		const { workspace } = buildWorkspace();
		seedResource(ir, 'demo');
		ir.capabilityMap.definitions.push({
			id: 'cap:manage_demo',
			key: 'manage_demo',
			capability: 'manage_demo',
			appliesTo: 'resource',
			source: 'map',
		});
		const reporter = buildReporter();
		const output = buildOutput();

		await createTsCapabilityBuilder().apply(
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
		await createTsIndexBuilder().apply(
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

		expect(output.actions.length).toBe(0);
		expect(reporter.debug).toHaveBeenCalled();
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

		const typePlan = ir.artifacts.resources[ir.resources[0]!.id];
		expect(
			output.actions.some((a) => a.file === typePlan?.typeDefPath)
		).toBe(true);
	});
});

describe('dataview builders', () => {
	it('writes registry entry when dataviews are present', async () => {
		const ir = makeIr();
		const resource = seedResource(ir, 'job');
		resource.ui = { admin: { view: 'dataviews' } };

		const { workspace, writes } = buildWorkspace();
		const output = buildOutput();
		const reporter = buildReporter();
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

		expect(writes.some((w) => w.file.includes('registry'))).toBe(true);
	});

	it('writes interactivity fixture for dataview resource', async () => {
		const ir = makeIr();
		const resource = seedResource(ir, 'job');
		resource.ui = {
			admin: { view: 'dataviews', interactivity: { feature: 'custom' } },
		} as any;
		ir.artifacts.resources[resource.id] = {
			modulePath: path.posix.join(
				ir.artifacts.runtime?.runtime.generated ?? '',
				`${resource.name}/resource.ts`
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
			adminView: 'dataview' as const,
			dataviews: { view: 'dataview' },
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
				runtimeGenerated: ir.artifacts.runtime?.runtime.generated ?? '',
				runtimeApplied: ir.artifacts.runtime?.runtime.applied ?? '',
				surfacesApplied:
					ir.artifacts.surfaces[resource.id]?.appDir ??
					ir.layout.resolve('app.applied'),
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

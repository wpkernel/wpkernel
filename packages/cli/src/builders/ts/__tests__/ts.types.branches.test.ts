import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createTsTypesBuilder } from '../ts.types';
import { buildEmptyGenerationState } from '../../../apply/manifest';

const baseResource = {
	id: 'res:article',
	name: 'article',
	schemaKey: 'article',
	schemaProvenance: 'manual',
	routes: [],
	cacheKeys: { list: { segments: [], source: 'default' } } as any,
	hash: { algo: 'sha256', inputs: [], value: 'article' },
	warnings: [],
} as any;

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

describe('ts.types builder branch coverage', () => {
	it('emits post supports, custom statuses, meta arrays, and taxonomies', async () => {
		const ir = makeIr();
		const resource = {
			...baseResource,
			storage: {
				mode: 'wp-post',
				postType: 'article',
				supports: ['title', 'editor', 'excerpt'],
				meta: {
					tags: { type: 'string', single: false },
					featured: { type: 'boolean' },
				},
				taxonomies: { topics: { taxonomy: 'topics' } },
				statuses: ['draft', 'published'],
			},
			identity: { type: 'number', param: 'id' },
		};
		ir.resources = [resource];
		ir.schemas.push({
			id: 'some',
			provenance: 'auto',
			key: resource.schemaKey,
			hash: { algo: 'sha256', inputs: [], value: 'schema' },
			schema: { type: 'object', properties: {} },
			sourcePath: 'schema.json',
			// warnings: [],
			// source: 'config',
		});
		ir.artifacts.schemas[resource.schemaKey] = {
			// schemaPath: 'schema.json',
			typeDefPath: `/generated/types/${resource.name}.d.ts`,
			// typeSource: 'inferred',
		};
		ir.artifacts.resources[resource.id] = {
			modulePath: '',
			typeDefPath: `/generated/types/${resource.name}.d.ts`,
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
						origin: 'wpk.config.ts',
						sourcePath: 'wpk.config.ts',
						namespace: ir.meta.namespace,
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

		const dts = writes.find((w) =>
			w.file.endsWith('article.d.ts')
		)?.contents;
		expect(dts).toBeDefined();
		expect(dts).toContain('title');
		expect(dts).toContain('content');
		expect(dts).toContain('excerpt');
		expect(dts).toContain(
			"status: 'draft' | 'published' | 'trash' | 'auto-draft'"
		);
		expect(dts).toContain('tags?: string[]');
		expect(dts).toContain('featured?: boolean');
		expect(dts).toContain('topics?: number[]');
	});
});

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { WPKernelError } from '@wpkernel/core/error';
import type { ResourceConfig } from '@wpkernel/core/resource';
import {
	inferSchemaSetting,
	resolveSchemaPath,
	ensureFileExists,
	fileExists,
	loadJsonSchema,
	synthesiseSchema,
	createSchemaFromPostMeta,
	toTitleCase,
	resolveResourceSchema,
	createSchemaAccumulator,
} from '../shared/schema';

describe('schema helpers', () => {
	it('infers schema setting from resource configuration', () => {
		const baseResource = {
			routes: {},
			name: 'thing',
		} as unknown as ResourceConfig;
		expect(inferSchemaSetting({ ...baseResource, schema: 'manual' })).toBe(
			'manual'
		);
		expect(
			inferSchemaSetting({
				...baseResource,
				storage: { mode: 'wp-post' } as never,
			})
		).toBe('auto');
		expect(inferSchemaSetting(baseResource)).toBeUndefined();
	});

	it('resolves schema paths using absolute, relative and workspace fallbacks', async () => {
		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-schema-')
		);
		const configPath = path.join(workspaceRoot, 'wpk.config.ts');
		await fs.writeFile(configPath, '// config', 'utf8');
		const absoluteSchema = path.join(workspaceRoot, 'abs.schema.json');
		await fs.writeFile(absoluteSchema, '{}', 'utf8');

		const absResult = await resolveSchemaPath(absoluteSchema, configPath);
		expect(absResult).toBe(absoluteSchema);

		const relativeDir = path.join(workspaceRoot, 'schemas');
		await fs.mkdir(relativeDir, { recursive: true });
		const relativeSchema = path.join(relativeDir, 'todo.json');
		await fs.writeFile(relativeSchema, '{}', 'utf8');
		const relativeResult = await resolveSchemaPath(
			'./schemas/todo.json',
			configPath
		);
		expect(relativeResult).toBe(relativeSchema);

		const originalCwd = process.cwd();
		try {
			process.chdir(workspaceRoot);
			const workspaceSchema = path.join(workspaceRoot, 'workspace.json');
			await fs.writeFile(workspaceSchema, '{}', 'utf8');
			const workspaceResult = await resolveSchemaPath(
				'workspace.json',
				configPath
			);
			expect(workspaceResult).toBe(workspaceSchema);
		} finally {
			process.chdir(originalCwd);
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}

		await expect(
			resolveSchemaPath('missing.json', configPath)
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('validates file existence and propagates unexpected errors', async () => {
		const tmp = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-schema-file-')
		);
		const filePath = path.join(tmp, 'exists.json');
		await fs.writeFile(filePath, '{}', 'utf8');

		await expect(ensureFileExists(filePath)).resolves.toBeUndefined();
		await expect(
			ensureFileExists(path.join(tmp, 'missing.json'))
		).rejects.toBeInstanceOf(WPKernelError);

		const error = Object.assign(new Error('boom'), { code: 'EACCES' });
		const statSpy = jest
			.spyOn(fs, 'stat')
			.mockRejectedValue(error as NodeJS.ErrnoException);

		await expect(fileExists('/forbidden')).rejects.toThrow(error);
		statSpy.mockRestore();

		await fs.rm(tmp, { recursive: true, force: true });
	});

	it('loads JSON schema content and wraps parse errors', async () => {
		const tmp = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-schema-load-')
		);
		try {
			const schemaPath = path.join(tmp, 'schema.json');
			await fs.writeFile(schemaPath, '{"title":"ok"}', 'utf8');
			const schema = await loadJsonSchema(schemaPath, 'ok');
			expect(schema).toEqual({ title: 'ok' });

			await fs.writeFile(schemaPath, '{ invalid', 'utf8');
			await expect(
				loadJsonSchema(schemaPath, 'ok')
			).rejects.toBeInstanceOf(WPKernelError);
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	});

	it('synthesises schemas from storage metadata', () => {
		const resource = {
			name: 'job-board',
			routes: {},
			storage: {
				mode: 'wp-post',
				meta: {
					department: { type: 'string', single: true },
					tags: { type: 'string', single: false },
				},
			},
		} as unknown as ResourceConfig;

		const schema = synthesiseSchema(resource, 'example');
		expect(schema.properties).toMatchObject({
			department: { type: 'string' },
			tags: { type: 'array', items: { type: 'string' } },
		});
	});

	it('reuses synthesized schemas for auto resources and validates schema types', async () => {
		const accumulator = createSchemaAccumulator();
		const resource = {
			name: 'job',
			routes: {},
			storage: { mode: 'wp-post' },
		} as unknown as ResourceConfig;

		const first = await resolveResourceSchema(
			'job',
			resource,
			accumulator,
			'example'
		);
		const second = await resolveResourceSchema(
			'job',
			resource,
			accumulator,
			'example'
		);

		expect(first.schemaKey).toBe(second.schemaKey);
		expect(accumulator.entries).toHaveLength(1);

		expect(() =>
			resolveResourceSchema(
				'invalid',
				{
					name: 'invalid',
					routes: {},
					schema: 42,
				} as unknown as ResourceConfig,
				accumulator,
				'example'
			)
		).toThrow(WPKernelError);
	});

	it('registers inline schema objects and reuses identical definitions', async () => {
		const accumulator = createSchemaAccumulator();
		const inlineSchema = {
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			type: 'object',
			properties: {
				title: { type: 'string' },
			},
			required: ['title'],
		};

		const resource = {
			name: 'inline',
			routes: {},
			schema: inlineSchema,
		} as unknown as ResourceConfig;

		const result = await resolveResourceSchema(
			'inline',
			resource,
			accumulator,
			'example'
		);

		expect(result.schemaKey).toMatch(/^inline:/);
		expect(accumulator.entries).toHaveLength(1);
		expect(accumulator.entries[0]?.schema).toEqual(inlineSchema);

		const secondResource = {
			...resource,
			name: 'inline-copy',
			schema: JSON.parse(JSON.stringify(inlineSchema)),
		} as unknown as ResourceConfig;

		const second = await resolveResourceSchema(
			'inline-copy',
			secondResource,
			accumulator,
			'example'
		);

		expect(second.schemaKey).toBe(result.schemaKey);
		expect(accumulator.entries).toHaveLength(1);
	});

	it('creates schema fragments from post meta descriptors', () => {
		expect(
			createSchemaFromPostMeta({ type: 'string', single: true })
		).toEqual({ type: 'string' });
		expect(
			createSchemaFromPostMeta({ type: 'number', single: false })
		).toEqual({ type: 'array', items: { type: 'number' } });
	});

	it('converts identifiers to title case', () => {
		expect(toTitleCase('job-board_item')).toBe('Job Board Item');
	});
});

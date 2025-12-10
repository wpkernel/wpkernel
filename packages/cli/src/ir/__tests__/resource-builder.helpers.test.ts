import {
	normaliseQueryParams,
	recordPostTypeCollision,
	inferIdentity,
	pickRoutePlaceholder,
	createIdentityFromPlaceholder,
	prepareStorage,
	inferPostType,
	sortWarnings,
} from '../fragments/ir.resources.core';
import type { IRResource } from '../publicTypes';
import type { ResourceConfig } from '@wpkernel/core/resource';

describe('resource builder helpers', () => {
	it('normalises query params by sorting keys', () => {
		expect(normaliseQueryParams(undefined)).toBeUndefined();

		const result = normaliseQueryParams({
			b: { type: 'enum', enum: ['two'] },
			a: { type: 'enum', enum: ['one'] },
		});

		expect(result).toEqual({
			a: { type: 'enum', enum: ['one'] },
			b: { type: 'enum', enum: ['two'] },
		});
	});

	it('detects post type collisions across resources', () => {
		const registry = new Map<string, string>();
		const noWarning = recordPostTypeCollision({
			resourceKey: 'alpha',
			registry,
			storageResult: { warnings: [], storage: undefined },
		});
		expect(noWarning).toEqual([]);

		const withPostType = recordPostTypeCollision({
			resourceKey: 'alpha',
			registry,
			storageResult: {
				warnings: [],
				storage: undefined,
				postType: 'foo',
			},
		});
		expect(withPostType).toEqual([]);

		const collision = recordPostTypeCollision({
			resourceKey: 'beta',
			registry,
			storageResult: {
				warnings: [],
				storage: undefined,
				postType: 'foo',
			},
		});
		expect(collision).toHaveLength(1);

		const secondRegistry = new Map<string, string>([['foo', 'alpha']]);
		const explicitCollision = recordPostTypeCollision({
			resourceKey: 'gamma',
			registry: secondRegistry,
			storageResult: {
				warnings: [],
				storage: undefined,
				explicitPostType: 'foo',
			},
		});
		expect(explicitCollision[0]?.message).toContain('Post type "foo"');
	});

	it('infers identity metadata from route placeholders', () => {
		const routes = [
			{
				path: '/things/:id',
				method: 'GET',
				capability: undefined,
				transport: 'local',
			},
		] as unknown as IRResource['routes'];
		const inferred = inferIdentity({
			resourceKey: 'thing',
			provided: undefined,
			routes,
		});
		expect(inferred.identity).toEqual({ type: 'number', param: 'id' });
		expect(inferred.warning?.code).toBe('identity.inference.applied');

		const unsupported = inferIdentity({
			resourceKey: 'thing',
			provided: undefined,
			routes: [
				{
					path: '/things/:custom',
					method: 'GET',
					capability: undefined,
					transport: 'local',
				},
			] as unknown as IRResource['routes'],
		});
		expect(unsupported.identity).toBeUndefined();
		expect(unsupported.warning?.code).toBe(
			'identity.inference.unsupported'
		);

		const missing = inferIdentity({
			resourceKey: 'thing',
			provided: undefined,
			routes: [] as unknown as IRResource['routes'],
		});
		expect(missing.identity).toBeUndefined();
		expect(missing.warning?.code).toBe('identity.inference.missing');

		const provided = inferIdentity({
			resourceKey: 'thing',
			provided: { type: 'string', param: 'slug' },
			routes,
		});
		expect(provided.identity).toEqual({ type: 'string', param: 'slug' });
	});

	it('chooses placeholders based on priority and frequency', () => {
		const routes = [
			{
				path: '/one/:slug',
				method: 'GET',
				capability: undefined,
				transport: 'local',
			},
			{
				path: '/two/:uuid',
				method: 'GET',
				capability: undefined,
				transport: 'local',
			},
		] as unknown as IRResource['routes'];
		expect(pickRoutePlaceholder(routes)).toBe('slug');

		const fallback = pickRoutePlaceholder([
			{
				path: '/fallback/:custom',
				method: 'GET',
				capability: undefined,
				transport: 'local',
			},
		] as unknown as IRResource['routes']);
		expect(fallback).toBe('custom');

		const uuidOnly = pickRoutePlaceholder([
			{
				path: '/items/:uuid',
				method: 'GET',
				capability: undefined,
				transport: 'local',
			},
		] as unknown as IRResource['routes']);
		expect(uuidOnly).toBe('uuid');
	});

	it('creates identity metadata from placeholders', () => {
		expect(createIdentityFromPlaceholder('id')).toEqual({
			type: 'number',
			param: 'id',
		});
		expect(createIdentityFromPlaceholder('slug')).toEqual({
			type: 'string',
			param: 'slug',
		});
		expect(createIdentityFromPlaceholder('uuid')).toEqual({
			type: 'string',
			param: 'uuid',
		});
		expect(createIdentityFromPlaceholder('unknown')).toBeUndefined();
	});

	it('prepares storage metadata for different modes', () => {
		const noStorage = prepareStorage({
			resourceKey: 'thing',
			storage: undefined,
			sanitizedNamespace: 'ns',
		});
		expect(noStorage.storage).toBeUndefined();

		const optionStorage = prepareStorage({
			resourceKey: 'thing',
			storage: { mode: 'wp-option', option: 'foo' } as never,
			sanitizedNamespace: 'ns',
		});
		expect(optionStorage.storage).toEqual({
			mode: 'wp-option',
			option: 'foo',
		});

		const explicitPost = prepareStorage({
			resourceKey: 'thing',
			storage: { mode: 'wp-post', postType: 'custom' } as never,
			sanitizedNamespace: 'ns',
		});
		expect(explicitPost.storage).toMatchObject({ postType: 'custom' });
		expect(explicitPost.explicitPostType).toBe('custom');

		const inferredPost = prepareStorage({
			resourceKey: 'thing',
			storage: { mode: 'wp-post' } as never,
			sanitizedNamespace: 'Namespace Value',
		});
		const inferredPostStorage = inferredPost.storage as Extract<
			ResourceConfig['storage'],
			{ mode: 'wp-post' }
		>;
		expect(inferredPostStorage.postType).toBe(
			'namespace_value_thing'.slice(0, 20)
		);
	});

	it('infers post types and truncates long identifiers', () => {
		const result = inferPostType({
			resourceKey: 'VeryLongResourceNameExceedingLimits',
			sanitizedNamespace: 'ExampleNamespace',
		});
		expect(result.postType).toHaveLength(20);
		expect(result.warnings[0]?.code).toBe(
			'storage.wpPost.postType.truncated'
		);

		const fallback = inferPostType({
			resourceKey: '   ',
			sanitizedNamespace: '   ',
		});
		expect(fallback.postType).toBe('wpk_resource');
	});

	it('sorts warnings deterministically', () => {
		const warnings = sortWarnings([
			{ code: 'b', message: 'two' },
			{ code: 'a', message: 'three' },
			{ code: 'a', message: undefined },
			{ code: 'a', message: 'one' },
		] as never);

		expect(warnings.map((w) => `${w.code}:${w.message ?? ''}`)).toEqual([
			'a:',
			'a:one',
			'a:three',
			'b:two',
		]);
	});
});

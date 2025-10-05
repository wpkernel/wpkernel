/**
 * Tests for defineResource and config validation
 */

import { defineResource } from '../define';
import type { CacheKeyFn } from '../../resource';

interface Thing {
	id: number;
	title: string;
	description: string;
}

interface ThingQuery {
	q?: string;
	page?: number;
}

describe('defineResource - resource object structure', () => {
	describe('resource object structure', () => {
		it('should include resource name', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			expect(resource.name).toBe('thing');
		});

		it('should generate correct store key', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			expect(resource.storeKey).toBe('wpk/thing');
		});

		it('should preserve routes', () => {
			const routes = {
				list: { path: '/my-plugin/v1/things', method: 'GET' as const },
				get: {
					path: '/my-plugin/v1/things/:id',
					method: 'GET' as const,
				},
			};

			const resource = defineResource({
				name: 'thing',
				routes,
			});

			expect(resource.routes).toEqual(routes);
		});

		it('should generate default cache keys when not provided', () => {
			const resource = defineResource({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
			});

			expect(resource.cacheKeys.list).toBeDefined();
			expect(resource.cacheKeys.get).toBeDefined();
			expect(typeof resource.cacheKeys.list).toBe('function');
			expect(typeof resource.cacheKeys.get).toBe('function');
		});

		it('should generate all default cache keys for CRUD operations', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
					create: { path: '/my-plugin/v1/things', method: 'POST' },
					update: { path: '/my-plugin/v1/things/:id', method: 'PUT' },
					remove: {
						path: '/my-plugin/v1/things/:id',
						method: 'DELETE',
					},
				},
			});

			// Test default cache key generators
			expect(resource.cacheKeys.list({ q: 'test' })).toEqual([
				'thing',
				'list',
				JSON.stringify({ q: 'test' }),
			]);

			expect(resource.cacheKeys.get(123)).toEqual(['thing', 'get', 123]);

			expect(
				resource.cacheKeys.create({
					title: 'New thing',
					description: 'Test',
				})
			).toEqual([
				'thing',
				'create',
				JSON.stringify({ title: 'New thing', description: 'Test' }),
			]);

			expect(resource.cacheKeys.update(456)).toEqual([
				'thing',
				'update',
				456,
			]);

			expect(resource.cacheKeys.remove(789)).toEqual([
				'thing',
				'remove',
				789,
			]);
		});

		it('should use custom cache keys when provided', () => {
			const customCacheKeys: {
				list: CacheKeyFn<ThingQuery>;
				get: CacheKeyFn<string | number>;
			} = {
				list: (q?: ThingQuery) => ['custom', 'list', q?.q],
				get: (id?: string | number) => ['custom', 'get', id],
			};

			const resource = defineResource<Thing, ThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
				cacheKeys: customCacheKeys as never,
			});

			expect(resource.cacheKeys.list({ q: 'search' })).toEqual([
				'custom',
				'list',
				'search',
			]);
			expect(resource.cacheKeys.get(123)).toEqual(['custom', 'get', 123]);
		});

		it('should merge custom and default cache keys', () => {
			const resource = defineResource<Thing, ThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
					get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				},
				cacheKeys: {
					list: ((q?: ThingQuery) => [
						'custom',
						'list',
						q?.q,
					]) as CacheKeyFn<ThingQuery>,
					// get uses default
				} as Partial<Record<string, CacheKeyFn<unknown>>>,
			});

			// Custom list cache key
			expect(resource.cacheKeys.list({ q: 'search' })).toEqual([
				'custom',
				'list',
				'search',
			]);

			// Default get cache key
			const getKey = resource.cacheKeys.get(123);
			expect(getKey[0]).toBe('thing');
			expect(getKey[1]).toBe('get');
			expect(getKey[2]).toBe(123);
		});
	});
});

describe('utils - getWPData', () => {
	beforeEach(() => {
		// Clear any existing wp.data
		// window.wp is reset by setup-jest.ts afterEach
	});

	it('should return wp.data when available', () => {
		const mockWPData = {
			// Core store methods
			select: jest.fn(),
			dispatch: jest.fn(),
			subscribe: jest.fn(),
			createReduxStore: jest.fn(),
			register: jest.fn(),

			// Higher-order components
			withSelect: jest.fn(),
			withDispatch: jest.fn(),
			withRegistry: jest.fn(),

			// Hooks
			useSelect: jest.fn(),
			useDispatch: jest.fn(),
			useRegistry: jest.fn(),
		} as any; // Use 'as any' to satisfy the complex @wordpress/data type requirements

		window.wp = {
			data: mockWPData,
		};

		const result = getWPData();
		expect(result).toBe(mockWPData);
	});

	it('should return undefined when wp is not available', () => {
		// Set to undefined to test unavailability (avoiding delete per lint rules)
		(window as Window & { wp?: unknown }).wp = undefined;

		const result = getWPData();
		expect(result).toBeUndefined();
	});

	it('should return undefined when wp.data is not available', () => {
		(window as Window & { wp?: unknown }).wp = {};

		const result = getWPData();
		expect(result).toBeUndefined();
	});

	it('should handle partial wp object', () => {
		(
			window as unknown as Window & {
				wp: { hooks: Record<string, unknown> };
			}
		).wp = {
			hooks: {} as any, // Mock hooks object for testing
			// data is missing
		};

		const result = getWPData();
		expect(result).toBeUndefined();
	});
});

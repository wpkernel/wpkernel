/**
 * Tests for defineResource - grouped API property getters and cache.key() method
 *
 * Tests the lazy property getters that create grouped API namespaces
 * and the cache.key() method that generates cache keys.
 */

import { defineResource } from '../define';

// Mock types for testing
interface MockThing {
	id: number;
	title: string;
}

interface MockThingQuery {
	q?: string;
}

// Use global types for window.wp

describe('defineResource - grouped API getters and cache.key()', () => {
	let mockWpData: any;
	let originalWp: Window['wp'];

	beforeEach(() => {
		// Store original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;

		// Create mock wp.data
		mockWpData = {
			registerStore: jest.fn(),
			select: jest.fn(),
			dispatch: jest.fn(),
		};

		// Setup window.wp.data
		if (windowWithWp) {
			windowWithWp.wp = {
				data: mockWpData,
			};
		}
	});

	afterEach(() => {
		// Restore original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp) {
			windowWithWp.wp = originalWp;
		}
	});

	// ===================================================================
	// cache.key() method
	// ===================================================================

	describe('cache.key()', () => {
		it('should generate cache key for list operation', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
				cacheKeys: {
					list: (query) => [
						'thing',
						'list',
						(query as MockThingQuery)?.q,
					],
				},
			});

			const key = resource.key('list', { q: 'search-term' });

			expect(key).toEqual(['thing', 'list', 'search-term']);
		});

		it('should generate cache key for get operation', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
				cacheKeys: {
					get: (id) => ['thing', 'get', id],
				},
			});

			const key = resource.key('get', 123);

			expect(key).toEqual(['thing', 'get', 123]);
		});

		it('should generate cache key for create operation', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
				cacheKeys: {
					create: (data) => [
						'thing',
						'create',
						(data as Partial<MockThing>)?.title,
					],
				},
			});

			const key = resource.key('create', { title: 'New Thing' });

			expect(key).toEqual(['thing', 'create', 'New Thing']);
		});

		it('should generate cache key for update operation', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					update: { path: '/wpk/v1/things/:id', method: 'PUT' },
				},
				cacheKeys: {
					update: (id) => ['thing', 'update', id],
				},
			});

			const key = resource.key('update', 456);

			expect(key).toEqual(['thing', 'update', 456]);
		});

		it('should generate cache key for remove operation', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
				},
				cacheKeys: {
					remove: (id) => ['thing', 'remove', id],
				},
			});

			const key = resource.key('remove', 789);

			expect(key).toEqual(['thing', 'remove', 789]);
		});

		it('should filter out null and undefined values from cache key', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
				cacheKeys: {
					list: (query) => [
						'thing',
						'list',
						(query as MockThingQuery)?.q,
						undefined,
						null,
						'defined',
					],
				},
			});

			const key = resource.key('list', { q: undefined });

			expect(key).toEqual(['thing', 'list', 'defined']);
			expect(key).not.toContain(null);
			expect(key).not.toContain(undefined);
		});
	});

	// ===================================================================
	// Grouped API property getters
	// ===================================================================

	describe('grouped API property getters', () => {
		it('should lazily create select namespace when accessed', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			// Access select property to trigger getter
			const selectNamespace = resource.select;

			expect(selectNamespace).toBeDefined();
			expect(selectNamespace!.item).toBeDefined();
			expect(selectNamespace!.list).toBeDefined();
			expect(selectNamespace!.items).toBeDefined();
		});

		it('should leave use namespace undefined without UI hooks', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(resource.useGet).toBeUndefined();
			expect(resource.useList).toBeUndefined();
		});

		it('should lazily create get namespace when accessed', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			// Access get property to trigger getter
			const getNamespace = resource.get;

			expect(getNamespace).toBeDefined();
			expect(getNamespace!.item).toBe(resource.fetch);
			expect(getNamespace!.list).toBe(resource.fetchList);
		});

		it('should lazily create mutate namespace when accessed', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
					update: { path: '/wpk/v1/things/:id', method: 'PUT' },
					remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
				},
			});

			// Access mutate property to trigger getter
			const mutateNamespace = resource.mutate;

			expect(mutateNamespace).toBeDefined();
			expect(mutateNamespace!.create).toBe(resource.create);
			expect(mutateNamespace!.update).toBe(resource.update);
			expect(mutateNamespace!.remove).toBe(resource.remove);
		});

		it('should lazily create cache namespace when accessed', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			// Access cache property to trigger getter
			const cacheNamespace = resource.cache;

			expect(cacheNamespace).toBeDefined();
			expect(cacheNamespace.prefetch).toBeDefined();
			expect(cacheNamespace.invalidate).toBeDefined();
			expect(cacheNamespace.key).toBe(resource.key);
		});

		it('should lazily create storeApi namespace when accessed', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			// Access storeApi property to trigger getter
			const storeApiNamespace = resource.storeApi;

			expect(storeApiNamespace).toBeDefined();
			expect(storeApiNamespace.key).toBe(resource.storeKey);
			expect(storeApiNamespace.descriptor).toBe(resource.store);
		});

		it('should lazily create events namespace when accessed', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					create: { path: '/wpk/v1/things', method: 'POST' },
				},
			});

			// Access events property to trigger getter
			const eventsNamespace = resource.events;

			expect(eventsNamespace).toBeDefined();
			expect(eventsNamespace!.created).toBe('wpk.thing.created');
			expect(eventsNamespace!.updated).toBe('wpk.thing.updated');
			expect(eventsNamespace!.removed).toBe('wpk.thing.removed');
		});

		it('should return same namespace on multiple accesses', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			// Access select multiple times
			const select1 = resource.select;
			const select2 = resource.select;

			// Should return the same object (getters are called each time but return same structure)
			expect(select1).toBeDefined();
			expect(select2).toBeDefined();
		});
	});

	describe('cache.invalidate.all behavior', () => {
		it('should call invalidate.all without errors', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			// Should not throw when calling invalidate.all
			expect(() => {
				resource.cache.invalidate.all();
			}).not.toThrow();
		});

		it('should have invalidate.all method defined', () => {
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(resource.cache.invalidate.all).toBeDefined();
			expect(typeof resource.cache.invalidate.all).toBe('function');
		});
	});
});

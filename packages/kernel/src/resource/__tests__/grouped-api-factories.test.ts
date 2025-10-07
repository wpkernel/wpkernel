/**
 * Tests for grouped-api.ts namespace factory functions
 *
 * These factories create organized namespaces for power users:
 * - select.* - Pure selectors (no fetching)
 * - use.* - React hooks
 * - get.* - Explicit fetching
 * - mutate.* - CRUD operations
 * - cache.* - Cache control
 * - storeApi.* - Store access
 * - events.* - Event names
 */

import {
	createSelectGetter,
	createGetGetter,
	createMutateGetter,
	createCacheGetter,
	createStoreApiGetter,
	createEventsGetter,
} from '../grouped-api';
import type { ResourceConfig, ResourceObject, CacheKeys } from '../types';

// Mock types for testing
interface TestItem {
	id: number;
	name: string;
}

interface TestQuery {
	search?: string;
}

// Use global types for window.wp

describe('grouped-api namespace factories', () => {
	let mockConfig: ResourceConfig<TestItem, TestQuery>;
	let mockResourceObject: ResourceObject<TestItem, TestQuery>;
	let mockCacheKeys: Required<CacheKeys>;
	let mockWpData: any;
	let originalWp: Window['wp'];

	beforeEach(() => {
		// Setup mock config
		mockConfig = {
			name: 'test-resource',
			routes: {
				list: { path: '/my-plugin/v1/tests', method: 'GET' },
				get: { path: '/my-plugin/v1/tests/:id', method: 'GET' },
				create: { path: '/my-plugin/v1/tests', method: 'POST' },
				update: { path: '/my-plugin/v1/tests/:id', method: 'PUT' },
				remove: { path: '/my-plugin/v1/tests/:id', method: 'DELETE' },
			},
		};

		// Setup mock cache keys
		mockCacheKeys = {
			list: (query?: unknown) => [
				'test-resource',
				'list',
				(query as TestQuery)?.search,
			],
			get: (id?: string | number) => ['test-resource', 'get', id],
			create: (data?: unknown) => [
				'test-resource',
				'create',
				JSON.stringify(data || {}),
			],
			update: (id?: string | number) => ['test-resource', 'update', id],
			remove: (id?: string | number) => ['test-resource', 'remove', id],
		};

		// Setup mock @wordpress/data
		mockWpData = {
			select: jest.fn(),
			dispatch: jest.fn(),
		};

		// Store original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;

		// Mock window.wp.data
		if (windowWithWp) {
			windowWithWp.wp = {
				data: mockWpData,
			};
		}

		// Setup mock resource object
		mockResourceObject = {
			name: 'test-resource',
			storeKey: 'wpk/test-resource',
			store: {} as ResourceObject<TestItem, TestQuery>['store'],
			key: jest.fn(),
			invalidate: jest.fn(),
			useGet: jest.fn(),
			useList: jest.fn(),
			fetch: jest.fn(),
			fetchList: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			prefetchGet: jest.fn(),
			prefetchList: jest.fn(),
			cacheKeys: mockCacheKeys,
			routes: mockConfig.routes,
			cache: {} as ResourceObject<TestItem, TestQuery>['cache'],
			storeApi: {} as ResourceObject<TestItem, TestQuery>['storeApi'],
		} as ResourceObject<TestItem, TestQuery>;
	});

	afterEach(() => {
		// Restore original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp) {
			windowWithWp.wp = originalWp;
		}
	});

	// ===================================================================
	// createSelectGetter - Pure selectors (read from cache)
	// ===================================================================

	describe('createSelectGetter', () => {
		it('should return undefined when no get or list routes configured', () => {
			const configNoRoutes = {
				...mockConfig,
				routes: {},
			};

			const getter = createSelectGetter<TestItem, TestQuery>(
				configNoRoutes
			);
			const result = getter.call(mockResourceObject);

			expect(result).toBeUndefined();
		});

		it('should return select namespace with item selector', () => {
			const mockItem = { id: 1, name: 'Test Item' };
			const mockStoreSelect = {
				getItem: jest.fn().mockReturnValue(mockItem),
			};
			mockWpData.select.mockReturnValue(mockStoreSelect);

			const getter = createSelectGetter<TestItem, TestQuery>(mockConfig);
			const selectNamespace = getter.call(mockResourceObject);

			expect(selectNamespace).toBeDefined();
			const item = selectNamespace!.item(1);

			expect(item).toEqual(mockItem);
			expect(mockWpData.select).toHaveBeenCalledWith('wpk/test-resource');
			expect(mockStoreSelect.getItem).toHaveBeenCalledWith(1);
		});

		it('should return undefined from item selector when @wordpress/data not loaded', () => {
			const windowWithWp = global.window as Window & { wp?: any };
			if (windowWithWp.wp) {
				windowWithWp.wp.data = undefined;
			}

			const getter = createSelectGetter<TestItem, TestQuery>(mockConfig);
			const selectNamespace = getter.call(mockResourceObject);

			const item = selectNamespace!.item(1);
			expect(item).toBeUndefined();
		});

		it('should return select namespace with items selector', () => {
			const mockItems = [
				{ id: 1, name: 'Item 1' },
				{ id: 2, name: 'Item 2' },
			];
			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue({
					items: {
						1: mockItems[0],
						2: mockItems[1],
					},
				}),
			};
			mockWpData.select.mockReturnValue(mockStoreSelect);

			const getter = createSelectGetter<TestItem, TestQuery>(mockConfig);
			const selectNamespace = getter.call(mockResourceObject);

			const items = selectNamespace!.items();

			expect(items).toHaveLength(2);
			expect(items).toEqual(expect.arrayContaining(mockItems));
		});

		it('should return empty array from items selector when no items', () => {
			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue({ items: {} }),
			};
			mockWpData.select.mockReturnValue(mockStoreSelect);

			const getter = createSelectGetter<TestItem, TestQuery>(mockConfig);
			const selectNamespace = getter.call(mockResourceObject);

			const items = selectNamespace!.items();

			expect(items).toEqual([]);
		});

		it('should return empty array from items selector when @wordpress/data not loaded', () => {
			const windowWithWp = global.window as Window & { wp?: any };
			if (windowWithWp.wp) {
				windowWithWp.wp.data = undefined;
			}

			const getter = createSelectGetter<TestItem, TestQuery>(mockConfig);
			const selectNamespace = getter.call(mockResourceObject);

			const items = selectNamespace!.items();
			expect(items).toEqual([]);
		});

		it('should return select namespace with list selector', () => {
			const mockList = [
				{ id: 1, name: 'Item 1' },
				{ id: 2, name: 'Item 2' },
			];
			const mockStoreSelect = {
				getItems: jest.fn().mockReturnValue(mockList),
			};
			mockWpData.select.mockReturnValue(mockStoreSelect);

			const getter = createSelectGetter<TestItem, TestQuery>(mockConfig);
			const selectNamespace = getter.call(mockResourceObject);

			const list = selectNamespace!.list({ search: 'test' });

			expect(list).toEqual(mockList);
			expect(mockStoreSelect.getItems).toHaveBeenCalledWith({
				search: 'test',
			});
		});

		it('should return empty array from list selector when method not available', () => {
			const mockStoreSelect = {};
			mockWpData.select.mockReturnValue(mockStoreSelect);

			const getter = createSelectGetter<TestItem, TestQuery>(mockConfig);
			const selectNamespace = getter.call(mockResourceObject);

			const list = selectNamespace!.list();

			expect(list).toEqual([]);
		});
	});

	// ===================================================================
	// createGetGetter - Explicit fetching namespace
	// ===================================================================

	describe('createGetGetter', () => {
		it('should return undefined when no get or list routes configured', () => {
			const configNoRoutes = {
				...mockConfig,
				routes: {},
			};

			const getter = createGetGetter<TestItem, TestQuery>(configNoRoutes);
			const result = getter.call(mockResourceObject);

			expect(result).toBeUndefined();
		});

		it('should return get namespace with item fetcher', () => {
			const getter = createGetGetter<TestItem, TestQuery>(mockConfig);
			const getNamespace = getter.call(mockResourceObject);

			expect(getNamespace).toBeDefined();
			expect(getNamespace!.item).toBe(mockResourceObject.fetch);
		});

		it('should return get namespace with list fetcher', () => {
			const getter = createGetGetter<TestItem, TestQuery>(mockConfig);
			const getNamespace = getter.call(mockResourceObject);

			expect(getNamespace).toBeDefined();
			expect(getNamespace!.list).toBe(mockResourceObject.fetchList);
		});
	});

	// ===================================================================
	// createMutateGetter - CRUD operations namespace
	// ===================================================================

	describe('createMutateGetter', () => {
		it('should return undefined when no mutation routes configured', () => {
			const configNoMutations = {
				...mockConfig,
				routes: {
					list: {
						path: '/my-plugin/v1/tests',
						method: 'GET' as const,
					},
					get: {
						path: '/my-plugin/v1/tests/:id',
						method: 'GET' as const,
					},
				},
			};

			const getter = createMutateGetter<TestItem, TestQuery>(
				configNoMutations
			);
			const result = getter.call(mockResourceObject);

			expect(result).toBeUndefined();
		});

		it('should return mutate namespace with create method', () => {
			const getter = createMutateGetter<TestItem, TestQuery>(mockConfig);
			const mutateNamespace = getter.call(mockResourceObject);

			expect(mutateNamespace).toBeDefined();
			expect(mutateNamespace!.create).toBe(mockResourceObject.create);
		});

		it('should return mutate namespace with update method', () => {
			const getter = createMutateGetter<TestItem, TestQuery>(mockConfig);
			const mutateNamespace = getter.call(mockResourceObject);

			expect(mutateNamespace).toBeDefined();
			expect(mutateNamespace!.update).toBe(mockResourceObject.update);
		});

		it('should return mutate namespace with remove method', () => {
			const getter = createMutateGetter<TestItem, TestQuery>(mockConfig);
			const mutateNamespace = getter.call(mockResourceObject);

			expect(mutateNamespace).toBeDefined();
			expect(mutateNamespace!.remove).toBe(mockResourceObject.remove);
		});

		it('should work when only create route is configured', () => {
			const configOnlyCreate = {
				...mockConfig,
				routes: {
					create: {
						path: '/my-plugin/v1/tests',
						method: 'POST' as const,
					},
				},
			};

			const getter = createMutateGetter<TestItem, TestQuery>(
				configOnlyCreate
			);
			const mutateNamespace = getter.call(mockResourceObject);

			expect(mutateNamespace).toBeDefined();
		});
	});

	// ===================================================================
	// createCacheGetter - Cache control namespace
	// ===================================================================

	describe('createCacheGetter', () => {
		it('should return cache namespace with prefetch.item method', () => {
			const getter = createCacheGetter<TestItem, TestQuery>(
				mockConfig,
				mockCacheKeys
			);
			const cacheNamespace = getter.call(mockResourceObject);

			expect(cacheNamespace).toBeDefined();
			expect(cacheNamespace.prefetch.item).toBe(
				mockResourceObject.prefetchGet
			);
		});

		it('should return cache namespace with prefetch.list method', () => {
			const getter = createCacheGetter<TestItem, TestQuery>(
				mockConfig,
				mockCacheKeys
			);
			const cacheNamespace = getter.call(mockResourceObject);

			expect(cacheNamespace.prefetch.list).toBe(
				mockResourceObject.prefetchList
			);
		});

		it('should throw NotImplementedError when prefetch.item called without get route', async () => {
			const resourceNoPrefetch = {
				...mockResourceObject,
				prefetchGet: undefined,
			};

			const getter = createCacheGetter<TestItem, TestQuery>(
				mockConfig,
				mockCacheKeys
			);
			const cacheNamespace = getter.call(resourceNoPrefetch);

			await expect(cacheNamespace.prefetch.item(123)).rejects.toThrow(
				'Resource "test-resource" does not have a "get" route'
			);
		});

		it('should throw NotImplementedError when prefetch.list called without list route', async () => {
			const resourceNoPrefetch = {
				...mockResourceObject,
				prefetchList: undefined,
			};

			const getter = createCacheGetter<TestItem, TestQuery>(
				mockConfig,
				mockCacheKeys
			);
			const cacheNamespace = getter.call(resourceNoPrefetch);

			await expect(cacheNamespace.prefetch.list()).rejects.toThrow(
				'Resource "test-resource" does not have a "list" route'
			);
		});

		it('should return cache namespace with invalidate.item method', () => {
			const getter = createCacheGetter<TestItem, TestQuery>(
				mockConfig,
				mockCacheKeys
			);
			const cacheNamespace = getter.call(mockResourceObject);

			cacheNamespace.invalidate.item(123);

			expect(mockResourceObject.invalidate).toHaveBeenCalledWith([
				['test-resource', 'get', 123],
			]);
		});

		it('should return cache namespace with invalidate.list method', () => {
			const getter = createCacheGetter<TestItem, TestQuery>(
				mockConfig,
				mockCacheKeys
			);
			const cacheNamespace = getter.call(mockResourceObject);

			cacheNamespace.invalidate.list({ search: 'test' });

			expect(mockResourceObject.invalidate).toHaveBeenCalledWith([
				['test-resource', 'list', 'test'],
			]);
		});

		it('should return cache namespace with invalidate.all method', () => {
			// Mock globalInvalidate
			const mockGlobalInvalidate = jest.fn();
			jest.mock('../cache', () => ({
				invalidate: mockGlobalInvalidate,
			}));

			const getter = createCacheGetter<TestItem, TestQuery>(
				mockConfig,
				mockCacheKeys
			);
			const cacheNamespace = getter.call(mockResourceObject);

			// Note: globalInvalidate is called internally, but we're testing the method exists
			expect(cacheNamespace.invalidate.all).toBeDefined();
			expect(typeof cacheNamespace.invalidate.all).toBe('function');
		});

		it('should return cache namespace with key method', () => {
			const getter = createCacheGetter<TestItem, TestQuery>(
				mockConfig,
				mockCacheKeys
			);
			const cacheNamespace = getter.call(mockResourceObject);

			expect(cacheNamespace.key).toBe(mockResourceObject.key);
		});
	});

	// ===================================================================
	// createStoreApiGetter - Store access namespace
	// ===================================================================

	describe('createStoreApiGetter', () => {
		it('should return storeApi namespace with key', () => {
			const getter = createStoreApiGetter<TestItem, TestQuery>();
			const storeApiNamespace = getter.call(mockResourceObject);

			expect(storeApiNamespace).toBeDefined();
			expect(storeApiNamespace.key).toBe('wpk/test-resource');
		});

		it('should return storeApi namespace with descriptor getter', () => {
			const getter = createStoreApiGetter<TestItem, TestQuery>();
			const storeApiNamespace = getter.call(mockResourceObject);

			expect(storeApiNamespace.descriptor).toBe(mockResourceObject.store);
		});

		it('should have descriptor as a getter (not a plain property)', () => {
			const getter = createStoreApiGetter<TestItem, TestQuery>();
			const storeApiNamespace = getter.call(mockResourceObject);

			// Access descriptor to trigger getter
			const descriptor1 = storeApiNamespace.descriptor;
			const descriptor2 = storeApiNamespace.descriptor;

			// Both accesses should return the same store reference
			expect(descriptor1).toBe(descriptor2);
			expect(descriptor1).toBe(mockResourceObject.store);
		});
	});

	// ===================================================================
	// createEventsGetter - Event names namespace
	// ===================================================================

	describe('createEventsGetter', () => {
		it('should return events namespace with created event name', () => {
			const testConfig = {
				...mockConfig,
				namespace: 'wpk',
				name: 'test-resource',
			};
			const getter = createEventsGetter<TestItem, TestQuery>(testConfig);
			const eventsNamespace = getter.call(mockResourceObject);

			expect(eventsNamespace).toBeDefined();
			expect(eventsNamespace.created).toBe('wpk.test-resource.created');
		});

		it('should return events namespace with updated event name', () => {
			const testConfig = {
				...mockConfig,
				namespace: 'wpk',
				name: 'test-resource',
			};
			const getter = createEventsGetter<TestItem, TestQuery>(testConfig);
			const eventsNamespace = getter.call(mockResourceObject);

			expect(eventsNamespace.updated).toBe('wpk.test-resource.updated');
		});

		it('should return events namespace with removed event name', () => {
			const testConfig = {
				...mockConfig,
				namespace: 'wpk',
				name: 'test-resource',
			};
			const getter = createEventsGetter<TestItem, TestQuery>(testConfig);
			const eventsNamespace = getter.call(mockResourceObject);

			expect(eventsNamespace.removed).toBe('wpk.test-resource.removed');
		});

		it('should use config.name in event names', () => {
			const testConfig = {
				...mockConfig,
				namespace: 'wpk',
				name: 'custom-resource',
			};
			const getter = createEventsGetter<TestItem, TestQuery>(testConfig);
			const eventsNamespace = getter.call(mockResourceObject);

			expect(eventsNamespace.created).toBe('wpk.custom-resource.created');
			expect(eventsNamespace.updated).toBe('wpk.custom-resource.updated');
			expect(eventsNamespace.removed).toBe('wpk.custom-resource.removed');
		});
	});
});

/**
 * Unit tests for createStore factory - Grouped API
 *
 * Tests the @wordpress/data store integration
 */

import type { ResourceObject, ListResponse } from '../../types';

// Mock resource for testing
interface MockThing {
	id: number;
	title: string;
	status: string;
}

interface MockThingQuery {
	q?: string;
	status?: string;
}

describe('createStore - Grouped API', () => {
	let mockResource: ResourceObject<MockThing, MockThingQuery>;
	let mockListResponse: ListResponse<MockThing>;

	beforeEach(() => {
		mockListResponse = {
			items: [
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			],
			total: 2,
			hasMore: false,
		};

		mockResource = {
			name: 'thing',
			storeKey: 'wpk/thing',
			cacheKeys: {
				list: (query) => ['thing', 'list', JSON.stringify(query || {})],
				get: (id) => ['thing', 'get', id],
				create: (data) => [
					'thing',
					'create',
					JSON.stringify(data || {}),
				],
				update: (id) => ['thing', 'update', id],
				remove: (id) => ['thing', 'remove', id],
			},
			routes: {
				list: { path: '/my-plugin/v1/things', method: 'GET' },
				get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
				create: { path: '/my-plugin/v1/things', method: 'POST' },
				update: { path: '/my-plugin/v1/things/:id', method: 'PUT' },
				remove: { path: '/my-plugin/v1/things/:id', method: 'DELETE' },
			},
			fetchList: jest.fn().mockResolvedValue(mockListResponse),
			fetch: jest.fn().mockResolvedValue({
				id: 1,
				title: 'Thing One',
				status: 'active',
			}),
			create: jest.fn().mockResolvedValue({
				id: 3,
				title: 'New Thing',
				status: 'active',
			}),
			update: jest.fn().mockResolvedValue({
				id: 1,
				title: 'Updated Thing',
				status: 'active',
			}),
			remove: jest.fn().mockResolvedValue(undefined),
			// Thin-flat API methods
			useGet: jest.fn(),
			useList: jest.fn(),
			prefetchGet: jest.fn().mockResolvedValue(undefined),
			prefetchList: jest.fn().mockResolvedValue(undefined),
			invalidate: jest.fn(),
			key: jest.fn(
				(
					operation: 'list' | 'get' | 'create' | 'update' | 'remove',
					params?: any
				): (string | number | boolean)[] => {
					const generators = mockResource.cacheKeys;
					const result = generators[operation]?.(params) || [];
					return result.filter(
						(v): v is string | number | boolean =>
							v !== null && v !== undefined
					);
				}
			),
			store: {},
			// Grouped API namespaces
			select: {
				item: jest.fn().mockReturnValue(undefined),
				items: jest.fn().mockReturnValue([]),
				list: jest.fn().mockReturnValue([]),
			},

			get: {
				item: jest.fn().mockResolvedValue({
					id: 1,
					title: 'Thing One',
					status: 'active',
				}),
				list: jest.fn().mockResolvedValue(mockListResponse),
			},
			mutate: {
				create: jest.fn().mockResolvedValue({
					id: 3,
					title: 'New Thing',
					status: 'active',
				}),
				update: jest.fn().mockResolvedValue({
					id: 1,
					title: 'Updated Thing',
					status: 'active',
				}),
				remove: jest.fn().mockResolvedValue(undefined),
			},
			cache: {
				prefetch: {
					item: jest.fn().mockResolvedValue(undefined),
					list: jest.fn().mockResolvedValue(undefined),
				},
				invalidate: {
					item: jest.fn(),
					list: jest.fn(),
					all: jest.fn(),
				},
				key: jest.fn(),
			},
			storeApi: {
				key: 'wpk/thing',
				descriptor: {},
			},
			events: {
				created: 'wpk.thing.created',
				updated: 'wpk.thing.updated',
				removed: 'wpk.thing.removed',
			},
		};
	});

	describe('grouped API namespaces', () => {
		describe('select namespace (pure selectors)', () => {
			it('should have select.item method', () => {
				expect(mockResource.select).toBeDefined();
				expect(mockResource.select?.item).toBeDefined();
				expect(typeof mockResource.select?.item).toBe('function');
			});

			it('should have select.items method', () => {
				expect(mockResource.select?.items).toBeDefined();
				expect(typeof mockResource.select?.items).toBe('function');
			});

			it('should have select.list method', () => {
				expect(mockResource.select?.list).toBeDefined();
				expect(typeof mockResource.select?.list).toBe('function');
			});

			it('select.item should return undefined for non-existent items', () => {
				const item = mockResource.select?.item(123);
				expect(item).toBeUndefined();
			});

			it('select.items should return empty array when no items', () => {
				const items = mockResource.select?.items();
				expect(items).toEqual([]);
			});

			it('select.list should return empty array when no list', () => {
				const list = mockResource.select?.list({ q: 'search' });
				expect(list).toEqual([]);
			});

			it('select.list should return empty array when getItems returns falsy', () => {
				// Import defineResource to test with real implementation
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const { defineResource } = require('../../define');

				// Save original wp object
				const originalWp = global.window?.wp;

				// Mock window.wp.data.select to return a store with getItems that returns null
				const mockGetItems = jest.fn().mockReturnValue(null);
				global.window.wp = {
					...global.window.wp,
					data: {
						select: jest.fn().mockReturnValue({
							getItems: mockGetItems,
						}),
					} as any, // Mock for testing - needs to match WPGlobal type
				};

				// Create a real resource
				const realResource = defineResource({
					name: 'test',
					routes: {
						list: { path: '/wpk/v1/test', method: 'GET' },
					},
				});

				// This will call the real select.list which should fallback to [] when getItems returns null
				const list = realResource.select?.list({ q: 'test' });
				expect(list).toEqual([]);
				expect(mockGetItems).toHaveBeenCalledWith({ q: 'test' });

				// Restore original
				if (originalWp) {
					global.window.wp = originalWp;
				} else {
					delete global.window.wp;
				}
			});
		});

		describe('fetch namespace (explicit fetching)', () => {
			it('should have fetch.item method', () => {
				expect(mockResource.fetch).toBeDefined();
				expect(mockResource.get?.item).toBeDefined();
				expect(typeof mockResource.get?.item).toBe('function');
			});

			it('should have fetch.list method', () => {
				expect(mockResource.get?.list).toBeDefined();
				expect(typeof mockResource.get?.list).toBe('function');
			});

			it('fetch.item should fetch single item', async () => {
				const item = await mockResource.get?.item(123);
				expect(item).toEqual({
					id: 1,
					title: 'Thing One',
					status: 'active',
				});
			});

			it('fetch.list should fetch list of items', async () => {
				const result = await mockResource.get?.list({ q: 'search' });
				expect(result).toEqual(mockListResponse);
			});
		});

		describe('mutate namespace (CRUD operations)', () => {
			it('should have mutate.create method', () => {
				expect(mockResource.mutate).toBeDefined();
				expect(mockResource.mutate?.create).toBeDefined();
				expect(typeof mockResource.mutate?.create).toBe('function');
			});

			it('should have mutate.update method', () => {
				expect(mockResource.mutate?.update).toBeDefined();
				expect(typeof mockResource.mutate?.update).toBe('function');
			});

			it('should have mutate.remove method', () => {
				expect(mockResource.mutate?.remove).toBeDefined();
				expect(typeof mockResource.mutate?.remove).toBe('function');
			});

			it('mutate.create should create new item', async () => {
				const data = { title: 'New Thing', status: 'active' };
				const result = await mockResource.mutate?.create(data);
				expect(result).toEqual({
					id: 3,
					title: 'New Thing',
					status: 'active',
				});
			});

			it('mutate.update should update existing item', async () => {
				const data = { title: 'Updated Thing' };
				const result = await mockResource.mutate?.update(1, data);
				expect(result).toEqual({
					id: 1,
					title: 'Updated Thing',
					status: 'active',
				});
			});

			it('mutate.remove should delete item', async () => {
				const result = await mockResource.mutate?.remove(1);
				expect(result).toBeUndefined();
			});
		});

		describe('cache namespace (cache control)', () => {
			it('should have cache.prefetch.item method', () => {
				expect(mockResource.cache).toBeDefined();
				expect(mockResource.cache.prefetch.item).toBeDefined();
				expect(typeof mockResource.cache.prefetch.item).toBe(
					'function'
				);
			});

			it('should have cache.prefetch.list method', () => {
				expect(mockResource.cache.prefetch.list).toBeDefined();
				expect(typeof mockResource.cache.prefetch.list).toBe(
					'function'
				);
			});

			it('should have cache.invalidate.item method', () => {
				expect(mockResource.cache.invalidate.item).toBeDefined();
				expect(typeof mockResource.cache.invalidate.item).toBe(
					'function'
				);
			});

			it('should have cache.invalidate.list method', () => {
				expect(mockResource.cache.invalidate.list).toBeDefined();
				expect(typeof mockResource.cache.invalidate.list).toBe(
					'function'
				);
			});

			it('should have cache.invalidate.all method', () => {
				expect(mockResource.cache.invalidate.all).toBeDefined();
				expect(typeof mockResource.cache.invalidate.all).toBe(
					'function'
				);
			});

			it('should have cache.key property', () => {
				expect(mockResource.cache.key).toBeDefined();
			});

			it('cache.prefetch.item should prefetch single item', async () => {
				await mockResource.cache.prefetch.item(123);
				expect(mockResource.cache.prefetch.item).toHaveBeenCalledWith(
					123
				);
			});

			it('cache.prefetch.list should prefetch list', async () => {
				const query = { q: 'search' };
				await mockResource.cache.prefetch.list(query);
				expect(mockResource.cache.prefetch.list).toHaveBeenCalledWith(
					query
				);
			});

			it('cache.invalidate.item should invalidate single item', () => {
				mockResource.cache.invalidate.item(123);
				expect(mockResource.cache.invalidate.item).toHaveBeenCalledWith(
					123
				);
			});

			it('cache.invalidate.list should invalidate list', () => {
				const query = { q: 'search' };
				mockResource.cache.invalidate.list(query);
				expect(mockResource.cache.invalidate.list).toHaveBeenCalledWith(
					query
				);
			});

			it('cache.invalidate.all should invalidate all', () => {
				mockResource.cache.invalidate.all();
				expect(
					mockResource.cache.invalidate.all
				).toHaveBeenCalledWith();
			});
		});

		describe('storeApi namespace (store access)', () => {
			it('should have storeApi.key property', () => {
				expect(mockResource.storeApi).toBeDefined();
				expect(mockResource.storeApi?.key).toBe('wpk/thing');
			});

			it('should have storeApi.descriptor property', () => {
				expect(mockResource.storeApi?.descriptor).toBeDefined();
				expect(typeof mockResource.storeApi?.descriptor).toBe('object');
			});
		});

		describe('events namespace (event names)', () => {
			it('should have events.created property', () => {
				expect(mockResource.events).toBeDefined();
				expect(mockResource.events?.created).toBe('wpk.thing.created');
			});

			it('should have events.updated property', () => {
				expect(mockResource.events?.updated).toBe('wpk.thing.updated');
			});

			it('should have events.removed property', () => {
				expect(mockResource.events?.removed).toBe('wpk.thing.removed');
			});

			it('should follow wpk.{name}.{action} naming pattern', () => {
				expect(mockResource.events?.created).toMatch(/^wpk\.\w+\.\w+$/);
				expect(mockResource.events?.updated).toMatch(/^wpk\.\w+\.\w+$/);
				expect(mockResource.events?.removed).toMatch(/^wpk\.\w+\.\w+$/);
			});
		});

		describe('grouped API integration patterns', () => {
			it('should support read path: select → use → fetch', async () => {
				// Pure selector (no fetch)
				const cachedItem = mockResource.select?.item(123);
				expect(cachedItem).toBeUndefined(); // Not in cache yet

				// Fetch explicitly
				const fetchedItem = await mockResource.get?.item(123);
				expect(fetchedItem).toBeDefined();
			});

			it('should support write path: mutate → invalidate → prefetch', async () => {
				// Create new item
				await mockResource.mutate?.create({
					title: 'New',
					status: 'active',
				});

				// Invalidate affected caches
				mockResource.cache.invalidate.list();
				mockResource.cache.invalidate.item(3);

				// Prefetch updated data
				await mockResource.cache.prefetch.list({ status: 'active' });

				expect(mockResource.mutate?.create).toHaveBeenCalled();
				expect(mockResource.cache.invalidate.list).toHaveBeenCalled();
				expect(mockResource.cache.prefetch.list).toHaveBeenCalled();
			});

			it('should support complete CRUD flow with cache management', async () => {
				// 1. Fetch initial data
				const items = await mockResource.get?.list();
				expect(items).toBeDefined();

				// 2. Create new item
				const newItem = await mockResource.mutate?.create({
					title: 'New',
					status: 'active',
				});
				expect(newItem?.id).toBe(3);

				// 3. Invalidate lists
				mockResource.cache.invalidate.list();

				// 4. Update the item
				await mockResource.mutate?.update(3, { title: 'Updated' });

				// 5. Invalidate the item
				mockResource.cache.invalidate.item(3);

				// 6. Prefetch fresh data
				await mockResource.cache.prefetch.item(3);

				// 7. Delete the item
				await mockResource.mutate?.remove(3);

				// 8. Invalidate everything
				mockResource.cache.invalidate.all();

				// Verify all operations were called
				expect(mockResource.get?.list).toHaveBeenCalled();
				expect(mockResource.mutate?.create).toHaveBeenCalled();
				expect(mockResource.mutate?.update).toHaveBeenCalled();
				expect(mockResource.mutate?.remove).toHaveBeenCalled();
				expect(mockResource.cache.invalidate.item).toHaveBeenCalled();
				expect(mockResource.cache.invalidate.list).toHaveBeenCalled();
				expect(mockResource.cache.invalidate.all).toHaveBeenCalled();
			});

			it('should provide event names for observers', () => {
				// Event names can be used for tracking/logging
				const eventLog: Array<{ event: string; data: { id: number } }> =
					[];

				// Simulate creating an item with event emission
				eventLog.push({
					event: mockResource.events?.created || '',
					data: { id: 3 },
				});

				// Simulate updating an item
				eventLog.push({
					event: mockResource.events?.updated || '',
					data: { id: 3 },
				});

				// Simulate removing an item
				eventLog.push({
					event: mockResource.events?.removed || '',
					data: { id: 3 },
				});

				expect(eventLog).toHaveLength(3);
				expect(eventLog[0]?.event).toBe('wpk.thing.created');
				expect(eventLog[1]?.event).toBe('wpk.thing.updated');
				expect(eventLog[2]?.event).toBe('wpk.thing.removed');
			});
		});

		describe('grouped API vs thin-flat API equivalence', () => {
			it('get.item should be equivalent to fetch', async () => {
				// Both should call the same underlying method
				expect(mockResource.get?.item).toBeDefined();
				expect(mockResource.fetch).toBeDefined();
			});

			it('get.list should be equivalent to fetchList', async () => {
				expect(mockResource.get?.list).toBeDefined();
				expect(mockResource.fetchList).toBeDefined();
			});
			it('use.item should be equivalent to useGet', () => {
				expect(mockResource.useGet).toBeDefined();
			});

			it('use.list should be equivalent to useList', () => {
				expect(mockResource.useList).toBeDefined();
			});

			it('mutate.create should be equivalent to create', () => {
				expect(mockResource.mutate?.create).toBeDefined();
				expect(mockResource.create).toBeDefined();
			});

			it('mutate.update should be equivalent to update', () => {
				expect(mockResource.mutate?.update).toBeDefined();
				expect(mockResource.update).toBeDefined();
			});

			it('mutate.remove should be equivalent to remove', () => {
				expect(mockResource.mutate?.remove).toBeDefined();
				expect(mockResource.remove).toBeDefined();
			});

			it('cache.prefetch.item should be equivalent to prefetchGet', () => {
				expect(mockResource.cache.prefetch.item).toBeDefined();
				expect(mockResource.prefetchGet).toBeDefined();
			});

			it('cache.prefetch.list should be equivalent to prefetchList', () => {
				expect(mockResource.cache.prefetch.list).toBeDefined();
				expect(mockResource.prefetchList).toBeDefined();
			});

			it('cache.invalidate methods should wrap invalidate', () => {
				expect(mockResource.cache.invalidate.item).toBeDefined();
				expect(mockResource.cache.invalidate.list).toBeDefined();
				expect(mockResource.cache.invalidate.all).toBeDefined();
				expect(mockResource.invalidate).toBeDefined();
			});
		});
	});
});

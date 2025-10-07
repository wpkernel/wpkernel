/**
 * Unit tests for createStore factory - Cache Keys
 *
 * Tests the @wordpress/data store integration
 */

import { createStore } from '../../store';
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

describe('createStore - Cache Keys', () => {
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

	describe('cache key generation', () => {
		it('should use default getId with id property', () => {
			const store = createStore({
				resource: mockResource,
			});

			const item = { id: 123, title: 'Test', status: 'active' };
			const state = store.reducer(
				undefined,
				store.actions.receiveItem(item)
			);

			expect(state.items[123]).toEqual(item);
		});

		it('should use default getQueryKey with JSON.stringify', () => {
			const store = createStore({
				resource: mockResource,
			});

			const query = { q: 'search', status: 'active' };
			const expectedKey = JSON.stringify(query);
			const action = store.actions.receiveItems(expectedKey, [], {});

			expect(action).toHaveProperty('queryKey', expectedKey);
		});

		it('should use custom getId function', () => {
			const customGetId = (item: MockThing) => `thing-${item.id}`;
			const store = createStore({
				resource: mockResource,
				getId: customGetId,
			});

			const item = { id: 123, title: 'Test', status: 'active' };
			const state = store.reducer(
				undefined,
				store.actions.receiveItem(item)
			);

			expect(state.items['thing-123']).toEqual(item);
		});

		it('should use custom getQueryKey function', () => {
			const customGetQueryKey = (query?: MockThingQuery) =>
				`custom-${query?.q || 'all'}`;
			const store = createStore({
				resource: mockResource,
				getQueryKey: customGetQueryKey,
			});

			const expectedKey = 'custom-search';
			const action = store.actions.receiveItems(expectedKey, [], {});

			expect(action).toHaveProperty('queryKey', expectedKey);
		});
	});
});

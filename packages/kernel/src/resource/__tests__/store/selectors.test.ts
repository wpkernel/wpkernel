/**
 * Unit tests for createStore factory - Selectors
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

describe('createStore - Selectors', () => {
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

	describe('selectors', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;
		let stateWithData: ReturnType<typeof store.reducer>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});

			// Setup state with test data
			stateWithData = store.reducer(
				undefined,
				store.actions.receiveItems(
					'query1',
					[
						{ id: 1, title: 'Thing One', status: 'active' },
						{ id: 2, title: 'Thing Two', status: 'inactive' },
					],
					{ total: 2, hasMore: false }
				)
			);
		});

		it('should select item by ID', () => {
			const item = store.selectors.getItem(stateWithData, 1);

			expect(item).toEqual({
				id: 1,
				title: 'Thing One',
				status: 'active',
			});
		});

		it('should return undefined for non-existent item', () => {
			const item = store.selectors.getItem(stateWithData, 999);

			expect(item).toBeUndefined();
		});

		it('should select all items from a query', () => {
			// The data was stored with queryKey 'query1', need to use getItems with undefined query
			// getItems() with no query will use getQueryKey(undefined) which won't match 'query1'
			// Let's use a proper query setup
			const query = {};
			const queryKey = JSON.stringify(query);
			const stateWithQuery = store.reducer(
				undefined,
				store.actions.receiveItems(
					queryKey,
					[
						{ id: 1, title: 'Thing One', status: 'active' },
						{ id: 2, title: 'Thing Two', status: 'inactive' },
					],
					{ total: 2, hasMore: false }
				)
			);

			const items = store.selectors.getItems(stateWithQuery, query);

			expect(items).toHaveLength(2);
			expect(items[0]).toEqual({
				id: 1,
				title: 'Thing One',
				status: 'active',
			});
			expect(items[1]).toEqual({
				id: 2,
				title: 'Thing Two',
				status: 'inactive',
			});
		});

		it('should select list by query key', () => {
			// The data was stored with queryKey 'query1', so we need to query with that same key
			// Since getList uses getQueryKey internally, we need to understand what query produces 'query1'
			// For this test, let's re-setup with a proper query
			const query = { q: 'search' };
			const queryKey = JSON.stringify(query);
			const stateWithQuery = store.reducer(
				undefined,
				store.actions.receiveItems(
					queryKey,
					[
						{ id: 1, title: 'Thing One', status: 'active' },
						{ id: 2, title: 'Thing Two', status: 'inactive' },
					],
					{ total: 2, hasMore: false }
				)
			);

			const result = store.selectors.getList(stateWithQuery, query);

			expect(result.items).toEqual([
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			]);
			expect(result.total).toBe(2);
			expect(result.hasMore).toBe(false);
		});

		it('should return empty list for non-existent query', () => {
			const result = store.selectors.getList(stateWithData, {
				q: 'nonexistent',
			});

			expect(result.items).toEqual([]);
			expect(result.total).toBeUndefined();
		});

		it('should select error by cache key', () => {
			const stateWithError = store.reducer(
				undefined,
				store.actions.receiveError('thing:get:1', 'Not found')
			);

			const error = store.selectors.getError(
				stateWithError,
				'thing:get:1'
			);

			expect(error).toBe('Not found');
		});

		it('should return undefined for non-existent error', () => {
			const error = store.selectors.getError(
				stateWithData,
				'thing:get:999'
			);

			expect(error).toBeUndefined();
		});
	});

	describe('resolution tracking selectors (stubs)', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;
		let emptyState: ReturnType<typeof store.reducer>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});

			emptyState = store.reducer(undefined, { type: '@@INIT' });
		});

		it('should have isResolving stub that returns false', () => {
			expect(store.selectors.isResolving).toBeDefined();
			const result = store.selectors.isResolving(emptyState, 'getItem', [
				1,
			]);
			expect(result).toBe(false);
		});

		it('should have hasStartedResolution stub that returns false', () => {
			expect(store.selectors.hasStartedResolution).toBeDefined();
			const result = store.selectors.hasStartedResolution(
				emptyState,
				'getItem',
				[1]
			);
			expect(result).toBe(false);
		});

		it('should have hasFinishedResolution stub that returns false', () => {
			expect(store.selectors.hasFinishedResolution).toBeDefined();
			const result = store.selectors.hasFinishedResolution(
				emptyState,
				'getItem',
				[1]
			);
			expect(result).toBe(false);
		});
	});
});

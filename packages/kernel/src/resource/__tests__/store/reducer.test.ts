/**
 * Unit tests for createStore factory - Reducer
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

describe('createStore - Reducer', () => {
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

	describe('reducer', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});
		});

		it('should initialize with empty state', () => {
			const state = store.reducer(undefined, { type: '@@INIT' });

			expect(state).toEqual({
				items: {},
				lists: {},
				listMeta: {},
				errors: {},
			});
		});

		it('should handle RECEIVE_ITEM action', () => {
			const item: MockThing = {
				id: 1,
				title: 'Thing One',
				status: 'active',
			};
			const action = {
				type: 'RECEIVE_ITEM',
				item,
			};

			const state = store.reducer(undefined, action);

			expect(state.items[1]).toEqual(item);
		});

		it('should handle RECEIVE_ITEMS action', () => {
			const items: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			];
			const queryKey = '{"q":"search"}';
			const meta = { total: 2, hasMore: false };
			const action = {
				type: 'RECEIVE_ITEMS',
				items,
				queryKey,
				meta,
			};

			const state = store.reducer(undefined, action);

			expect(state.items[1]).toEqual(items[0]);
			expect(state.items[2]).toEqual(items[1]);
			expect(state.lists[queryKey]).toEqual([1, 2]);
			expect(state.listMeta[queryKey]).toEqual({
				...meta,
				status: 'success',
			});
		});

		it('should handle RECEIVE_ERROR action', () => {
			const cacheKey = 'thing:get:1';
			const error = 'Not found';
			const action = {
				type: 'RECEIVE_ERROR',
				cacheKey,
				error,
			};

			const state = store.reducer(undefined, action);

			expect(state.errors[cacheKey]).toBe(error);
		});

		it('should clear list errors when RECEIVE_ITEMS succeeds', () => {
			const queryKey = '{"q":"search"}';
			const cacheKey = `thing:list:${queryKey}`;

			// First, set an error for this list
			const errorAction = {
				type: 'RECEIVE_ERROR',
				cacheKey,
				error: 'Network error',
			};
			let state = store.reducer(undefined, errorAction);
			expect(state.errors[cacheKey]).toBe('Network error');

			// Then receive items successfully
			const items: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
			];
			const receiveAction = {
				type: 'RECEIVE_ITEMS',
				items,
				queryKey,
				meta: { total: 1, hasMore: false },
			};
			state = store.reducer(state, receiveAction);

			// Error should be cleared
			expect(state.errors[cacheKey]).toBeUndefined();
			expect(state.lists[queryKey]).toEqual([1]);
			expect(state.listMeta[queryKey]).toHaveProperty(
				'status',
				'success'
			);
		});

		it('should handle INVALIDATE action', () => {
			// Setup state with data
			const setupAction1 = {
				type: 'RECEIVE_ITEMS',
				items: [{ id: 1, title: 'Thing One', status: 'active' }],
				queryKey: 'query1',
				meta: {},
			};
			const setupAction2 = {
				type: 'RECEIVE_ITEMS',
				items: [{ id: 2, title: 'Thing Two', status: 'inactive' }],
				queryKey: 'query2',
				meta: {},
			};
			let state = store.reducer(undefined, setupAction1);
			state = store.reducer(state, setupAction2);

			// Invalidate one query
			const invalidateAction = {
				type: 'INVALIDATE',
				cacheKeys: ['query1'],
			};
			state = store.reducer(state, invalidateAction);

			expect(state.lists).not.toHaveProperty('query1');
			expect(state.lists).toHaveProperty('query2');
		});

		it('should handle INVALIDATE_ALL action', () => {
			// Setup state with data
			const setupAction = {
				type: 'RECEIVE_ITEMS',
				items: [
					{ id: 1, title: 'Thing One', status: 'active' },
					{ id: 2, title: 'Thing Two', status: 'inactive' },
				],
				queryKey: 'query1',
				meta: {},
			};
			let state = store.reducer(undefined, setupAction);

			// Invalidate all
			const invalidateAllAction = {
				type: 'INVALIDATE_ALL',
			};
			state = store.reducer(state, invalidateAllAction);

			expect(state).toEqual({
				items: {},
				lists: {},
				listMeta: {},
				errors: {},
			});
		});

		it('should handle unknown action types gracefully', () => {
			const unknownAction = {
				type: 'UNKNOWN_ACTION',
				payload: 'test',
			};

			const state = store.reducer(undefined, unknownAction);

			// Should return initial state unchanged
			expect(state).toEqual({
				items: {},
				lists: {},
				listMeta: {},
				errors: {},
			});
		});

		it('should handle invalid action objects gracefully', () => {
			// Intentionally pass invalid type to test error handling
			const invalidAction = 'not an object' as unknown as {
				type: string;
			};

			const state = store.reducer(undefined, invalidAction);

			// Should return initial state
			expect(state).toEqual({
				items: {},
				lists: {},
				listMeta: {},
				errors: {},
			});
		});

		it('should handle RECEIVE_ITEMS with undefined meta (use empty object)', () => {
			const items: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
			];
			const queryKey = '{}';
			const action = {
				type: 'RECEIVE_ITEMS',
				items,
				queryKey,
				meta: undefined, // No meta provided
			};

			const state = store.reducer(undefined, action);

			expect(state.items[1]).toEqual(items[0]);
			expect(state.lists[queryKey]).toEqual([1]);
			// Should fallback to empty object with success status
			expect(state.listMeta[queryKey]).toEqual({ status: 'success' });
		});
	});
});

/**
 * Unit tests for createStore factory - Actions
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

describe('createStore - Actions', () => {
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

	describe('actions', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});
		});

		it('should create receiveItem action', () => {
			const item: MockThing = {
				id: 1,
				title: 'Thing One',
				status: 'active',
			};
			const action = store.actions.receiveItem(item);

			expect(action).toEqual({
				type: 'RECEIVE_ITEM',
				item,
			});
		});

		it('should create receiveItems action', () => {
			const items: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
			];
			const queryKey = 'query1';
			const meta = { total: 1, hasMore: false };

			const action = store.actions.receiveItems(queryKey, items, meta);

			expect(action).toEqual({
				type: 'RECEIVE_ITEMS',
				queryKey,
				items,
				meta,
			});
		});

		it('should create receiveError action', () => {
			const cacheKey = 'thing:get:1';
			const error = 'Not found';

			const action = store.actions.receiveError(cacheKey, error);

			expect(action).toEqual({
				type: 'RECEIVE_ERROR',
				cacheKey,
				error,
			});
		});

		it('should create invalidate action', () => {
			const cacheKeys = ['query1', 'query2'];

			const action = store.actions.invalidate(cacheKeys);

			expect(action).toEqual({
				type: 'INVALIDATE',
				cacheKeys,
			});
		});

		it('should create invalidateAll action', () => {
			const action = store.actions.invalidateAll();

			expect(action).toEqual({
				type: 'INVALIDATE_ALL',
			});
		});
	});
});

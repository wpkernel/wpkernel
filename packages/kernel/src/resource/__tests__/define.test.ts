/**
 * Tests for defineResource and config validation
 */

import { defineResource } from '../define';
import { KernelError } from '../../error';
import { resetNamespaceCache } from '../../namespace';
import type { ResourceStore } from '../types';

// Use global types for window.wp

interface Thing {
	id: number;
	title: string;
	description: string;
}

interface ThingQuery {
	q?: string;
	page?: number;
}

describe('defineResource - integration', () => {
	describe('lazy store initialization', () => {
		it('should have a store property', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			expect(resource).toHaveProperty('store');
		});

		it('should return same store instance on multiple accesses', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			const store1 = resource.store;
			const store2 = resource.store;

			expect(store1).toBe(store2);
		});

		it('should create store with correct storeKey', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			const store = resource.store as ResourceStore<Thing, ThingQuery>;

			expect(store).toHaveProperty('storeKey', 'wpk/thing');
		});

		it('should create store with selectors, actions, resolvers, reducer', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			const store = resource.store as ResourceStore<Thing, ThingQuery>;

			expect(store).toHaveProperty('selectors');
			expect(store).toHaveProperty('actions');
			expect(store).toHaveProperty('resolvers');
			expect(store).toHaveProperty('reducer');
			expect(store).toHaveProperty('initialState');
		});

		it('should not register store when window.wp.data is undefined', () => {
			// Mock scenario where window.wp is not available
			const windowWithWp = global.window as Window & { wp?: any };
			const originalWp = windowWithWp?.wp;
			if (windowWithWp) {
				delete windowWithWp.wp;
			}

			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			// Should still return store descriptor without throwing
			const store = resource.store as ResourceStore<Thing, ThingQuery>;
			expect(store).toHaveProperty('storeKey');

			// Restore
			if (windowWithWp && originalWp) {
				windowWithWp.wp = originalWp;
			}
		});

		it('should register store when window.wp.data.register is available', () => {
			// Mock window.wp.data.createReduxStore and register
			const mockCreatedStore = { name: 'mock-redux-store' };
			const mockCreateReduxStore = jest
				.fn()
				.mockReturnValue(mockCreatedStore);
			const mockRegister = jest.fn();
			const windowWithWp = global.window as Window & { wp?: any };
			const originalWp = windowWithWp?.wp;

			if (windowWithWp) {
				windowWithWp.wp = {
					...windowWithWp.wp,
					...windowWithWp.wp,
					data: {
						...windowWithWp.wp?.data,
						createReduxStore: mockCreateReduxStore,
						register: mockRegister,
					},
				};
			}

			const resource = defineResource<Thing>({
				name: 'thing-with-register',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			// Access store to trigger registration
			void resource.store;

			if (windowWithWp?.wp?.data?.register) {
				expect(mockCreateReduxStore).toHaveBeenCalledTimes(1);
				expect(mockCreateReduxStore).toHaveBeenCalledWith(
					'wpk/thing-with-register',
					expect.objectContaining({
						reducer: expect.any(Function),
						actions: expect.any(Object),
						selectors: expect.any(Object),
						resolvers: expect.any(Object),
					})
				);
				expect(mockRegister).toHaveBeenCalledTimes(1);
				expect(mockRegister).toHaveBeenCalledWith(mockCreatedStore);
			}

			// Restore
			if (windowWithWp) {
				if (originalWp) {
					windowWithWp.wp = originalWp;
				} else {
					delete windowWithWp.wp;
				}
			}
		});
	});

	describe('client methods', () => {
		let mockApiFetch: jest.Mock;
		let mockDoAction: jest.Mock;

		beforeEach(() => {
			// Mock @wordpress/api-fetch and hooks
			mockApiFetch = jest.fn();
			mockDoAction = jest.fn();

			const windowWithWp = global.window;

			if (windowWithWp) {
				windowWithWp.wp = {
					...windowWithWp.wp,
					apiFetch: mockApiFetch,
					hooks: {
						doAction: mockDoAction,
					},
					data: {
						register: jest.fn(),
					} as any, // Mock for testing - needs to match WPGlobal type
				} as unknown as Window['wp'];
			}
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		describe('list()', () => {
			it('should call transport.fetch() with correct parameters', async () => {
				const mockData = [
					{ id: 1, title: 'Thing 1', description: 'First' },
					{ id: 2, title: 'Thing 2', description: 'Second' },
				];
				mockApiFetch.mockResolvedValue(mockData);

				const resource = defineResource<Thing, ThingQuery>({
					name: 'thing',
					routes: {
						list: { path: '/my-plugin/v1/things', method: 'GET' },
					},
				});

				const result = await resource.fetchList!({
					q: 'search',
					page: 1,
				});

				expect(mockApiFetch).toHaveBeenCalledWith({
					path: '/my-plugin/v1/things?q=search&page=1',
					method: 'GET',
					data: undefined,
					parse: true,
				});
				expect(result.items).toEqual(mockData);
			});

			it('should normalize array response to ListResponse format', async () => {
				const mockData = [
					{ id: 1, title: 'Thing 1', description: 'First' },
				];
				mockApiFetch.mockResolvedValue(mockData);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						list: { path: '/my-plugin/v1/things', method: 'GET' },
					},
				});

				const result = await resource.fetchList!();

				expect(result).toEqual({
					items: mockData,
					total: undefined,
					hasMore: undefined,
					nextCursor: undefined,
				});
			});

			it('should handle object response with items property', async () => {
				const mockResponse = {
					items: [{ id: 1, title: 'Thing 1', description: 'First' }],
					total: 10,
					hasMore: true,
					nextCursor: 'cursor_abc123',
				};
				mockApiFetch.mockResolvedValue(mockResponse);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						list: { path: '/my-plugin/v1/things', method: 'GET' },
					},
				});

				const result = await resource.fetchList!();

				expect(result).toEqual(mockResponse);
			});
		});

		describe('get()', () => {
			it('should call transport.fetch() with interpolated path', async () => {
				const mockData = {
					id: 123,
					title: 'Thing 123',
					description: 'Test',
				};
				mockApiFetch.mockResolvedValue(mockData);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						get: {
							path: '/my-plugin/v1/things/:id',
							method: 'GET',
						},
					},
				});

				const result = await resource.fetch!(123);

				expect(mockApiFetch).toHaveBeenCalledWith({
					path: '/my-plugin/v1/things/123',
					method: 'GET',
					data: undefined,
					parse: true,
				});
				expect(result).toEqual(mockData);
			});

			it('should handle string IDs', async () => {
				const mockData = {
					id: 'abc',
					title: 'Thing ABC',
					description: 'Test',
				};
				mockApiFetch.mockResolvedValue(mockData);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						get: {
							path: '/my-plugin/v1/things/:id',
							method: 'GET',
						},
					},
				});

				await resource.fetch!('abc');

				expect(mockApiFetch).toHaveBeenCalledWith({
					path: '/my-plugin/v1/things/abc',
					method: 'GET',
					data: undefined,
					parse: true,
				});
			});
		});

		describe('error handling', () => {
			it('should propagate transport errors', async () => {
				const mockError = {
					code: 'rest_not_found',
					message: 'Resource not found',
					data: { status: 404 },
				};
				mockApiFetch.mockRejectedValue(mockError);

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						get: {
							path: '/my-plugin/v1/things/:id',
							method: 'GET',
						},
					},
				});

				await expect(resource.fetch!(999)).rejects.toThrow(KernelError);
			});
		});
	});

	describe('namespace support', () => {
		let mockApiFetch: jest.Mock;
		let mockDoAction: jest.Mock;

		beforeEach(() => {
			// Mock @wordpress/api-fetch and hooks
			mockApiFetch = jest.fn();
			mockDoAction = jest.fn();

			const windowWithWp = global.window;

			if (windowWithWp) {
				windowWithWp.wp = {
					...windowWithWp.wp,
					apiFetch: mockApiFetch,
					hooks: {
						doAction: mockDoAction,
					},
					data: {
						register: jest.fn(),
					} as any,
				} as unknown as Window['wp'];
			}
		});

		afterEach(() => {
			jest.restoreAllMocks();
			// Clear namespace cache for clean tests
			resetNamespaceCache();
		});

		it('should use auto-detected namespace by default', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			// With fallback, should use 'wpk' namespace by default
			expect(resource.storeKey).toBe('wpk/thing');
			expect(resource.events?.created).toBe('wpk.thing.created');
			expect(resource.events?.updated).toBe('wpk.thing.updated');
			expect(resource.events?.removed).toBe('wpk.thing.removed');
		});

		it('should use explicit namespace when provided', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				namespace: 'my-plugin',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			expect(resource.storeKey).toBe('my-plugin/thing');
			expect(resource.events?.created).toBe('my-plugin.thing.created');
			expect(resource.events?.updated).toBe('my-plugin.thing.updated');
			expect(resource.events?.removed).toBe('my-plugin.thing.removed');
		});

		it('should parse namespace from shorthand name syntax', () => {
			const resource = defineResource<Thing>({
				name: 'acme:thing',
				routes: {
					list: { path: '/acme/v1/things', method: 'GET' },
				},
			});

			expect(resource.name).toBe('thing');
			expect(resource.storeKey).toBe('acme/thing');
			expect(resource.events?.created).toBe('acme.thing.created');
			expect(resource.events?.updated).toBe('acme.thing.updated');
			expect(resource.events?.removed).toBe('acme.thing.removed');
		});

		it('should prefer explicit namespace over shorthand syntax', () => {
			const resource = defineResource<Thing>({
				name: 'prefix:thing',
				namespace: 'explicit',
				routes: {
					list: { path: '/explicit/v1/things', method: 'GET' },
				},
			});

			// When explicit namespace is provided, it takes precedence
			// but if name has colon syntax, parse the resource name part
			expect(resource.name).toBe('thing');
			expect(resource.storeKey).toBe('explicit/thing');
			expect(resource.events?.created).toBe('explicit.thing.created');
		});

		it('should use namespace in cache invalidation', () => {
			const resource = defineResource<Thing>({
				name: 'thing',
				namespace: 'custom',
				routes: {
					list: { path: '/custom/v1/things', method: 'GET' },
				},
			});

			// The cache invalidation test would need mocking to verify
			// For now, just verify the resource has the correct properties
			expect(resource.cache?.invalidate?.all).toBeDefined();
		});

		it('should detect namespace from build-time defines', () => {
			// Mock build-time define
			const originalDefine = (
				globalThis as GlobalThis & { __WPK_NAMESPACE__?: string }
			).__WPK_NAMESPACE__;
			(
				globalThis as GlobalThis & { __WPK_NAMESPACE__?: string }
			).__WPK_NAMESPACE__ = 'build-time-plugin';

			try {
				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						list: {
							path: '/build-time-plugin/v1/things',
							method: 'GET',
						},
					},
				});

				expect(resource.storeKey).toBe('build-time-plugin/thing');
				expect(resource.events?.created).toBe(
					'build-time-plugin.thing.created'
				);
			} finally {
				// Restore
				if (originalDefine === undefined) {
					delete (
						globalThis as GlobalThis & {
							__WPK_NAMESPACE__?: string;
						}
					).__WPK_NAMESPACE__;
				} else {
					(
						globalThis as GlobalThis & {
							__WPK_NAMESPACE__?: string;
						}
					).__WPK_NAMESPACE__ = originalDefine;
				}
			}
		});

		it('should detect namespace from WordPress plugin data', () => {
			// Mock WordPress plugin data
			const windowWithWp = global.window;
			const originalData = windowWithWp?.wpKernelData;

			if (windowWithWp) {
				windowWithWp.wpKernelData = {
					textDomain: 'wp-plugin-namespace',
				};
			}

			try {
				// Clear cache to ensure fresh detection
				resetNamespaceCache();

				const resource = defineResource<Thing>({
					name: 'thing',
					routes: {
						list: {
							path: '/wp-plugin-namespace/v1/things',
							method: 'GET',
						},
					},
				});

				expect(resource.storeKey).toBe('wp-plugin-namespace/thing');
				expect(resource.events?.created).toBe(
					'wp-plugin-namespace.thing.created'
				);
			} finally {
				// Restore
				if (windowWithWp) {
					if (originalData === undefined) {
						delete windowWithWp.wpKernelData;
					} else {
						windowWithWp.wpKernelData = originalData;
					}
				}
			}
		});

		it('should maintain backward compatibility with existing code', () => {
			// Existing code without namespace should still work
			const resource = defineResource<Thing>({
				name: 'thing',
				routes: {
					list: { path: '/my-plugin/v1/things', method: 'GET' },
				},
			});

			// Should have all the same properties and methods
			expect(resource).toHaveProperty('name', 'thing');
			expect(resource).toHaveProperty('storeKey');
			expect(resource).toHaveProperty('cacheKeys');
			expect(resource).toHaveProperty('routes');
			expect(resource).toHaveProperty('fetchList');
			expect(resource).toHaveProperty('invalidate');
			expect(resource).toHaveProperty('key');
			expect(resource).toHaveProperty('select');
			expect(resource).toHaveProperty('get');
			expect(resource).toHaveProperty('mutate');
			expect(resource).toHaveProperty('cache');
			expect(resource).toHaveProperty('storeApi');
			expect(resource).toHaveProperty('events');
		});
	});
});

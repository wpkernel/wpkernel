/**
 * @file Cache Utilities Tests - Edge Cases
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

import { invalidate, invalidateAll, normalizeCacheKey } from '../../cache';
import { WPK_SUBSYSTEM_NAMESPACES } from '../../../namespace/constants';

// Use global types for window.wp

describe('cache helper functions', () => {
	describe('normalizeCacheKey', () => {
		it('should handle empty pattern resulting in empty string', () => {
			const result = normalizeCacheKey([]);
			expect(result).toBe('');
		});

		it('should filter out all nulls and undefineds leaving empty string', () => {
			const result = normalizeCacheKey([null, undefined]);
			expect(result).toBe('');
		});
	});
});

describe('invalidate edge cases', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let mockDoAction: jest.Mock;
	let originalWp: Window['wp'];
	let originalNodeEnv: string | undefined;
	let consoleWarnSpy: jest.SpyInstance;

	beforeEach(() => {
		// Store originals
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;
		originalNodeEnv = process.env.NODE_ENV;

		// Spy on console.warn
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

		// Create mocks
		mockDispatch = jest.fn();
		mockSelect = jest.fn();
		mockDoAction = jest.fn();

		// Setup window.wp mock
		if (windowWithWp) {
			windowWithWp.wp = {
				data: {
					dispatch: mockDispatch,
					select: mockSelect,
				},
				hooks: {
					doAction: mockDoAction,
				},
			};
		}
	});

	afterEach(() => {
		// Restore originals
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp && originalWp) {
			windowWithWp.wp = originalWp;
		}
		if (originalNodeEnv) {
			process.env.NODE_ENV = originalNodeEnv;
		} else {
			delete process.env.NODE_ENV;
		}

		consoleWarnSpy.mockRestore();
		jest.clearAllMocks();
	});

	describe('development environment warnings', () => {
		it('should log warning when store does not expose __getInternalState in development', () => {
			process.env.NODE_ENV = 'development';

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				// No __getInternalState selector
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw, but should log warning
			expect(() => {
				invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });
			}).not.toThrow();

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				`[${WPK_SUBSYSTEM_NAMESPACES.CACHE}]`,
				'Store wpk/thing does not expose __getInternalState selector'
			);
			expect(console as any).toHaveWarned();
		});

		it('should log warning when invalidateAll fails in development', () => {
			process.env.NODE_ENV = 'development';

			const mockStoreDispatch = {
				invalidateAll: jest.fn(() => {
					throw new Error('Store error');
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);

			// Should not throw, but should log warning
			expect(() => {
				invalidateAll('wpk/thing');
			}).not.toThrow();

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				`[${WPK_SUBSYSTEM_NAMESPACES.CACHE}]`,
				expect.stringContaining('Failed to invalidate all caches'),
				expect.any(Error)
			);
			expect(console as any).toHaveWarned();
		});

		it('should not log warning when invalidate fails in production', () => {
			process.env.NODE_ENV = 'production';

			const mockStoreDispatch = {
				invalidate: jest.fn(() => {
					throw new Error('Store error');
				}),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue({
					lists: { 'thing:list': [1, 2] },
					listMeta: {},
					errors: {},
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw or log
			expect(() => {
				invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });
			}).not.toThrow();

			expect(consoleWarnSpy).not.toHaveBeenCalled();
		});

		it('should not log warning when invalidateAll fails in production', () => {
			process.env.NODE_ENV = 'production';

			const mockStoreDispatch = {
				invalidateAll: jest.fn(() => {
					throw new Error('Store error');
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);

			// Should not throw or log
			expect(() => {
				invalidateAll('wpk/thing');
			}).not.toThrow();

			expect(consoleWarnSpy).not.toHaveBeenCalled();
		});
	});

	describe('event emission edge cases', () => {
		it('should not emit event when emitEvent is false', () => {
			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue({
					lists: { 'thing:list': [1, 2] },
					listMeta: {},
					errors: {},
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list'], {
				storeKey: 'wpk/thing',
				emitEvent: false,
			});

			expect(mockDoAction).not.toHaveBeenCalled();
		});

		it('should not emit event when no keys were invalidated', () => {
			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue({
					lists: {},
					listMeta: {},
					errors: {},
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list'], {
				storeKey: 'wpk/thing',
				emitEvent: true,
			});

			expect(mockDoAction).not.toHaveBeenCalled();
		});

		it('should handle missing window.wp.hooks gracefully', () => {
			const windowWithWp = global.window as Window & { wp?: any };
			if (windowWithWp && windowWithWp.wp) {
				delete windowWithWp.wp.hooks;
			}

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue({
					lists: { 'thing:list': [1, 2] },
					listMeta: {},
					errors: {},
				}),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw when hooks is undefined
			expect(() => {
				invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });
			}).not.toThrow();
		});
	});

	describe('invalidateAll edge cases', () => {
		it('should handle missing invalidateAll method', () => {
			const mockStoreDispatch = {
				// No invalidateAll method
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);

			// Should not throw
			expect(() => {
				invalidateAll('wpk/thing');
			}).not.toThrow();

			// Should not emit event
			expect(mockDoAction).not.toHaveBeenCalled();
		});

		it('should emit event with wildcard when invalidateAll succeeds', () => {
			const mockStoreDispatch = {
				invalidateAll: jest.fn(),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);

			invalidateAll('wpk/thing');

			expect(mockStoreDispatch.invalidateAll).toHaveBeenCalled();
			expect(mockDoAction).toHaveBeenCalledWith('wpk.cache.invalidated', {
				keys: ['wpk/thing:*'],
			});
		});
	});
});

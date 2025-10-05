/**
 * @file Cache Utilities Tests - Invalidate
 * Consolidated tests for cache keys, interpolation, and invalidation
 */

import { invalidate, registerStoreKey } from '../../cache';
import { WPK_SUBSYSTEM_NAMESPACES } from '../../../namespace/constants';

// Use global types for window.wp

describe('invalidate', () => {
	let mockDispatch: jest.Mock;
	let mockSelect: jest.Mock;
	let mockDoAction: jest.Mock;
	let originalWp: Window['wp'];

	beforeEach(() => {
		// Store original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;

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

		// Register test store keys
		registerStoreKey('wpk/thing');
		registerStoreKey('wpk/job');
	});

	afterEach(() => {
		// Restore original window.wp
		const windowWithWp = global.window as Window & { wp?: any };
		if (windowWithWp && originalWp) {
			windowWithWp.wp = originalWp;
		}
		jest.clearAllMocks();
	});

	describe('basic invalidation', () => {
		it('should invalidate matching cache keys in a store', () => {
			// State has RAW keys (as stored by reducer)
			const mockState = {
				lists: {
					active: [1, 2],
					inactive: [3, 4],
				},
				listMeta: {
					active: { total: 2 },
				},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate all 'thing' list queries
			invalidate(['thing', 'list']);

			// Should call invalidate on wpk/thing store
			expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
			// dispatch.invalidate should receive RAW keys (as reducer expects)
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
				'inactive',
			]);

			// Should emit event with NORMALIZED keys
			expect(mockDoAction).toHaveBeenCalledWith('wpk.cache.invalidated', {
				keys: expect.arrayContaining([
					'thing:list:active',
					'thing:list:inactive',
				]),
			});
		});

		it('should handle exact key matches', () => {
			// State has RAW keys
			const mockState = {
				lists: {
					active: [1, 2],
					'active:page:2': [3, 4],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate specific query
			invalidate(['thing', 'list', 'active']);

			// dispatch.invalidate receives RAW keys
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
				'active:page:2',
			]);
		});

		it('should handle multiple pattern arrays', () => {
			// State has RAW keys
			const mockState = {
				lists: {
					active: [1, 2],
				},
				items: {
					'123': { id: 123 },
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate multiple patterns
			invalidate([
				['thing', 'list'],
				['thing', 'item'],
			]);

			// dispatch.invalidate receives RAW keys
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith(
				expect.arrayContaining(['active'])
			);
		});
	});

	describe('store targeting', () => {
		it('should target specific store when storeKey provided', () => {
			const mockState = {
				lists: { 'thing:list': [1, 2] },
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });

			// Should only call dispatch for specified store
			expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
			expect(mockDispatch).toHaveBeenCalledTimes(1);
		});

		it('should invalidate across all registered stores by default', () => {
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

			invalidate(['thing', 'list']);

			// Should call dispatch for all registered stores
			expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
			expect(mockDispatch).toHaveBeenCalledWith('wpk/job');
		});
	});

	describe('event emission', () => {
		it('should emit wpk.cache.invalidated event by default', () => {
			// State has RAW keys
			const mockState = {
				lists: { active: [1, 2] },
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			// Event is emitted with NORMALIZED keys
			expect(mockDoAction).toHaveBeenCalledWith(
				'wpk.cache.invalidated',
				expect.objectContaining({
					keys: expect.arrayContaining(['thing:list:active']),
				})
			);
		});

		it('should skip event emission when emitEvent is false', () => {
			const mockState = {
				lists: { 'thing:list:active': [1, 2] },
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list'], { emitEvent: false });

			expect(mockDoAction).not.toHaveBeenCalled();
		});

		it('should not emit event when no keys matched', () => {
			const mockState = {
				lists: {},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				getState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			expect(mockDoAction).not.toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should handle missing dispatch.invalidate gracefully', () => {
			const mockStoreDispatch = {}; // No invalidate method

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue({
				getState: jest.fn().mockReturnValue({
					lists: {},
					listMeta: {},
					errors: {},
				}),
			});

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();
		});

		it('should handle store dispatch errors gracefully', () => {
			mockDispatch.mockImplementation(() => {
				throw new Error('Store not registered');
			});

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();
		});

		it('should handle missing window.wp gracefully', () => {
			// Remove wp from window
			const windowWithWp = global.window as Window & { wp?: any };
			const savedWp = windowWithWp?.wp;
			if (windowWithWp) {
				delete windowWithWp.wp;
			}

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// Restore
			if (windowWithWp && savedWp) {
				windowWithWp.wp = savedWp;
			}
		});
	});

	describe('Node/test environment', () => {
		it('should handle undefined window', () => {
			// This test doesn't really apply in jsdom environment
			// Just verify the function handles null gracefully
			const windowWithWp = global.window as Window & { wp?: any };
			const savedWp = windowWithWp?.wp;
			if (windowWithWp) {
				delete windowWithWp.wp;
			}

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// Restore
			if (windowWithWp && savedWp) {
				windowWithWp.wp = savedWp;
			}
		});
	});

	describe('helper function branches', () => {
		it('should handle stores with no __getInternalState selector', () => {
			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				// No __getInternalState method
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw, just skip that store
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// invalidate should not be called since we couldn't get state
			expect(mockStoreDispatch.invalidate).not.toHaveBeenCalled();
		});

		it('should handle __getInternalState that is not a function', () => {
			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: 'not-a-function', // Wrong type
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// invalidate should not be called
			expect(mockStoreDispatch.invalidate).not.toHaveBeenCalled();
		});

		it('should handle dispatch without invalidateResolution method', () => {
			const mockState = {
				lists: {
					active: [1, 2],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
				// No invalidateResolution method
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// Should still call invalidate
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
			]);
		});

		it('should handle item keys and invalidate getItem resolution', () => {
			const mockState = {
				lists: {},
				listMeta: {},
				errors: {
					'thing:item:123': 'Some error',
				},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
				invalidateResolution: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate with pattern that matches item
			invalidate(['thing', 'item']);

			// Should call invalidate
			expect(mockStoreDispatch.invalidate).toHaveBeenCalled();

			// Should call invalidateResolution for getItem
			expect(mockStoreDispatch.invalidateResolution).toHaveBeenCalledWith(
				'getItem'
			);
		});

		it('should preserve existing listMeta mappings when already present', () => {
			const mockState = {
				lists: {
					active: [1, 2],
				},
				listMeta: {
					active: { total: 2 },
				},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			// Should still work correctly
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
			]);
		});

		it('should handle lists and listMeta with same queryKey (normalized mapping preserved)', () => {
			// When both lists and listMeta have the same key, the mapping should be preserved
			const mockState = {
				lists: {
					active: [1, 2],
				},
				listMeta: {
					active: { total: 2 }, // Same key as in lists
				},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			// Should only invalidate once per unique queryKey
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
			]);
		});

		it('should handle listMeta-only keys (lists empty)', () => {
			// When lists is empty but listMeta has keys
			const mockState = {
				lists: {}, // Empty
				listMeta: {
					active: { total: 0 }, // Has key but lists doesn't
				},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			// Should still invalidate the listMeta key
			expect(mockStoreDispatch.invalidate).toHaveBeenCalledWith([
				'active',
			]);
		});

		it('should handle empty pattern in findMatchingNormalizedKeys', () => {
			const mockState = {
				lists: {
					active: [1, 2],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Pass pattern that will result in empty normalized pattern
			invalidate([null, undefined]);

			// Should not match anything
			expect(mockStoreDispatch.invalidate).not.toHaveBeenCalled();
		});

		it('should handle matching keys that do NOT start with listPrefix (no getList invalidation)', () => {
			const mockState = {
				lists: {},
				listMeta: {},
				errors: {
					'thing:error:123': 'Some error', // Doesn't start with list or item prefix
				},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
				invalidateResolution: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// This pattern will match the error key but not trigger list/item resolution invalidation
			invalidate(['thing', 'error']);

			// Should call invalidate
			expect(mockStoreDispatch.invalidate).toHaveBeenCalled();

			// Should NOT call invalidateResolution for getList or getItem
			// because the keys don't start with list or item prefix
			expect(
				mockStoreDispatch.invalidateResolution
			).not.toHaveBeenCalled();
		});

		it('should handle error during processStoreInvalidation gracefully in development', () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'development';

			const consoleWarnSpy = jest
				.spyOn(console, 'warn')
				.mockImplementation();

			// Mock dispatch to throw an error
			mockDispatch.mockImplementation(() => {
				throw new Error('Store explosion!');
			});

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// Should log warning in development
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				`[${WPK_SUBSYSTEM_NAMESPACES.CACHE}]`,
				expect.stringContaining('Failed to invalidate cache for store'),
				expect.any(Error)
			);
			expect(console as any).toHaveWarned();

			consoleWarnSpy.mockRestore();
			process.env.NODE_ENV = originalEnv;
		});

		it('should handle error during processStoreInvalidation silently in production', () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			const consoleWarnSpy = jest
				.spyOn(console, 'warn')
				.mockImplementation();

			// Mock dispatch to throw an error
			mockDispatch.mockImplementation(() => {
				throw new Error('Store explosion!');
			});

			// Should not throw
			expect(() => {
				invalidate(['thing', 'list']);
			}).not.toThrow();

			// Should NOT log warning in production
			expect(consoleWarnSpy).not.toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
			process.env.NODE_ENV = originalEnv;
		});

		it('should skip emitting event when emitEvent is false', () => {
			const mockState = {
				lists: {
					active: [1, 2],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list'], { emitEvent: false });

			// Should call invalidate
			expect(mockStoreDispatch.invalidate).toHaveBeenCalled();

			// Should NOT emit event
			expect(mockDoAction).not.toHaveBeenCalled();
		});

		it('should skip emitting event when no keys were invalidated', () => {
			const mockState = {
				lists: {},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			invalidate(['thing', 'list']);

			// Should NOT emit event (no keys matched)
			expect(mockDoAction).not.toHaveBeenCalled();
		});

		it('should handle getMatchingStoreKeys with empty prefix', () => {
			const mockState = {
				lists: {
					active: [1, 2],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate without storeKey option (will match all registered stores)
			invalidate(['thing', 'list']);

			// Should have been called for registered stores
			expect(mockDispatch).toHaveBeenCalled();
		});

		it('should filter stores by prefix when storeKey is provided', () => {
			const mockState = {
				lists: {
					active: [1, 2],
				},
				listMeta: {},
				errors: {},
			};

			const mockStoreDispatch = {
				invalidate: jest.fn(),
			};

			const mockStoreSelect = {
				__getInternalState: jest.fn().mockReturnValue(mockState),
			};

			mockDispatch.mockReturnValue(mockStoreDispatch);
			mockSelect.mockReturnValue(mockStoreSelect);

			// Invalidate with specific storeKey (uses prefix filtering)
			invalidate(['thing', 'list'], { storeKey: 'wpk/thing' });

			// Should have been called only for the specific store
			expect(mockDispatch).toHaveBeenCalledWith('wpk/thing');
		});
	});
});

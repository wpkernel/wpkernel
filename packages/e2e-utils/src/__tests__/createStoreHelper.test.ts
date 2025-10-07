/**
 * Unit tests for createStoreHelper
 */

import type { Page } from '@playwright/test';
import { createStoreHelper } from '../createKernelUtils.js';

describe('createStoreHelper', () => {
	let mockPage: jest.Mocked<Page>;
	const storeKey = 'wpk/jobs';

	beforeEach(() => {
		mockPage = {
			evaluate: jest.fn(),
			waitForTimeout: jest.fn(),
		} as unknown as jest.Mocked<Page>;
	});

	describe('wait()', () => {
		it('should poll selector until value is truthy', async () => {
			const selector = (state: any) => state.count;

			// First poll returns undefined, second poll returns value
			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(5);

			const helper = createStoreHelper(storeKey, mockPage);
			const result = await helper.wait(selector, 1000);

			expect(result).toBe(5);
			expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
		});

		it('should return immediately if first poll succeeds', async () => {
			const selector = (state: any) => state.ready;

			mockPage.evaluate.mockResolvedValueOnce(true);

			const helper = createStoreHelper(storeKey, mockPage);
			const result = await helper.wait(selector, 1000);

			expect(result).toBe(true);
			expect(mockPage.evaluate).toHaveBeenCalledTimes(1);
			expect(mockPage.waitForTimeout).not.toHaveBeenCalled();
		});

		it('should timeout if selector never returns truthy value', async () => {
			const selector = (state: any) => state.missing;

			mockPage.evaluate.mockResolvedValue(undefined);

			const helper = createStoreHelper(storeKey, mockPage);

			// Mock time advancing
			const startTime = Date.now();
			jest.spyOn(Date, 'now')
				.mockReturnValueOnce(startTime)
				.mockReturnValueOnce(startTime + 50)
				.mockReturnValueOnce(startTime + 150);

			await expect(helper.wait(selector, 100)).rejects.toThrow(
				`Timeout waiting for store "${storeKey}" selector after 100ms`
			);

			jest.restoreAllMocks();
		});

		it('should use default timeout of 5000ms', async () => {
			const selector = (state: any) => state.missing;

			mockPage.evaluate.mockResolvedValue(undefined);

			const helper = createStoreHelper(storeKey, mockPage);

			const startTime = Date.now();
			jest.spyOn(Date, 'now')
				.mockReturnValueOnce(startTime)
				.mockReturnValueOnce(startTime + 5100);

			await expect(helper.wait(selector)).rejects.toThrow(
				`Timeout waiting for store "${storeKey}" selector after 5000ms`
			);

			jest.restoreAllMocks();
		});

		it('should surface selector errors immediately', async () => {
			const selector = () => {
				throw new Error('Selector error');
			};

			const helper = createStoreHelper(storeKey, mockPage);

			await expect(helper.wait(selector, 100)).rejects.toThrow(
				'Invalid selector: Only simple property access is supported'
			);
			expect(mockPage.evaluate).not.toHaveBeenCalled();
		});

		it('should continue polling on false/0/empty string', async () => {
			const selector = (state: any) => state.value;

			mockPage.evaluate
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(0)
				.mockResolvedValueOnce('')
				.mockResolvedValueOnce('success');

			const helper = createStoreHelper(storeKey, mockPage);
			const result = await helper.wait(selector, 500);

			expect(result).toBe('success');
			expect(mockPage.evaluate).toHaveBeenCalledTimes(4);
		});

		it('should call page.evaluate with correct arguments', async () => {
			const selector = (state: any) => state.jobs;

			mockPage.evaluate.mockResolvedValueOnce([{ id: 1 }]);

			const helper = createStoreHelper(storeKey, mockPage);
			await helper.wait(selector, 1000);

			expect(mockPage.evaluate).toHaveBeenCalledWith(
				expect.any(Function),
				{ key: storeKey, path: ['jobs'] }
			);
		});
	});

	describe('invalidate()', () => {
		it('should call store invalidateResolution', async () => {
			mockPage.evaluate.mockResolvedValue(undefined);

			const helper = createStoreHelper(storeKey, mockPage);
			await helper.invalidate();

			expect(mockPage.evaluate).toHaveBeenCalledWith(
				expect.any(Function),
				storeKey
			);
		});

		it('should throw error if store not found', async () => {
			mockPage.evaluate.mockRejectedValue(
				new Error(`Store "${storeKey}" not found`)
			);

			const helper = createStoreHelper(storeKey, mockPage);

			await expect(helper.invalidate()).rejects.toThrow(
				`Store "${storeKey}" not found`
			);
		});
	});

	describe('getState()', () => {
		it('should return entire store state', async () => {
			const mockState = {
				jobs: [
					{ id: 1, title: 'Engineer' },
					{ id: 2, title: 'Designer' },
				],
				loading: false,
			};

			mockPage.evaluate.mockResolvedValue(mockState);

			const helper = createStoreHelper(storeKey, mockPage);
			const result = await helper.getState();

			expect(result).toEqual(mockState);
			expect(mockPage.evaluate).toHaveBeenCalledWith(
				expect.any(Function),
				storeKey
			);
		});

		it('should handle undefined state', async () => {
			mockPage.evaluate.mockResolvedValue(undefined);

			const helper = createStoreHelper(storeKey, mockPage);
			const result = await helper.getState();

			expect(result).toBeUndefined();
		});

		it('should throw error if store does not exist', async () => {
			mockPage.evaluate.mockRejectedValue(
				new Error(`Store "${storeKey}" not found`)
			);

			const helper = createStoreHelper(storeKey, mockPage);

			await expect(helper.getState()).rejects.toThrow(
				`Store "${storeKey}" not found`
			);
		});
	});

	describe('type safety', () => {
		it('should infer types from generic parameter', async () => {
			interface JobState {
				jobs: Array<{ id: number; title: string }>;
				loading: boolean;
			}

			mockPage.evaluate.mockResolvedValue({
				jobs: [{ id: 1, title: 'Engineer' }],
				loading: false,
			});

			const helper = createStoreHelper<JobState>(storeKey, mockPage);
			const state = await helper.getState();

			// TypeScript should enforce that state has these properties
			expect(state.jobs).toBeDefined();
			expect(state.loading).toBe(false);
		});

		it('should type wait() selector parameter', async () => {
			interface JobState {
				jobs: Array<{ id: number; title: string }>;
			}

			mockPage.evaluate.mockResolvedValue([
				{ id: 1, title: 'Engineer' },
				{ id: 2, title: 'Designer' },
			]);

			const helper = createStoreHelper<JobState>(storeKey, mockPage);

			// Selector parameter should be typed as JobState
			const result = await helper.wait((state) => state.jobs, 1000);

			expect(result).toHaveLength(2);
			expect(result[0].title).toBe('Engineer');
		});
	});
});

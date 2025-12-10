import { processSequentially, maybeTry } from '../async-utils';

describe('async-utils', () => {
	describe('processSequentially', () => {
		it('handles async handlers in forward direction', async () => {
			const items = [1, 2, 3];
			const result: number[] = [];
			await processSequentially(items, async (item) => {
				await Promise.resolve();
				result.push(item);
			});
			expect(result).toEqual([1, 2, 3]);
		});

		it('handles async handlers in reverse direction', async () => {
			const items = [1, 2, 3];
			const result: number[] = [];
			await processSequentially(
				items,
				async (item) => {
					await Promise.resolve();
					result.push(item);
				},
				'reverse'
			);
			expect(result).toEqual([3, 2, 1]);
		});
	});

	describe('maybeTry', () => {
		it('handles sync error in run', () => {
			const result = maybeTry(
				() => {
					throw new Error('sync error');
				},
				() => 'recovered'
			);
			expect(result).toBe('recovered');
		});
	});
});

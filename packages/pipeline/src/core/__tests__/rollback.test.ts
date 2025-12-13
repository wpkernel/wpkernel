import {
	createPipelineRollback,
	runRollbackStack,
	createRollbackErrorMetadata,
} from '../rollback';
import type { PipelineRollback } from '../rollback';

describe('rollback', () => {
	describe('createPipelineRollback', () => {
		it('creates a rollback with just a run function', () => {
			const fn = jest.fn();
			const rollback = createPipelineRollback(fn);

			expect(rollback).toEqual({
				run: fn,
			});
		});

		it('creates a rollback with key and label', () => {
			const fn = jest.fn();
			const rollback = createPipelineRollback(fn, {
				key: 'test-helper',
				label: 'Clean up test state',
			});

			expect(rollback).toEqual({
				key: 'test-helper',
				label: 'Clean up test state',
				run: fn,
			});
		});
	});

	describe('createRollbackErrorMetadata', () => {
		it('extracts metadata from Error objects', () => {
			const error = new Error('fail');
			const meta = createRollbackErrorMetadata(error);
			expect(meta).toEqual({
				name: 'Error',
				message: 'fail',
				stack: expect.any(String),
				cause: undefined,
			});
		});

		it('extracts metadata from strings', () => {
			const meta = createRollbackErrorMetadata('fail');
			expect(meta).toEqual({
				message: 'fail',
			});
		});

		it('returns empty object for unknown types', () => {
			const meta = createRollbackErrorMetadata(123);
			expect(meta).toEqual({});
		});
	});

	describe('runRollbackStack', () => {
		it('executes rollbacks in reverse order', async () => {
			const order: number[] = [];
			const rollbacks: PipelineRollback[] = [
				createPipelineRollback(() => order.push(1)),
				createPipelineRollback(() => order.push(2)),
				createPipelineRollback(() => order.push(3)),
			];

			await runRollbackStack(rollbacks, { source: 'helper' });

			expect(order).toEqual([3, 2, 1]);
		});

		it('handles async rollbacks', async () => {
			const order: number[] = [];
			const rollbacks: PipelineRollback[] = [
				createPipelineRollback(async () => order.push(1)),
				createPipelineRollback(() => order.push(2)),
				createPipelineRollback(async () => order.push(3)),
			];

			await runRollbackStack(rollbacks, { source: 'helper' });

			expect(order).toEqual([3, 2, 1]);
		});

		it('calls onError callback if a rollback fails', async () => {
			const onError = jest.fn();
			const error = new Error('rollback failed');
			const rollback1 = createPipelineRollback(() => {}, {
				key: 'first',
			});
			const rollback2 = createPipelineRollback(
				() => {
					throw error;
				},
				{ key: 'second' }
			);
			const rollback3 = createPipelineRollback(() => {}, {
				key: 'third',
			});

			const rollbacks = [rollback1, rollback2, rollback3];

			await runRollbackStack(rollbacks, {
				source: 'helper',
				onError,
			});

			expect(onError).toHaveBeenCalledWith({
				error,
				entry: expect.objectContaining({ key: 'second' }),
				metadata: expect.objectContaining({
					name: 'Error',
					message: 'rollback failed',
				}),
			});
		});

		it('continues rolling back after a failure', async () => {
			const order: number[] = [];
			const error = new Error('fail');
			const rollback1 = createPipelineRollback(() => order.push(1));
			const rollback2 = createPipelineRollback(() => {
				throw error;
			});
			const rollback3 = createPipelineRollback(() => order.push(3));

			const rollbacks = [rollback1, rollback2, rollback3];

			await runRollbackStack(rollbacks, {
				source: 'helper',
				onError: jest.fn(),
			});

			// Should have executed rollback1 and rollback3 despite rollback2 failing
			expect(order).toEqual([3, 1]);
		});

		it('continues rolling back after an async failure', async () => {
			const order: number[] = [];
			const error = new Error('async fail');
			const rollback1 = createPipelineRollback(() => order.push(1));
			const rollback2 = createPipelineRollback(async () => {
				throw error;
			});
			const rollback3 = createPipelineRollback(async () => order.push(3));

			const rollbacks = [rollback1, rollback2, rollback3];

			await runRollbackStack(rollbacks, {
				source: 'helper',
				onError: jest.fn(),
			});

			// Should have executed rollback1 and rollback3 despite rollback2 failing asynchronously
			expect(order).toEqual([3, 1]);
		});

		it('handles empty rollback stack', async () => {
			const onError = jest.fn();
			await runRollbackStack([], {
				source: 'helper',
				onError,
			});

			expect(onError).not.toHaveBeenCalled();
		});

		it('distinguishes between sources in callback', async () => {
			const onError = jest.fn();
			const rollback = createPipelineRollback(() => {
				throw new Error('test');
			});

			await runRollbackStack([rollback], {
				source: 'extension',
				onError,
			});

			expect(onError).toHaveBeenCalled();
		});
	});
});

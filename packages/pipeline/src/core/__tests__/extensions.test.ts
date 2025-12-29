import {
	runExtensionHooks,
	rollbackExtensionResults,
	commitExtensionResults,
} from '../extensions';
import { createRollbackErrorMetadata } from '../rollback';
import type { ExtensionHookEntry, ExtensionHookExecution } from '../extensions';

type TestArtifact = { artifact: string };
type TestContext = Record<string, never>;
type TestOptions = Record<string, never>;

describe('extensions', () => {
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

	describe('runExtensionHooks', () => {
		it('handles sync hooks returning values', () => {
			const hook = jest.fn().mockReturnValue({
				artifact: { artifact: 'sync' },
			});
			const hooks: ExtensionHookEntry<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					key: 'sync-hook',
					lifecycle: 'after-fragments',
					hook,
				},
			];

			const result = runExtensionHooks(
				hooks,
				'after-fragments',
				{ artifact: { artifact: 'initial' } } as any,
				() => {}
			);

			expect(result).toEqual({
				artifact: { artifact: 'sync' },
				results: [
					{
						hook: hooks[0],
						result: { artifact: { artifact: 'sync' } },
					},
				],
			});
		});

		it('handles async hooks returning values', async () => {
			const hook = jest
				.fn()
				.mockResolvedValue({ artifact: { artifact: 'modified' } });
			const hooks: ExtensionHookEntry<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					key: 'async-hook',
					lifecycle: 'after-fragments',
					hook,
				},
			];

			const result = await runExtensionHooks(
				hooks,
				'after-fragments',
				{ artifact: { artifact: 'initial' } } as any,
				() => {}
			);

			expect(result.artifact).toEqual({ artifact: 'modified' });
			expect(hook).toHaveBeenCalled();
		});

		it('handles hooks returning undefined (ignored)', async () => {
			const hook = jest.fn().mockReturnValue(undefined);
			const hooks: ExtensionHookEntry<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					key: 'void-hook',
					lifecycle: 'after-fragments',
					hook,
				},
			];

			const result = await runExtensionHooks(
				hooks,
				'after-fragments',
				{ artifact: { artifact: 'initial' } } as any,
				() => {}
			);

			expect(result.artifact).toEqual({ artifact: 'initial' });
		});

		it('handles async hooks returning undefined (ignored)', async () => {
			const hook = jest.fn().mockResolvedValue(undefined);
			const hooks: ExtensionHookEntry<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					key: 'async-void-hook',
					lifecycle: 'after-fragments',
					hook,
				},
			];

			const result = await runExtensionHooks(
				hooks,
				'after-fragments',
				{ artifact: { artifact: 'initial' } } as any,
				() => {}
			);

			expect(result.artifact).toEqual({ artifact: 'initial' });
		});

		it('handles async hooks returning result without artifact', async () => {
			const hook = jest.fn().mockResolvedValue({ rollback: jest.fn() });
			const hooks: ExtensionHookEntry<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					key: 'no-artifact-hook',
					lifecycle: 'after-fragments',
					hook,
				},
			];

			const result = await runExtensionHooks(
				hooks,
				'after-fragments',
				{ artifact: { artifact: 'initial' } } as any,
				() => {}
			);

			expect(result.artifact).toEqual({ artifact: 'initial' });
			expect(hook).toHaveBeenCalled();
		});

		it('rolls back previously executed hooks if a hook throws', async () => {
			const rollback1 = jest.fn();
			const hook1 = jest.fn().mockReturnValue({ rollback: rollback1 });
			const hook2 = jest.fn().mockImplementation(() => {
				throw new Error('boom');
			});

			const hooks: ExtensionHookEntry<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{ key: 'h1', lifecycle: 'after-fragments', hook: hook1 },
				{ key: 'h2', lifecycle: 'after-fragments', hook: hook2 },
			];

			const onRollbackError = jest.fn();

			await expect(async () => {
				await runExtensionHooks(
					hooks,
					'after-fragments',
					{ artifact: { artifact: 'init' } } as any,
					onRollbackError
				);
			}).rejects.toThrow('boom');

			expect(rollback1).toHaveBeenCalled();
		});
	});

	describe('rollbackExtensionResults', () => {
		it('handles async rollbacks', async () => {
			const rollback = jest.fn().mockResolvedValue(undefined);
			const results: ExtensionHookExecution<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					hook: { key: 'hook1' } as any,
					result: { rollback },
				},
			];

			await rollbackExtensionResults(
				results,
				[{ key: 'hook1' } as any],
				() => {}
			);

			expect(rollback).toHaveBeenCalled();
		});

		it('calls onRollbackError if rollback fails', async () => {
			const error = new Error('rollback fail');
			const rollback = jest.fn().mockRejectedValue(error);
			const results: ExtensionHookExecution<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					hook: { key: 'hook1' } as any,
					result: { rollback },
				},
			];

			const onRollbackError = jest.fn();

			await rollbackExtensionResults(
				results,
				[{ key: 'hook1' } as any],
				onRollbackError
			);

			expect(onRollbackError).toHaveBeenCalledWith(
				expect.objectContaining({
					error,
					extensionKeys: ['hook1'],
				})
			);
		});

		it('handles sync rollbacks', () => {
			const rollback = jest.fn();
			const results: ExtensionHookExecution<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					hook: { key: 'hook1' } as any,
					result: { rollback },
				},
			];

			const outcome = rollbackExtensionResults(
				results,
				[{ key: 'hook1' } as any],
				() => {}
			);

			expect(outcome).toBeUndefined();
			expect(rollback).toHaveBeenCalled();
		});
	});

	describe('commitExtensionResults', () => {
		it('handles async commits', async () => {
			const commit = jest.fn().mockResolvedValue(undefined);
			const results: ExtensionHookExecution<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					hook: { key: 'hook1' } as any,
					result: { commit },
				},
			];

			await commitExtensionResults(results);

			expect(commit).toHaveBeenCalled();
		});

		it('handles sync commits', () => {
			const commit = jest.fn();
			const results: ExtensionHookExecution<
				TestContext,
				TestOptions,
				TestArtifact
			>[] = [
				{
					hook: { key: 'hook1' } as any,
					result: { commit },
				},
			];

			const outcome = commitExtensionResults(results);

			expect(outcome).toBeUndefined();
			expect(commit).toHaveBeenCalled();
		});
	});
});

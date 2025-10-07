import { definePolicy } from '../define';
import { createPolicyProxy } from '../context';
import type { PolicyHelpers, PolicyRule } from '../types';
import { KernelError } from '../../error/KernelError';
import { PolicyDeniedError } from '../../error/PolicyDeniedError';

describe('policy module', () => {
	beforeAll(() => {
		(
			globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
		).IS_REACT_ACT_ENVIRONMENT = true;
	});

	afterAll(() => {
		delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
			.IS_REACT_ACT_ENVIRONMENT;
	});

	beforeEach(() => {
		delete (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown })
			.__WP_KERNEL_ACTION_RUNTIME__;
	});

	afterEach(() => {
		delete (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown })
			.__WP_KERNEL_ACTION_RUNTIME__;
	});

	it('evaluates synchronous policies', () => {
		const policy = definePolicy<{
			'tasks.manage': void;
			'tasks.delete': void;
		}>({
			'tasks.manage': () => true,
			'tasks.delete': () => false,
		});

		expect(policy.can('tasks.manage')).toBe(true);
		expect(policy.can('tasks.delete')).toBe(false);
	});

	it('caches asynchronous evaluations', async () => {
		let hits = 0;
		const policy = definePolicy<{
			'tasks.async': void;
		}>({
			'tasks.async': async () => {
				hits += 1;
				return hits < 2;
			},
		});

		const first = await policy.can('tasks.async');
		expect(first).toBe(true);
		const second = await policy.can('tasks.async');
		expect(second).toBe(true);
		expect(hits).toBe(1);
	});

	it('throws KernelError with messageKey and emits events when denied', async () => {
		const hooks = window.wp?.hooks as { doAction?: jest.Mock } | undefined;
		expect(hooks?.doAction).toBeDefined();
		const doAction = hooks!.doAction!;
		doAction.mockImplementation(() => undefined);

		const policy = definePolicy<{
			'tasks.manage': void;
		}>(
			{
				'tasks.manage': () => false,
			},
			{ namespace: 'acme' }
		);

		expect(() => policy.assert('tasks.manage')).toThrow(PolicyDeniedError);
		try {
			policy.assert('tasks.manage');
		} catch (error) {
			const err = error as PolicyDeniedError;
			expect(err.code).toBe('PolicyDenied');
			expect(err.messageKey).toBe('policy.denied.acme.tasks.manage');
		}

		expect(doAction).toHaveBeenCalledWith(
			'acme.policy.denied',
			expect.objectContaining({
				policyKey: 'tasks.manage',
				messageKey: 'policy.denied.acme.tasks.manage',
			})
		);
	});

	it('extend overrides rules and invalidates cache', async () => {
		const policy = definePolicy<{
			'tasks.manage': void;
		}>({
			'tasks.manage': async () => true,
		});

		await expect(policy.can('tasks.manage')).resolves.toBe(true);
		expect(policy.cache.get('tasks.manage::void')).toBe(true);

		const warn = jest.spyOn(console, 'warn').mockImplementation();
		policy.extend({
			'tasks.manage': async () => false,
		});
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();

		expect(policy.cache.get('tasks.manage::void')).toBeUndefined();
		await expect(policy.can('tasks.manage')).resolves.toBe(false);
	});

	it('proxy injects request context for action assertions', async () => {
		const hooks = window.wp?.hooks as { doAction?: jest.Mock } | undefined;
		expect(hooks?.doAction).toBeDefined();
		const doAction = hooks!.doAction!;
		doAction.mockImplementation(() => undefined);

		const policy = definePolicy<{
			'tasks.manage': void;
		}>(
			{
				'tasks.manage': () => false,
			},
			{ namespace: 'acme' }
		) as PolicyHelpers<Record<string, unknown>>;

		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy,
			bridge: {
				emit: jest.fn(),
			},
		};
		const bridgeEmit = (
			global.__WP_KERNEL_ACTION_RUNTIME__ as {
				bridge: { emit: jest.Mock };
			}
		).bridge.emit;

		const proxy = createPolicyProxy({
			actionName: 'Task.Update',
			requestId: 'req-1',
			namespace: 'acme',
			scope: 'crossTab',
			bridged: true,
		});

		expect(() => proxy.assert('tasks.manage', undefined)).toThrow(
			KernelError
		);
		expect(doAction).toHaveBeenCalledWith(
			'acme.policy.denied',
			expect.objectContaining({
				requestId: 'req-1',
			})
		);
		expect(bridgeEmit).toHaveBeenCalledWith(
			'acme.bridge.policy.denied',
			expect.objectContaining({ policyKey: 'tasks.manage' }),
			expect.objectContaining({ requestId: 'req-1' })
		);
	});

	it('throws a developer error when accessing unknown policy keys', () => {
		const policy = definePolicy<{ 'tasks.manage': void }>({
			'tasks.manage': () => true,
		});

		expect(() => policy.can('tasks.delete' as never)).toThrow(KernelError);
	});

	it('reuses in-flight promises for async policy evaluations', async () => {
		let resolveFn: ((value: boolean) => void) | undefined;
		const asyncRule = jest.fn(
			() =>
				new Promise<boolean>((resolve) => {
					resolveFn = resolve;
				})
		);
		const policy = definePolicy<{ 'tasks.async': void }>({
			'tasks.async': asyncRule,
		});

		const first = policy.can('tasks.async');
		const second = policy.can('tasks.async');
		expect(first).toBe(second);
		resolveFn?.(true);
		await expect(first).resolves.toBe(true);
		expect(asyncRule).toHaveBeenCalledTimes(1);
	});

	it('clears in-flight cache when async rules reject', async () => {
		const asyncRule = jest
			.fn<Promise<boolean>, Parameters<PolicyRule<void>>>()
			.mockRejectedValueOnce(new Error('fail'))
			.mockResolvedValueOnce(true);

		const policy = definePolicy<{ 'tasks.async': void }>({
			'tasks.async': asyncRule,
		});

		await expect(policy.can('tasks.async')).rejects.toThrow('fail');
		await expect(policy.can('tasks.async')).resolves.toBe(true);
		expect(asyncRule).toHaveBeenCalledTimes(2);
	});
});

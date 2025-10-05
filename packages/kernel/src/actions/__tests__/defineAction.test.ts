import { defineAction } from '../define';
import * as cache from '../../resource/cache';
import { KernelError } from '../../error/KernelError';

describe('defineAction', () => {
	let originalRuntime: typeof global.__WP_KERNEL_ACTION_RUNTIME__;
	let doAction: jest.Mock;

	beforeEach(() => {
		originalRuntime = global.__WP_KERNEL_ACTION_RUNTIME__;
		doAction = jest.fn();
		const windowWithWp = window as Window & {
			wp?: {
				data?: unknown;
				hooks?: { doAction: jest.Mock };
			};
		};
		const existingWp = windowWithWp.wp || {};
		(window as unknown as { wp?: unknown }).wp = {
			...existingWp,
			hooks: { doAction } as unknown,
			data: existingWp.data,
		};

		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			reporter: {
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				debug: jest.fn(),
			},
			policy: {
				assert: jest.fn(),
				can: jest.fn().mockReturnValue(true),
			},
			jobs: {
				enqueue: jest.fn().mockResolvedValue(undefined),
				wait: jest.fn().mockResolvedValue('done'),
			},
		};
	});

	afterEach(() => {
		global.__WP_KERNEL_ACTION_RUNTIME__ = originalRuntime;
	});

	it('executes the action and emits lifecycle and domain events', async () => {
		const invalidateSpy = jest
			.spyOn(cache, 'invalidate')
			.mockImplementation(() => undefined);

		const action = defineAction<{ title: string }, { id: number }>(
			'Thing.Create',
			async (ctx, args) => {
				expect(args).toEqual({ title: 'Example' });
				expect(ctx.requestId).toMatch(/^act_/);
				expect(ctx.namespace).toBe('wpk');
				expect(ctx.policy.can('things.manage', undefined)).toBe(true);
				ctx.policy.assert('things.manage', undefined);
				await ctx.jobs.enqueue('IndexThing', { id: 1 });
				await ctx.jobs.wait('IndexThing', { id: 1 });
				ctx.reporter.info('creating thing');
				ctx.emit('wpk.thing.created', { id: 1 });
				ctx.invalidate(['thing', 'list']);
				return { id: 1 };
			}
		);

		const result = await action({ title: 'Example' });

		expect(result).toEqual({ id: 1 });
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.start',
			expect.objectContaining({ actionName: 'Thing.Create' })
		);
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.complete',
			expect.objectContaining({
				actionName: 'Thing.Create',
				result: { id: 1 },
			})
		);
		expect(doAction).toHaveBeenCalledWith('wpk.thing.created', { id: 1 });
		expect(invalidateSpy).toHaveBeenCalledWith(
			['thing', 'list'],
			undefined
		);

		const runtime = global.__WP_KERNEL_ACTION_RUNTIME__!;
		expect(runtime.jobs?.enqueue).toHaveBeenCalledWith('IndexThing', {
			id: 1,
		});
		expect(runtime.jobs?.wait).toHaveBeenCalledWith('IndexThing', {
			id: 1,
		});
		expect(runtime.policy?.assert).toHaveBeenCalledWith(
			'things.manage',
			undefined
		);

		invalidateSpy.mockRestore();
	});

	it('wraps thrown errors and emits error lifecycle event', async () => {
		const action = defineAction('Thing.Fail', async () => {
			throw new Error('boom');
		});

		await expect(action(undefined as never)).rejects.toBeInstanceOf(
			KernelError
		);

		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.objectContaining({
				actionName: 'Thing.Fail',
				error: expect.any(KernelError),
			})
		);
	});

	it('marks tabLocal actions as non-bridged', async () => {
		const action = defineAction('Thing.Local', async () => ({ ok: true }), {
			scope: 'tabLocal',
			bridged: true,
		});

		expect(action.options.scope).toBe('tabLocal');
		expect(action.options.bridged).toBe(false);
	});

	it('does not emit lifecycle events to bridge when bridged is false', async () => {
		const bridgeEmit = jest.fn();
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			...global.__WP_KERNEL_ACTION_RUNTIME__!,
			bridge: { emit: bridgeEmit },
		};

		const action = defineAction(
			'Thing.NoBridge',
			async () => ({ ok: true }),
			{
				bridged: false,
			}
		);

		await action(undefined as never);

		// Should emit to hooks
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.start',
			expect.objectContaining({ actionName: 'Thing.NoBridge' })
		);
		expect(doAction).toHaveBeenCalledWith(
			'wpk.action.complete',
			expect.objectContaining({ actionName: 'Thing.NoBridge' })
		);

		// Should NOT emit to bridge
		expect(bridgeEmit).not.toHaveBeenCalled();
	});
});

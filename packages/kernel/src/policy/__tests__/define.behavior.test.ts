import { type PolicyDeniedError } from '../../error/PolicyDeniedError';
import { withPolicyRequestContext } from '../context';
import type { ActionRuntime } from '../../actions/types';
import type { definePolicy as definePolicyFn } from '../define';

type DefinePolicy = typeof definePolicyFn;

async function loadDefinePolicy(): Promise<DefinePolicy> {
	jest.resetModules();
	const module = await import('../define');
	return module.definePolicy;
}

describe('definePolicy behaviour', () => {
	const originalBroadcastChannel = window.BroadcastChannel;

	beforeEach(() => {
		delete global.__WP_KERNEL_ACTION_RUNTIME__;
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: originalBroadcastChannel,
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(() => {
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: originalBroadcastChannel,
		});
	});

	it('uses WordPress canUser fallback when adapters are not provided', async () => {
		const canUser = jest.fn(() => true);
		const select = window.wp?.data?.select as jest.Mock | undefined;
		expect(select).toBeDefined();
		select!.mockImplementation(() => ({ canUser }));

		const definePolicy = await loadDefinePolicy();
		const policy = definePolicy<{ 'content.read': { path: string } }>({
			'content.read': (context, resource) =>
				context.adapters.wp?.canUser?.('read', resource) ?? false,
		});

		const outcome = policy.can('content.read', { path: '/api' });
		if (outcome instanceof Promise) {
			await expect(outcome).resolves.toBe(true);
		} else {
			expect(outcome).toBe(true);
		}
		expect(select).toHaveBeenCalledWith('core');
		expect(canUser).toHaveBeenCalledWith('read', { path: '/api' });
		select!.mockReset();
	});

	it('warns when WordPress canUser invocation fails', async () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		const select = window.wp?.data?.select as jest.Mock | undefined;
		expect(select).toBeDefined();
		select!.mockImplementation(() => {
			throw new Error('select failed');
		});

		const definePolicy = await loadDefinePolicy();
		const policy = definePolicy<{ 'content.read': { path: string } }>(
			{
				'content.read': (context, resource) =>
					context.adapters.wp?.canUser?.('read', resource) ?? false,
			},
			{ debug: true }
		);

		const outcome = policy.can('content.read', { path: '/api' });
		if (outcome instanceof Promise) {
			await expect(outcome).resolves.toBe(false);
		} else {
			expect(outcome).toBe(false);
		}
		expect(warn).toHaveBeenCalledWith(
			'[wp-kernel][policy] Failed to invoke wp.data.select("core").canUser',
			expect.objectContaining({ error: expect.any(Error) })
		);
		select!.mockReset();
	});

	it('falls back to false when WordPress canUser is unavailable', async () => {
		const select = window.wp?.data?.select as jest.Mock | undefined;
		expect(select).toBeDefined();

		select!.mockImplementation(() => ({}));
		try {
			const definePolicy = await loadDefinePolicy();
			const policy = definePolicy<{ 'content.read': { path: string } }>({
				'content.read': (context, resource) =>
					context.adapters.wp?.canUser?.('read', resource) ?? false,
			});

			const outcome = policy.can('content.read', { path: '/api' });
			if (outcome instanceof Promise) {
				await expect(outcome).resolves.toBe(false);
				return;
			}
			expect(outcome).toBe(false);
		} finally {
			select!.mockReset();
		}
	});

	it('enforces boolean return values from rules', async () => {
		const definePolicy = await loadDefinePolicy();
		const policy = definePolicy<{ 'content.read': void }>({
			'content.read': () => 'yes' as unknown as boolean,
		});

		expect(() => policy.can('content.read')).toThrow(
			'Policy "content.read" must return a boolean. Received string.'
		);
	});

	it('emits denial events for async assertions', async () => {
		const doAction = window.wp?.hooks?.doAction as jest.Mock | undefined;
		expect(doAction).toBeDefined();

		class CapturingChannel {
			public static instance: CapturingChannel | undefined;
			public messages: unknown[] = [];
			public onmessage: ((event: MessageEvent) => void) | null = null;

			public constructor(public name: string) {
				CapturingChannel.instance = this;
			}

			public postMessage(message: unknown) {
				this.messages.push(message);
			}

			public close() {}
		}

		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: CapturingChannel,
		});

		const definePolicy = await loadDefinePolicy();
		const policy = definePolicy<{ 'content.delete': void }>({
			'content.delete': async () => false,
		});

		await expect(policy.assert('content.delete')).rejects.toMatchObject({
			code: 'PolicyDenied',
		});
		expect(doAction).toHaveBeenCalledWith(
			'wpk.policy.denied',
			expect.objectContaining({ policyKey: 'content.delete' })
		);
		expect(CapturingChannel.instance?.messages[0]).toEqual(
			expect.objectContaining({
				type: 'policy.denied',
				namespace: 'wpk',
			})
		);
	});

	it('skips WordPress hook emission when hooks are unavailable', async () => {
		const hooks = window.wp?.hooks as { doAction?: jest.Mock } | undefined;
		const originalDoAction = hooks?.doAction;
		if (hooks) {
			delete hooks.doAction;
		}

		try {
			const definePolicy = await loadDefinePolicy();
			const policy = definePolicy<{ deny: void }>({ deny: () => false });

			try {
				policy.assert('deny');
				throw new Error('expected policy assertion to throw');
			} catch (error) {
				expect((error as { code?: string }).code).toBe('PolicyDenied');
			}
		} finally {
			if (hooks) {
				hooks.doAction =
					originalDoAction ?? (jest.fn() as unknown as jest.Mock);
			}
		}
	});

	it('registers helpers on existing action runtime', async () => {
		const runtime: ActionRuntime = { policy: {} };
		global.__WP_KERNEL_ACTION_RUNTIME__ = runtime;

		const definePolicy = await loadDefinePolicy();
		const policy = definePolicy<{ 'content.read': void }>({
			'content.read': () => true,
		});

		expect(global.__WP_KERNEL_ACTION_RUNTIME__).toBe(runtime);
		expect(global.__WP_KERNEL_ACTION_RUNTIME__?.policy?.can).toBeDefined();
		const outcome = policy.can('content.read');
		if (outcome instanceof Promise) {
			await expect(outcome).resolves.toBe(true);
		} else {
			expect(outcome).toBe(true);
		}
	});

	it('builds denial context with request data and params', async () => {
		expect.assertions(2);
		const definePolicy = await loadDefinePolicy();
		const policy = definePolicy<{ 'content.update': { reason: string } }>(
			{
				'content.update': () => false,
			},
			{ namespace: 'acme' }
		);

		try {
			withPolicyRequestContext(
				{
					actionName: 'Action.Update',
					requestId: 'req-123',
					namespace: 'acme',
					scope: 'crossTab',
					bridged: false,
				},
				() => policy.assert('content.update', { reason: 'missing' })
			);
		} catch (error) {
			const err = error as PolicyDeniedError;
			expect(err.messageKey).toBe('policy.denied.acme.content.update');
			expect(err.context).toEqual(
				expect.objectContaining({
					policyKey: 'content.update',
					reason: 'missing',
				})
			);
		}
	});

	it('logs BroadcastChannel creation failures', async () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: jest.fn(() => {
				throw new Error('channel failed');
			}),
		});

		const definePolicy = await loadDefinePolicy();
		const policy = definePolicy<{ deny: void }>({ deny: () => false });

		try {
			policy.assert('deny');
			throw new Error('expected policy assertion to throw');
		} catch (error) {
			expect((error as { code?: string }).code).toBe('PolicyDenied');
		}
		expect(warn).toHaveBeenCalledWith(
			'[wp-kernel] Failed to create BroadcastChannel for policy events.',
			expect.any(Error)
		);
	});

	it('warns when extending an existing policy key', async () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);

		const definePolicy = await loadDefinePolicy();
		const policy = definePolicy<{ allow: void }>({ allow: () => true });

		policy.extend({ allow: () => false });
		expect(warn).toHaveBeenCalledWith(
			'Policy "allow" is being overridden via extend().'
		);
	});
});

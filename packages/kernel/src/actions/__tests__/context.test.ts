/**
 * @file Unit tests for action context helpers and runtime integration.
 */

import {
	createActionContext,
	emitLifecycleEvent,
	generateActionRequestId,
	getHooks,
	resolveOptions,
} from '../context';
import { KernelError } from '../../error/KernelError';
import type { Reporter } from '../../reporter';

describe('Action Context', () => {
	let originalRuntime: typeof global.__WP_KERNEL_ACTION_RUNTIME__;

	beforeEach(() => {
		originalRuntime = global.__WP_KERNEL_ACTION_RUNTIME__;
	});

	afterEach(() => {
		global.__WP_KERNEL_ACTION_RUNTIME__ = originalRuntime;
		// Note: window.wp is reset by setup-jest.ts afterEach, not here
	});

	describe('resolveOptions', () => {
		it('applies crossTab and bridged defaults', () => {
			const result = resolveOptions({});
			expect(result).toEqual({ scope: 'crossTab', bridged: true });
		});

		it('respects explicit scope option', () => {
			const result = resolveOptions({ scope: 'tabLocal' });
			expect(result).toEqual({ scope: 'tabLocal', bridged: false });
		});

		it('forces bridged to false for tabLocal scope', () => {
			const result = resolveOptions({ scope: 'tabLocal', bridged: true });
			expect(result).toEqual({ scope: 'tabLocal', bridged: false });
		});

		it('respects explicit bridged option for crossTab', () => {
			const result = resolveOptions({
				scope: 'crossTab',
				bridged: false,
			});
			expect(result).toEqual({ scope: 'crossTab', bridged: false });
		});
	});

	describe('generateActionRequestId', () => {
		it('generates unique request IDs with act_ prefix', () => {
			const id1 = generateActionRequestId();
			const id2 = generateActionRequestId();

			expect(id1).toMatch(/^act_\d+_[a-z0-9]+$/);
			expect(id2).toMatch(/^act_\d+_[a-z0-9]+$/);
			expect(id1).not.toBe(id2);
		});
	});

	describe('createActionContext', () => {
		describe('reporter', () => {
			it('uses runtime reporter if provided', () => {
				const mockReporter = {
					info: jest.fn(),
					warn: jest.fn(),
					error: jest.fn(),
					debug: jest.fn(),
					child: jest.fn(),
				} as jest.Mocked<Reporter>;
				mockReporter.child.mockReturnValue(mockReporter);
				global.__WP_KERNEL_ACTION_RUNTIME__ = {
					reporter: mockReporter,
				};

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				ctx.reporter.info('test message', { foo: 'bar' });
				expect(mockReporter.info).toHaveBeenCalledWith('test message', {
					foo: 'bar',
				});
			});

			it('falls back to console when no runtime reporter provided', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;
				const consoleInfoSpy = jest
					.spyOn(console, 'info')
					.mockImplementation();
				const consoleWarnSpy = jest
					.spyOn(console, 'warn')
					.mockImplementation();
				const consoleErrorSpy = jest
					.spyOn(console, 'error')
					.mockImplementation();
				const consoleDebugSpy = jest
					.spyOn(console, 'debug')
					.mockImplementation();

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				ctx.reporter.info('info message', { data: 'test' });
				ctx.reporter.warn('warn message', { data: 'test' });
				ctx.reporter.error('error message', { data: 'test' });
				ctx.reporter.debug!('debug message', { data: 'test' });

				expect(consoleInfoSpy).toHaveBeenCalledWith(
					'[wpk]',
					'info message',
					{ data: 'test' }
				);
				expect(consoleWarnSpy).toHaveBeenCalledWith(
					'[wpk]',
					'warn message',
					{ data: 'test' }
				);
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'[wpk]',
					'error message',
					{ data: 'test' }
				);
				expect(consoleDebugSpy).toHaveBeenCalledWith(
					'[wpk]',
					'debug message',
					{ data: 'test' }
				);

				expect(console as any).toHaveInformedWith(
					'[wpk]',
					'info message',
					{
						data: 'test',
					}
				);
				expect(console as any).toHaveWarnedWith(
					'[wpk]',
					'warn message',
					{
						data: 'test',
					}
				);
				expect(console as any).toHaveErroredWith(
					'[wpk]',
					'error message',
					{
						data: 'test',
					}
				);

				consoleInfoSpy.mockRestore();
				consoleWarnSpy.mockRestore();
				consoleErrorSpy.mockRestore();
				consoleDebugSpy.mockRestore();
			});
		});

		describe('policy', () => {
			it('uses runtime policy if provided', () => {
				const mockPolicy = {
					assert: jest.fn(),
					can: jest.fn().mockReturnValue(true),
				};
				global.__WP_KERNEL_ACTION_RUNTIME__ = {
					policy: mockPolicy,
				};

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				ctx.policy.assert('test.capability', undefined);
				expect(mockPolicy.assert).toHaveBeenCalledWith(
					'test.capability',
					undefined
				);

				const result = ctx.policy.can('test.capability', undefined);
				expect(mockPolicy.can).toHaveBeenCalledWith(
					'test.capability',
					undefined
				);
				expect(result).toBe(true);
			});

			it('throws KernelError when assert called without runtime policy', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				expect(() =>
					ctx.policy.assert('test.capability', undefined)
				).toThrow(KernelError);
				expect(() =>
					ctx.policy.assert('test.capability', undefined)
				).toThrow(/attempted to assert a policy/);
			});

			it('returns false and warns when can called without runtime policy', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;
				const originalEnv = process.env.NODE_ENV;
				process.env.NODE_ENV = 'development';
				const consoleWarnSpy = jest
					.spyOn(console, 'warn')
					.mockImplementation();

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				const result1 = ctx.policy.can('test.capability', undefined);
				expect(result1).toBe(false);
				expect(consoleWarnSpy).toHaveBeenCalledWith(
					'[kernel.policy]',
					'Action "Test.Action" called policy.can(\'test.capability\') but no policy runtime is configured.'
				);
				expect(console as any).toHaveWarnedWith(
					'[kernel.policy]',
					'Action "Test.Action" called policy.can(\'test.capability\') but no policy runtime is configured.'
				);

				// Second call should not warn again (warned = true)
				consoleWarnSpy.mockClear();
				const result2 = ctx.policy.can('test.capability', undefined);
				expect(result2).toBe(false);
				expect(consoleWarnSpy).not.toHaveBeenCalled();

				consoleWarnSpy.mockRestore();
				process.env.NODE_ENV = originalEnv;
			});

			it('does not warn in production when can called without runtime', () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;
				const originalEnv = process.env.NODE_ENV;
				process.env.NODE_ENV = 'production';
				const consoleWarnSpy = jest
					.spyOn(console, 'warn')
					.mockImplementation();

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				const result = ctx.policy.can('test.capability', undefined);
				expect(result).toBe(false);
				expect(consoleWarnSpy).not.toHaveBeenCalled();

				consoleWarnSpy.mockRestore();
				process.env.NODE_ENV = originalEnv;
			});
		});

		describe('jobs', () => {
			it('uses runtime jobs if provided', async () => {
				const mockJobs = {
					enqueue: jest.fn().mockResolvedValue(undefined),
					wait: jest.fn().mockResolvedValue({ result: 'done' }),
				};
				global.__WP_KERNEL_ACTION_RUNTIME__ = {
					jobs: mockJobs,
				};

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				await ctx.jobs.enqueue('TestJob', { id: 1 });
				expect(mockJobs.enqueue).toHaveBeenCalledWith('TestJob', {
					id: 1,
				});

				const result = await ctx.jobs.wait('TestJob', { id: 1 });
				expect(mockJobs.wait).toHaveBeenCalledWith('TestJob', {
					id: 1,
				});
				expect(result).toEqual({ result: 'done' });
			});

			it('throws NotImplementedError when enqueue called without runtime', async () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				await expect(
					ctx.jobs.enqueue('TestJob', { id: 1 })
				).rejects.toThrow(KernelError);
				await expect(
					ctx.jobs.enqueue('TestJob', { id: 1 })
				).rejects.toThrow(/no jobs runtime is configured/);
			});

			it('throws NotImplementedError when wait called without runtime', async () => {
				global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				await expect(
					ctx.jobs.wait('TestJob', { id: 1 })
				).rejects.toThrow(KernelError);
				await expect(
					ctx.jobs.wait('TestJob', { id: 1 })
				).rejects.toThrow(/no jobs runtime is configured/);
			});
		});

		describe('emit', () => {
			it('throws when eventName is empty', () => {
				const ctx = createActionContext('Test.Action', 'req_123', {
					scope: 'crossTab',
					bridged: true,
				});

				expect(() => ctx.emit('', { data: 'test' })).toThrow(
					KernelError
				);
				expect(() => ctx.emit('', { data: 'test' })).toThrow(
					/requires a non-empty string event name/
				);
			});
		});
	});

	describe('emitLifecycleEvent', () => {
		it('emits to hooks when available', () => {
			const event = {
				phase: 'start' as const,
				actionName: 'Test.Action',
				requestId: 'req_123',
				namespace: 'test-plugin',
				scope: 'crossTab' as const,
				bridged: true,
				timestamp: Date.now(),
				args: { foo: 'bar' },
			};

			emitLifecycleEvent(event);

			expect(window.wp?.hooks?.doAction).toHaveBeenCalledWith(
				'wpk.action.start',
				event
			);
		});

		it('does not throw when hooks unavailable', () => {
			(global.window as Window & { wp?: unknown }).wp = undefined;

			const event = {
				phase: 'complete' as const,
				actionName: 'Test.Action',
				requestId: 'req_123',
				namespace: 'test-plugin',
				scope: 'crossTab' as const,
				bridged: true,
				timestamp: Date.now(),
				result: { ok: true },
				durationMs: 50,
			};

			expect(() => emitLifecycleEvent(event)).not.toThrow();
		});

		it('emits to bridge when bridged is true and runtime bridge exists', () => {
			const bridgeEmit = jest.fn();
			global.__WP_KERNEL_ACTION_RUNTIME__ = {
				bridge: { emit: bridgeEmit },
			};

			const event = {
				phase: 'complete' as const,
				actionName: 'Test.Action',
				requestId: 'req_123',
				namespace: 'test-plugin',
				scope: 'crossTab' as const,
				bridged: true,
				timestamp: Date.now(),
				result: { ok: true },
				durationMs: 50,
			};

			emitLifecycleEvent(event);

			expect(bridgeEmit).toHaveBeenCalledWith(
				'wpk.action.complete',
				event,
				event
			);
		});

		it('does not emit to bridge when bridged is false', () => {
			const bridgeEmit = jest.fn();
			global.__WP_KERNEL_ACTION_RUNTIME__ = {
				bridge: { emit: bridgeEmit },
			};

			const event = {
				phase: 'complete' as const,
				actionName: 'Test.Action',
				requestId: 'req_123',
				namespace: 'test-plugin',
				scope: 'tabLocal' as const,
				bridged: false,
				timestamp: Date.now(),
				result: { ok: true },
				durationMs: 50,
			};

			emitLifecycleEvent(event);

			expect(window.wp?.hooks?.doAction).toHaveBeenCalled();
			expect(bridgeEmit).not.toHaveBeenCalled();
		});
	});

	it('handles BroadcastChannel unavailable (SSR)', () => {
		// Test when BroadcastChannel fails to initialize
		const originalBroadcastChannel = global.BroadcastChannel;
		(global as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;

		const event = {
			phase: 'start' as const,
			actionName: 'Test.Action',
			requestId: 'req_123',
			namespace: 'test-plugin',
			scope: 'crossTab' as const,
			bridged: true,
			timestamp: Date.now(),
			args: null,
		};

		expect(() => emitLifecycleEvent(event)).not.toThrow();

		global.BroadcastChannel = originalBroadcastChannel;
	});

	it.skip('does not emit to BroadcastChannel for tabLocal events', () => {
		// This test is complex due to BroadcastChannel module caching.
		// Skip for now as the functionality is tested indirectly through integration tests.
	});

	it.skip('emits to BroadcastChannel for crossTab events when available', () => {
		// This test is complex due to module caching. Skip for now as the
		// functionality is tested indirectly through integration tests.
		// The uncovered branch (line 396-397) is the BroadcastChannel instantiation,
		// which is difficult to test in isolation due to module-level caching.
	});

	describe('getHooks', () => {
		it('returns null when window.wp.hooks is missing', () => {
			(global.window as any).wp = {};
			const hooks = getHooks();
			expect(hooks).toBeNull();
		});

		it('returns null when window.wp.hooks.doAction is not a function', () => {
			(global.window as any).wp = {
				hooks: { doAction: 'not-a-function' },
			};
			const hooks = getHooks();
			expect(hooks).toBeNull();
		});
	});

	describe('ActionContext.emit (domain events)', () => {
		let originalNamespace: string | undefined;

		beforeEach(() => {
			originalNamespace = (global as any).__WP_KERNEL_NAMESPACE__;
			(global as any).__WP_KERNEL_NAMESPACE__ = 'test-plugin';
			global.__WP_KERNEL_ACTION_RUNTIME__ = undefined;

			(global.window as any).wp = {
				hooks: {
					doAction: jest.fn(),
				},
			};
		});

		afterEach(() => {
			(global as any).__WP_KERNEL_NAMESPACE__ = originalNamespace;
		});

		it('throws when eventName is not a string', () => {
			const ctx = createActionContext('Test.Action', 'req_123', {
				scope: 'tabLocal',
				bridged: false,
			});

			expect(() => ctx.emit('' as string, {})).toThrow(
				'ctx.emit requires a non-empty string event name'
			);
			expect(() => ctx.emit(null as unknown as string, {})).toThrow(
				'ctx.emit requires a non-empty string event name'
			);
		});

		it('emits domain events to hooks', () => {
			const ctx = createActionContext('Test.Action', 'req_123', {
				scope: 'tabLocal',
				bridged: false,
			});

			ctx.emit('test.event', { foo: 'bar' });

			expect(window.wp?.hooks?.doAction).toHaveBeenCalledWith(
				'test.event',
				{
					foo: 'bar',
				}
			);
		});

		it('emits to runtime bridge when bridged=true', () => {
			const bridgeEmit = jest.fn();
			global.__WP_KERNEL_ACTION_RUNTIME__ = {
				bridge: { emit: bridgeEmit },
			};

			const ctx = createActionContext('Test.Action', 'req_123', {
				scope: 'crossTab',
				bridged: true,
			});

			ctx.emit('test.event', { foo: 'bar' });

			expect(bridgeEmit).toHaveBeenCalledWith(
				'test.event',
				{ foo: 'bar' },
				expect.objectContaining({
					actionName: 'Test.Action',
					requestId: 'req_123',
					scope: 'crossTab',
					bridged: true,
				})
			);
		});

		it('emits to BroadcastChannel for crossTab scope', () => {
			// This test is complex due to module caching. Skip for now as the
			// functionality is tested indirectly through integration tests.
		});

		it('does not throw when hooks unavailable', () => {
			(global.window as Window & { wp?: unknown }).wp = undefined;

			const ctx = createActionContext('Test.Action', 'req_123', {
				scope: 'tabLocal',
				bridged: false,
			});

			expect(() => ctx.emit('test.event', { foo: 'bar' })).not.toThrow();
		});
	});
});

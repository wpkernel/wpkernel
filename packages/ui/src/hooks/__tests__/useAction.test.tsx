import { act } from 'react';
import { createDeferred, renderHook } from '../testing/test-utils';
import { useAction } from '../useAction';
import type { ActionEnvelope, DefinedAction } from '@geekist/wp-kernel/actions';
import { KernelError } from '@geekist/wp-kernel';
import * as kernel from '@geekist/wp-kernel';
import * as kernelData from '@geekist/wp-kernel/data';

const ACTION_STORE_KEY = 'wp-kernel/ui/actions';

function makeDefinedAction<TInput, TResult>(
	impl: (input: TInput) => Promise<TResult> | TResult,
	name = 'test.action'
): DefinedAction<TInput, TResult> {
	const fn = jest.fn(async (input: TInput) =>
		impl(input)
	) as unknown as DefinedAction<TInput, TResult>;
	Object.defineProperty(fn, 'actionName', {
		value: name,
		writable: false,
	});
	Object.defineProperty(fn, 'options', {
		value: { scope: 'crossTab', bridged: true },
		writable: false,
	});
	return fn;
}

function prepareWpData(
	invokeImpl?: (envelope: ActionEnvelope<unknown, unknown>) => unknown
) {
	const wpData = window.wp?.data;
	if (!wpData) {
		throw new Error('wp.data stub not initialised');
	}

	const globalCache = globalThis as {
		__WP_KERNEL_UI_ACTION_DISPATCH__?: unknown;
		__WP_KERNEL_UI_ACTION_STORE__?: boolean;
	};
	delete globalCache.__WP_KERNEL_UI_ACTION_DISPATCH__;
	delete globalCache.__WP_KERNEL_UI_ACTION_STORE__;

	(wpData.createReduxStore as jest.Mock).mockReset();
	(wpData.register as jest.Mock).mockReset();
	(wpData.dispatch as jest.Mock).mockReset();

	(wpData.createReduxStore as jest.Mock).mockImplementation(() => ({
		name: ACTION_STORE_KEY,
	}));
	(wpData.register as jest.Mock).mockImplementation(() => undefined);

	const fallbackInvoke = (envelope: ActionEnvelope<unknown, unknown>) =>
		(envelope.payload.action as DefinedAction<unknown, unknown>)(
			envelope.payload.args
		);
	const invoke = jest.fn(invokeImpl ?? fallbackInvoke);

	(wpData.dispatch as jest.Mock).mockImplementation((store: string) => {
		if (store === ACTION_STORE_KEY) {
			return { invoke };
		}
		return {};
	});

	return invoke as jest.Mock;
}

describe('useAction', () => {
	let invalidateSpy: jest.SpyInstance;

	beforeEach(() => {
		invalidateSpy = jest.spyOn(kernel, 'invalidate');
	});

	afterEach(() => {
		jest.clearAllMocks();
		invalidateSpy.mockRestore();
		const globalCache = globalThis as {
			__WP_KERNEL_UI_ACTION_DISPATCH__?: unknown;
			__WP_KERNEL_UI_ACTION_STORE__?: boolean;
		};
		delete globalCache.__WP_KERNEL_UI_ACTION_DISPATCH__;
		delete globalCache.__WP_KERNEL_UI_ACTION_STORE__;
	});

	it('executes actions and updates state on success', async () => {
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const action = makeDefinedAction(async (input: { id: number }) => ({
			...input,
			ok: true,
		}));

		const { result } = renderHook(() => useAction(action));

		await act(async () => {
			const payload = { id: 123 };
			const response = await result.current.run(payload);
			expect(response).toEqual({ id: 123, ok: true });
		});

		expect(result.current.status).toBe('success');
		expect(result.current.result).toEqual({ id: 123, ok: true });
		expect(result.current.inFlight).toBe(0);
	});

	it('records errors and exposes KernelError state', async () => {
		const kernelError = new KernelError('ValidationError', {
			message: 'Invalid',
		});
		prepareWpData((envelope) =>
			envelope.payload
				.action(envelope.payload.args)
				.then((_value: unknown) => {
					throw kernelError;
				})
		);

		const action = makeDefinedAction(async () => {
			return Promise.reject(kernelError);
		});

		const { result } = renderHook(() => useAction(action));

		await act(async () => {
			await expect(result.current.run({})).rejects.toBe(kernelError);
		});

		expect(result.current.status).toBe('error');
		expect(result.current.error).toBe(kernelError);
		expect(result.current.inFlight).toBe(0);
	});

	it('deduplicates in-flight executions when dedupeKey matches', async () => {
		const deferred = createDeferred<{ value: string }>();
		const invoke = prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const action = makeDefinedAction(async () => deferred.promise);

		const { result } = renderHook(() =>
			useAction(action, { dedupeKey: (input: string) => input })
		);

		let firstPromise!: Promise<{ value: string }>;
		let secondPromise!: Promise<{ value: string }>;
		act(() => {
			firstPromise = result.current.run('query');
		});
		act(() => {
			secondPromise = result.current.run('query');
		});

		expect(firstPromise).toBe(secondPromise);
		expect(invoke).toHaveBeenCalledTimes(1);
		expect(result.current.inFlight).toBe(1);

		await act(async () => {
			deferred.resolve({ value: 'done' });
			await firstPromise;
		});

		expect(result.current.status).toBe('success');
		expect(result.current.result).toEqual({ value: 'done' });
		expect(result.current.inFlight).toBe(0);
	});

	it('cancels local state tracking when cancel() is called', async () => {
		const deferred = createDeferred<string>();
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const action = makeDefinedAction(async () => deferred.promise);
		const { result } = renderHook(() => useAction(action));

		let promise!: Promise<string>;
		act(() => {
			promise = result.current.run('start');
		});
		expect(result.current.status).toBe('running');
		expect(result.current.inFlight).toBe(1);

		act(() => {
			result.current.cancel();
		});
		expect(result.current.status).toBe('idle');
		expect(result.current.inFlight).toBe(0);

		await act(async () => {
			deferred.resolve('ignored');
			await promise;
		});

		expect(result.current.status).toBe('idle');
		expect(result.current.result).toBeUndefined();
	});

	it('switch concurrency cancels previous calls', async () => {
		const first = createDeferred<string>();
		const second = createDeferred<string>();
		const invoke = prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		let callCount = 0;
		const action = makeDefinedAction(async () => {
			callCount += 1;
			return callCount === 1 ? first.promise : second.promise;
		});

		const { result } = renderHook(() =>
			useAction(action, { concurrency: 'switch' })
		);

		let firstRun!: Promise<string>;
		act(() => {
			firstRun = result.current.run('one');
		});
		expect(result.current.inFlight).toBe(1);

		let secondRun!: Promise<string>;
		act(() => {
			secondRun = result.current.run('two');
		});
		expect(result.current.inFlight).toBe(1);
		expect(invoke).toHaveBeenCalledTimes(2);

		await act(async () => {
			first.resolve('first');
			second.resolve('second');
			await Promise.all([firstRun.catch(() => undefined), secondRun]);
		});

		expect(result.current.result).toBe('second');
		expect(result.current.status).toBe('success');
	});

	it('queue concurrency runs actions sequentially', async () => {
		const first = createDeferred<string>();
		const second = createDeferred<string>();
		const invoke = prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		let call = 0;
		const action = makeDefinedAction(async () => {
			call += 1;
			return call === 1 ? first.promise : second.promise;
		});

		const { result } = renderHook(() =>
			useAction(action, { concurrency: 'queue' })
		);

		let firstRun!: Promise<string>;
		let secondRun!: Promise<string>;
		act(() => {
			firstRun = result.current.run('a');
		});
		act(() => {
			secondRun = result.current.run('b');
		});
		await act(async () => {
			await Promise.resolve();
		});

		expect(invoke).toHaveBeenCalledTimes(1);

		await act(async () => {
			first.resolve('first');
			await firstRun;
		});

		expect(invoke).toHaveBeenCalledTimes(2);

		await act(async () => {
			second.resolve('second');
			await secondRun;
		});

		expect(result.current.result).toBe('second');
	});

	it('drop concurrency reuses the active promise', async () => {
		const deferred = createDeferred<string>();
		const invoke = prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async () => deferred.promise);
		const { result } = renderHook(() =>
			useAction(action, { concurrency: 'drop' })
		);

		let first!: Promise<string>;
		let second!: Promise<string>;
		act(() => {
			first = result.current.run('payload');
		});
		act(() => {
			second = result.current.run('payload-2');
		});
		expect(first).toBe(second);
		expect(invoke).toHaveBeenCalledTimes(1);

		await act(async () => {
			deferred.resolve('done');
			await first;
		});
	});

	it('calls invalidate when autoInvalidate returns patterns', async () => {
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async () => ({ id: 10 }));
		const patterns = [['job', 'list']];

		const { result } = renderHook(() =>
			useAction(action, {
				autoInvalidate: () => patterns,
			})
		);

		await act(async () => {
			await result.current.run({ id: 10 });
		});

		expect(invalidateSpy).toHaveBeenCalledWith(patterns);
	});

	it('reset clears state without cancelling in-flight requests', async () => {
		const deferred = createDeferred<string>();
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async () => deferred.promise);

		const { result } = renderHook(() => useAction(action));
		let promise!: Promise<string>;
		act(() => {
			promise = result.current.run('value');
		});

		act(() => {
			result.current.reset();
		});

		expect(result.current.status).toBe('idle');
		expect(result.current.error).toBeUndefined();
		expect(result.current.result).toBeUndefined();

		await act(async () => {
			deferred.resolve('complete');
			await promise;
		});

		expect(result.current.status).toBe('success');
	});

	it('allows multiple hook instances without sharing state', async () => {
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async (value: number) => value * 2);

		const { result: first } = renderHook(() =>
			useAction(action, { concurrency: 'parallel' })
		);
		const { result: second } = renderHook(() =>
			useAction(action, { concurrency: 'parallel' })
		);

		await act(async () => {
			await first.current.run(2);
		});

		expect(first.current.result).toBe(4);
		expect(second.current.result).toBeUndefined();

		await act(async () => {
			await second.current.run(3);
		});

		expect(second.current.result).toBe(6);
	});

	it('can be imported in environments without window (SSR safety)', () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			'window'
		);
		const originalWindow = globalThis.window;

		if (descriptor && descriptor.configurable) {
			Object.defineProperty(globalThis, 'window', {
				configurable: true,
				value: undefined,
			});
		}

		expect(() => {
			jest.isolateModules(() => {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				require('../useAction');
			});
		}).not.toThrow();

		if (descriptor && descriptor.configurable) {
			Object.defineProperty(globalThis, 'window', {
				...descriptor,
				value: originalWindow,
			});
		}
	});

	it('reuses cached dispatcher when available', async () => {
		const globalCache = globalThis as {
			__WP_KERNEL_UI_ACTION_DISPATCH__?: (
				envelope: ActionEnvelope<unknown, unknown>
			) => Promise<unknown>;
			__WP_KERNEL_UI_ACTION_STORE__?: boolean;
		};
		const cachedDispatch = jest
			.fn()
			.mockImplementation(
				async (envelope: ActionEnvelope<{ name: string }, unknown>) => {
					return envelope.payload.action(
						envelope.payload.args
					) as unknown;
				}
			);
		globalCache.__WP_KERNEL_UI_ACTION_DISPATCH__ =
			cachedDispatch as unknown as (
				envelope: ActionEnvelope<unknown, unknown>
			) => Promise<unknown>;
		globalCache.__WP_KERNEL_UI_ACTION_STORE__ = true;

		const registerSpy = jest.spyOn(kernelData, 'registerKernelStore');
		const action = makeDefinedAction(async (input: { name: string }) => ({
			...input,
			ok: true,
		}));

		const { result } = renderHook(() => useAction(action));

		await act(async () => {
			const response = await result.current.run({ name: 'demo' });
			expect(response).toEqual({ name: 'demo', ok: true });
		});

		expect(cachedDispatch).toHaveBeenCalledTimes(1);
		expect(registerSpy).not.toHaveBeenCalled();

		registerSpy.mockRestore();
	});

	it('throws a KernelError when run during SSR', () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			'window'
		);
		if (!descriptor?.configurable) {
			// Environment does not allow overriding window; skip assertion.
			expect(descriptor?.configurable).toBe(false);
			return;
		}

		const originalWindow = globalThis.window;
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined,
		});

		const action = makeDefinedAction(async () => 'noop');
		const { result } = renderHook(() => useAction(action));

		expect(() => {
			result.current.run({} as never);
		}).toThrow(
			expect.objectContaining({
				name: 'KernelError',
				code: 'DeveloperError',
				message: expect.stringContaining(
					'useAction cannot run during SSR'
				),
			})
		);

		Object.defineProperty(globalThis, 'window', {
			...descriptor,
			value: originalWindow,
		});
	});
	it('throws when WordPress data registry dispatch API is unavailable', () => {
		const action = makeDefinedAction(async () => 'noop');
		const dispatchMock = window.wp?.data?.dispatch as jest.Mock;
		dispatchMock.mockReturnValueOnce({});

		const { result } = renderHook(() => useAction(action));

		expect(() => {
			result.current.run({} as never);
		}).toThrow(
			expect.objectContaining({
				name: 'KernelError',
				code: 'DeveloperError',
				message: expect.stringContaining(
					'Failed to resolve kernel action dispatcher'
				),
			})
		);
	});

	it('ignores duplicate store registration errors', async () => {
		const registerSpy = jest
			.spyOn(kernelData, 'registerKernelStore')
			.mockImplementation(() => {
				throw new Error('Store already registered');
			});

		const action = makeDefinedAction(async (payload: { id: number }) => ({
			...payload,
			success: true,
		}));

		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const { result } = renderHook(() => useAction(action));

		await act(async () => {
			const output = await result.current.run({ id: 42 });
			expect(output).toEqual({ id: 42, success: true });
		});

		expect(registerSpy).toHaveBeenCalled();
		registerSpy.mockRestore();
	});

	it('propagates unexpected store registration errors', async () => {
		const registerSpy = jest
			.spyOn(kernelData, 'registerKernelStore')
			.mockImplementation(() => {
				throw new Error('Unexpected failure');
			});

		const action = makeDefinedAction(async () => 'value');
		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);

		const { result } = renderHook(() => useAction(action));

		expect(() => {
			result.current.run({} as never);
		}).toThrow('Unexpected failure');

		registerSpy.mockRestore();
	});

	it('normalises non-error dispatch failures into KernelError instances', async () => {
		type DispatchFunction = <TArgs, TResult>(
			envelope: ActionEnvelope<TArgs, TResult>
		) => Promise<TResult>;

		const globalCache = globalThis as {
			__WP_KERNEL_UI_ACTION_DISPATCH__?: DispatchFunction;
			__WP_KERNEL_UI_ACTION_STORE__?: boolean;
		};
		globalCache.__WP_KERNEL_UI_ACTION_DISPATCH__ = (() => {
			throw 'primitive failure';
		}) as unknown as DispatchFunction;
		globalCache.__WP_KERNEL_UI_ACTION_STORE__ = true;

		const action = makeDefinedAction(async (value: number) => value);
		const { result } = renderHook(() => useAction(action));
		let capturedError: unknown;
		await act(async () => {
			try {
				await result.current.run(7);
			} catch (error) {
				capturedError = error;
			}
		});

		expect(capturedError as KernelError).toMatchObject({
			name: 'KernelError',
			code: 'UnknownError',
			message: 'Dispatching action failed with non-error value',
		});
	});

	it('does not invalidate cache when autoInvalidate returns falsey values', async () => {
		const registerSpy = jest
			.spyOn(kernelData, 'registerKernelStore')
			.mockReturnValue({
				name: ACTION_STORE_KEY,
				instantiate: () => ({}) as any,
			} as any);

		prepareWpData((envelope) =>
			envelope.payload.action(envelope.payload.args)
		);
		const action = makeDefinedAction(async () => ({ id: 1 }));

		const { result } = renderHook(() =>
			useAction(action, { autoInvalidate: () => false })
		);
		await act(async () => {
			await result.current.run({ id: 1 });
		});

		expect(invalidateSpy).not.toHaveBeenCalled();
		registerSpy.mockRestore();
	});
});

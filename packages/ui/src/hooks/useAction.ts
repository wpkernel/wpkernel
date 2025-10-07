import { useCallback, useMemo, useRef, useState } from 'react';
import {
	KernelError,
	getWPData,
	invalidate,
	type CacheKeyPattern,
} from '@geekist/wp-kernel';
import {
	invokeAction,
	type ActionEnvelope,
	type DefinedAction,
} from '@geekist/wp-kernel/actions';
import { registerKernelStore } from '@geekist/wp-kernel/data';
import { useLatest, useStableCallback } from './internal/useStableCallback';

interface WPDataLike {
	dispatch?: (store: string) => unknown;
}

type DispatchFunction = <TArgs, TResult>(
	envelope: ActionEnvelope<TArgs, TResult>
) => Promise<TResult>;

const ACTION_STORE_KEY = 'wp-kernel/ui/actions';

interface DispatchGlobal {
	__WP_KERNEL_UI_ACTION_DISPATCH__?: DispatchFunction;
	__WP_KERNEL_UI_ACTION_STORE__?: boolean;
}

function getGlobalObject(): DispatchGlobal {
	if (typeof window !== 'undefined') {
		return window as unknown as DispatchGlobal;
	}
	return (globalThis as DispatchGlobal | undefined) ?? {};
}

function ensureDispatch(): DispatchFunction {
	const globalObj = getGlobalObject();
	if (globalObj.__WP_KERNEL_UI_ACTION_DISPATCH__) {
		return globalObj.__WP_KERNEL_UI_ACTION_DISPATCH__;
	}

	if (typeof window === 'undefined') {
		throw new KernelError('DeveloperError', {
			message:
				'useAction cannot run during SSR. Call run() on the client side.',
		});
	}

	const wpData = getWPData() as WPDataLike | undefined;

	if (!wpData?.dispatch) {
		throw new KernelError('DeveloperError', {
			message:
				'useAction requires the WordPress data registry. Ensure wp.data is available and withKernel() has been called.',
		});
	}

	if (!globalObj.__WP_KERNEL_UI_ACTION_STORE__) {
		try {
			registerKernelStore(ACTION_STORE_KEY, {
				reducer: (state = {}) => state,
				actions: {
					invoke: (
						...args: unknown[]
					): ActionEnvelope<unknown, unknown> =>
						args[0] as ActionEnvelope<unknown, unknown>,
				},
				selectors: {},
			});
		} catch (error) {
			// Ignore duplicate registration since store may already exist.
			if (
				!(error instanceof Error) ||
				!error.message.includes('already registered')
			) {
				throw error;
			}
		}
		globalObj.__WP_KERNEL_UI_ACTION_STORE__ = true;
	}

	const dispatcher = wpData.dispatch(ACTION_STORE_KEY) as {
		invoke?: (
			envelope: ActionEnvelope<unknown, unknown>
		) => Promise<unknown>;
	};

	if (typeof dispatcher?.invoke !== 'function') {
		throw new KernelError('DeveloperError', {
			message:
				'Failed to resolve kernel action dispatcher. Verify withKernel() was initialised.',
		});
	}

	// Type guard ensures invoke exists and has correct signature after check above
	const invokeMethod = dispatcher.invoke;

	const dispatchFn: DispatchFunction = <TArgs, TResult>(
		envelope: ActionEnvelope<TArgs, TResult>
	): Promise<TResult> => {
		// Type safety is maintained by the action envelope system despite WordPress data API limitations.
		return invokeMethod(
			envelope as ActionEnvelope<unknown, unknown>
		) as Promise<TResult>;
	};

	globalObj.__WP_KERNEL_UI_ACTION_DISPATCH__ = dispatchFn;
	return dispatchFn;
}

export interface UseActionOptions<TInput, TResult> {
	concurrency?: 'parallel' | 'switch' | 'queue' | 'drop';
	dedupeKey?: (input: TInput) => string;
	autoInvalidate?: (
		result: TResult,
		input: TInput
	) => CacheKeyPattern[] | false;
}

export interface UseActionState<TResult> {
	status: 'idle' | 'running' | 'success' | 'error';
	error?: KernelError;
	result?: TResult;
	inFlight: number;
}

export interface UseActionResult<TInput, TResult>
	extends UseActionState<TResult> {
	run: (input: TInput) => Promise<TResult>;
	cancel: () => void;
	reset: () => void;
}

interface RequestRecord<TResult> {
	id: number;
	promise: Promise<TResult>;
	cancelled: boolean;
	dedupeKey?: string;
}

const initialState: UseActionState<unknown> = {
	status: 'idle',
	error: undefined,
	result: undefined,
	inFlight: 0,
};

function normaliseToKernelError(value: unknown, message: string): KernelError {
	if (KernelError.isKernelError(value)) {
		return value;
	}
	if (value instanceof Error) {
		return KernelError.wrap(value);
	}
	return new KernelError('UnknownError', {
		message,
		data: { value },
	});
}

export function useAction<TInput, TResult>(
	action: DefinedAction<TInput, TResult>,
	options: UseActionOptions<TInput, TResult> = {}
): UseActionResult<TInput, TResult> {
	const actionRef = useLatest(action);
	const optionsRef = useLatest(options);
	const autoInvalidateRef = useLatest(options.autoInvalidate);
	const dedupeKeyRef = useLatest(options.dedupeKey);

	const [state, setState] = useState<UseActionState<TResult>>(
		initialState as UseActionState<TResult>
	);

	const requestsRef = useRef<Map<number, RequestRecord<TResult>>>(new Map());
	const dedupeMapRef = useRef<Map<string, RequestRecord<TResult>>>(new Map());
	const queueTailRef = useRef<Promise<void> | null>(null);
	const queueGenerationRef = useRef(0);
	const idCounterRef = useRef(0);

	const markRequestCancelled = useCallback(
		(record: RequestRecord<TResult>) => {
			record.cancelled = true;
			if (record.dedupeKey) {
				dedupeMapRef.current.delete(record.dedupeKey);
			}
		},
		[]
	);

	const clearQueue = useCallback(() => {
		queueTailRef.current = null;
		queueGenerationRef.current += 1;
	}, []);

	const cancelAll = useCallback(
		(resetResult: boolean) => {
			requestsRef.current.forEach((record) => {
				markRequestCancelled(record);
			});
			requestsRef.current.clear();
			dedupeMapRef.current.clear();
			clearQueue();

			setState((prev) => ({
				status: 'idle',
				error: undefined,
				result: resetResult ? undefined : prev.result,
				inFlight: 0,
			}));
		},
		[clearQueue, markRequestCancelled]
	);

	const applySuccessState = useCallback((result: TResult) => {
		setState((prev) => {
			const nextInFlight = Math.max(prev.inFlight - 1, 0);
			return {
				status: nextInFlight > 0 ? 'running' : 'success',
				error: undefined,
				result,
				inFlight: nextInFlight,
			};
		});
	}, []);

	const applyErrorState = useCallback((error: KernelError) => {
		setState((prev) => {
			const nextInFlight = Math.max(prev.inFlight - 1, 0);
			return {
				status: nextInFlight > 0 ? 'running' : 'error',
				error,
				result: prev.result,
				inFlight: nextInFlight,
			};
		});
	}, []);

	const startRequest = useCallback(
		(input: TInput): Promise<TResult> => {
			const dispatch = ensureDispatch();
			const targetAction = actionRef.current;
			const requestId = ++idCounterRef.current;
			const dedupeKey = dedupeKeyRef.current?.(input);

			if (dedupeKey) {
				const existing = dedupeMapRef.current.get(dedupeKey);
				if (existing && !existing.cancelled) {
					return existing.promise;
				}
			}

			const record: RequestRecord<TResult> = {
				id: requestId,
				promise: Promise.resolve() as Promise<TResult>,
				cancelled: false,
				dedupeKey,
			};

			requestsRef.current.set(requestId, record);
			if (dedupeKey) {
				dedupeMapRef.current.set(dedupeKey, record);
			}

			setState((prev) => ({
				status: 'running',
				inFlight: prev.inFlight + 1,
				error: undefined,
				result: prev.result,
			}));

			const envelope = invokeAction(targetAction, input);

			let dispatchPromise: Promise<TResult>;
			try {
				dispatchPromise = Promise.resolve(dispatch(envelope));
			} catch (error) {
				markRequestCancelled(record);
				requestsRef.current.delete(requestId);
				const kernelError = normaliseToKernelError(
					error,
					'Dispatching action failed with non-error value'
				);
				applyErrorState(kernelError);
				throw kernelError;
			}

			const promise = dispatchPromise
				.then((result: TResult) => {
					if (!record.cancelled) {
						const invalidatePatterns = autoInvalidateRef.current?.(
							result,
							input
						);
						if (
							invalidatePatterns &&
							invalidatePatterns.length > 0
						) {
							invalidate(invalidatePatterns);
						}
						applySuccessState(result);
					}
					return result;
				})
				.catch((error: unknown) => {
					const kernelError = normaliseToKernelError(
						error,
						'Action failed with non-error value'
					);

					if (!record.cancelled) {
						applyErrorState(kernelError);
					}

					throw kernelError;
				})
				.finally(() => {
					if (dedupeKey) {
						dedupeMapRef.current.delete(dedupeKey);
					}
					requestsRef.current.delete(requestId);
				});

			record.promise = promise;
			return promise;
		},
		[
			actionRef,
			applyErrorState,
			applySuccessState,
			markRequestCancelled,
			autoInvalidateRef,
			dedupeKeyRef,
		]
	);

	const run = useCallback(
		(input: TInput) => {
			const concurrency = optionsRef.current.concurrency ?? 'parallel';

			const start = () => startRequest(input);

			const activeRequest = (): RequestRecord<TResult> | undefined =>
				Array.from(requestsRef.current.values()).find(
					(record) => !record.cancelled
				);

			switch (concurrency) {
				case 'drop': {
					const record = activeRequest();
					if (record) {
						return record.promise;
					}
					return start();
				}
				case 'switch': {
					requestsRef.current.forEach((record) => {
						markRequestCancelled(record);
					});
					requestsRef.current.clear();
					dedupeMapRef.current.clear();
					clearQueue();
					setState((prev) => ({
						status: 'running',
						inFlight: 0,
						error: undefined,
						result: prev.result,
					}));
					return start();
				}
				case 'queue': {
					const generation = queueGenerationRef.current;
					const tail =
						queueTailRef.current ?? Promise.resolve(undefined);
					const next = tail
						.catch(() => undefined)
						.then(() => {
							// Check if queue was cancelled (generation changed) before executing this queued call
							if (queueGenerationRef.current !== generation) {
								throw new KernelError('DeveloperError', {
									message:
										'Queued action cancelled before execution in queue concurrency mode',
								});
							}
							return start();
						});
					queueTailRef.current = next
						.then(() => undefined)
						.catch(() => undefined);
					return next;
				}
				default:
					return start();
			}
		},
		[clearQueue, markRequestCancelled, optionsRef, setState, startRequest]
	);

	const cancel = useStableCallback(() => {
		cancelAll(true);
	});

	const reset = useStableCallback(() => {
		setState({
			status: 'idle',
			error: undefined,
			result: undefined,
			inFlight: 0,
		});
	});

	return useMemo(
		() => ({
			...state,
			run,
			cancel,
			reset,
		}),
		[cancel, reset, run, state]
	);
}

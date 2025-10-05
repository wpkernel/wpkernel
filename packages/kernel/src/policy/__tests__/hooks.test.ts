import React, { act, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { usePolicy } from '../hooks';
import { createPolicyCache, createPolicyCacheKey } from '../cache';
import type { ActionRuntime } from '../../actions/types';
import type { PolicyHelpers, UsePolicyResult } from '../types';
import { KernelError } from '../../error/KernelError';

jest.mock('../../namespace/detect', () => ({
	getNamespace: () => 'acme',
}));

type RuntimePolicy =
	| PolicyHelpers<Record<string, unknown>>
	| (Partial<PolicyHelpers<Record<string, unknown>>> & {
			cache?: PolicyHelpers<Record<string, unknown>>['cache'];
	  });

describe('usePolicy hook', () => {
	beforeAll(() => {
		(
			globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
		).IS_REACT_ACT_ENVIRONMENT = true;
	});

	afterAll(() => {
		delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
			.IS_REACT_ACT_ENVIRONMENT;
	});

	afterEach(() => {
		delete global.__WP_KERNEL_ACTION_RUNTIME__;
		jest.restoreAllMocks();
	});

	function renderTestComponent<Policy extends Record<string, unknown>>(
		results: UsePolicyResult<Policy>[]
	) {
		const container = document.createElement('div');
		const root = createRoot(container);

		function TestComponent() {
			const value = usePolicy<Policy>();
			const initial = useRef(true);
			if (initial.current) {
				results.push(value);
				initial.current = false;
			}
			useEffect(() => {
				results.push(value);
			}, [value]);
			return null;
		}

		act(() => {
			root.render(React.createElement(TestComponent));
		});

		return {
			container,
			cleanup() {
				act(() => {
					root.unmount();
				});
			},
		};
	}

	it('reports a developer error when no runtime is configured', async () => {
		const results: UsePolicyResult<Record<string, never>>[] = [];
		const { cleanup } = renderTestComponent(results);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		expect(latest.isLoading).toBe(false);
		expect(latest.error).toBeInstanceOf(KernelError);
		expect((latest.error as KernelError).code).toBe('DeveloperError');
		cleanup();
	});

	it('returns cached values without calling runtime can()', async () => {
		const cache = createPolicyCache({ crossTab: false }, 'acme');
		const cacheKey = createPolicyCacheKey('tasks.manage', undefined);
		cache.set(cacheKey, true, {
			source: 'remote',
			expiresAt: Date.now() + 1000,
		});
		const runtimeCan = jest.fn().mockReturnValue(false);
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache,
		};
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: runtime,
		} as ActionRuntime;

		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(results);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		expect(latest.isLoading).toBe(false);
		expect(latest.can('tasks.manage', undefined)).toBe(true);
		expect(runtimeCan).not.toHaveBeenCalled();
		expect(latest.keys).toEqual(['tasks.manage']);
		cleanup();
	});

	it('captures async denials from runtime can()', async () => {
		const runtimeCan = jest.fn(() => Promise.reject('nope'));
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache: createPolicyCache({ crossTab: false }, 'acme'),
		};
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: runtime,
		} as ActionRuntime;

		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(results);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		await act(async () => {
			latest.can('tasks.manage', undefined);
			await Promise.resolve();
		});

		const final = results[results.length - 1]!;
		expect(final.error).toBeInstanceOf(Error);
		expect((final.error as Error).message).toBe('nope');
		cleanup();
	});

	it('records thrown errors from runtime can()', async () => {
		const runtimeCan = jest.fn(() => {
			throw new KernelError('PolicyDenied', { message: 'denied' });
		});
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache: createPolicyCache({ crossTab: false }, 'acme'),
		};
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: runtime,
		} as ActionRuntime;

		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(results);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		let allowed: boolean | undefined;
		await act(async () => {
			allowed = latest.can('tasks.manage', undefined);
			await Promise.resolve();
		});
		expect(allowed).toBe(false);
		const final = results[results.length - 1]!;
		expect(final.error).toBeInstanceOf(KernelError);
		expect((final.error as KernelError).code).toBe('PolicyDenied');
		cleanup();
	});

	it('coerces non-error throws from runtime can()', async () => {
		const runtimeCan = jest.fn(() => {
			throw 'denied';
		});
		const runtime: RuntimePolicy = {
			can: runtimeCan,
			keys: () => ['tasks.manage'],
			cache: createPolicyCache({ crossTab: false }, 'acme'),
		};
		global.__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: runtime,
		} as ActionRuntime;

		const results: UsePolicyResult<Record<string, unknown>>[] = [];
		const { cleanup } = renderTestComponent(results);

		await act(async () => {
			await Promise.resolve();
		});

		const latest = results[results.length - 1]!;
		let allowed: boolean | undefined;
		await act(async () => {
			allowed = latest.can('tasks.manage', undefined);
			await Promise.resolve();
		});
		expect(allowed).toBe(false);
		const final = results[results.length - 1]!;
		expect(final.error).toBeInstanceOf(Error);
		expect((final.error as Error).message).toBe('denied');
		cleanup();
	});
});

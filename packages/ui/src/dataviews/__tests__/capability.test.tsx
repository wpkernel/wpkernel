import { renderHook } from '@testing-library/react';
import { useCapability, useCapabilityGuard } from '../capability';

function createRuntime(can?: (key: string) => boolean | Promise<boolean>) {
	return {
		namespace: 'tests',
		capabilities: can
			? {
					capability: { can },
				}
			: undefined,
	} as any;
}

describe('useCapability', () => {
	it('allows when no key', () => {
		const { result } = renderHook(() =>
			useCapability(createRuntime(), undefined)
		);
		expect(result.current.allowed).toBe(true);
	});

	it('allows when runtime missing', () => {
		const { result } = renderHook(() =>
			useCapability(createRuntime(undefined), 'jobs.view')
		);
		expect(result.current.allowed).toBe(true);
		expect(result.current.reason).toBe('runtime-missing');
	});

	it('denies when can returns false', () => {
		const { result } = renderHook(() =>
			useCapability(
				createRuntime(() => false),
				'jobs.view'
			)
		);
		expect(result.current.allowed).toBe(false);
	});

	it('treats async capability checks as allowed while pending', () => {
		const { result } = renderHook(() =>
			useCapability(
				createRuntime(() => Promise.resolve(true)),
				'jobs.view'
			)
		);
		expect(result.current.allowed).toBe(true);
	});

	it('handles capability runtime errors defensively', () => {
		const { result } = renderHook(() =>
			useCapability(
				createRuntime(() => {
					throw new Error('boom');
				}),
				'jobs.view'
			)
		);
		expect(result.current.allowed).toBe(false);
		expect(result.current.reason).toBe('error');
	});
});

describe('useCapabilityGuard', () => {
	it('marks config disabled when denied', () => {
		const { result } = renderHook(() =>
			useCapabilityGuard(
				createRuntime(() => false),
				{
					id: 'action',
					capability: 'jobs.view',
				}
			)
		);
		expect(result.current.disabled).toBe(true);
	});
});

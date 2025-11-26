import { act, renderHook } from '@testing-library/react';
import { WPKernelError } from '@wpkernel/core/contracts';
import type { UseActionResult } from '../useAction';
import { useAction } from '../useAction';
import { useTaxonomyOptions } from '../useTaxonomyOptions';

jest.mock('../useAction');

describe('useTaxonomyOptions', () => {
	const run = jest.fn<
		ReturnType<UseActionResult<void, unknown[]>['run']>,
		Parameters<NonNullable<UseActionResult<void, unknown[]>['run']>>
	>();

	function mockUseAction(
		result: Partial<UseActionResult<void, unknown[]>>
	): void {
		(useAction as jest.Mock).mockReturnValue({
			status: 'idle',
			result: undefined,
			error: undefined,
			run,
			...result,
		});
	}

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('maps taxonomy records to label/value options and filters blanks', () => {
		mockUseAction({
			result: [
				{ name: 'Engineering', slug: 'engineering' },
				{ slug: 'no-name' },
				{ name: '', slug: '' },
			],
		});

		const { result } = renderHook(() =>
			useTaxonomyOptions('acme.jobs.load-taxonomies')
		);

		expect(result.current.options).toEqual([
			{ label: 'Engineering', value: 'engineering' },
			{ label: 'no-name', value: 'no-name' },
		]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it('surfaces loading and error states', () => {
		const kernelError = new WPKernelError('DeveloperError', {
			message: 'Boom',
		});
		mockUseAction({
			status: 'running',
			error: kernelError,
		});

		const { result } = renderHook(() =>
			useTaxonomyOptions('acme.jobs.load-taxonomies')
		);

		expect(result.current.isLoading).toBe(true);
		expect(result.current.error).toBe('Boom');
	});

	it('exposes refresh helper that triggers the underlying action', async () => {
		mockUseAction({
			run,
			status: 'success',
			result: [{ name: 'Marketing', slug: 'marketing' }],
		});

		const { result } = renderHook(() =>
			useTaxonomyOptions('acme.jobs.load-taxonomies')
		);

		await act(async () => {
			await result.current.refresh();
		});

		expect(run).toHaveBeenCalledTimes(1);
		expect(run).toHaveBeenCalledWith(undefined);
	});
});

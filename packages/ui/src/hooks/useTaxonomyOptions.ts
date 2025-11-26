import { useMemo } from 'react';
import { defineAction } from '@wpkernel/core/actions';
import { WPKernelError } from '@wpkernel/core/contracts';
import { useAction } from './useAction';

type TaxonomyRecord = { name?: string; slug?: string };

export type TaxonomyOption = { label: string; value: string };

export function useTaxonomyOptions(actionName: string): {
	options: TaxonomyOption[];
	isLoading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
} {
	const action = useMemo(
		() =>
			defineAction<void, TaxonomyRecord[]>({
				name: actionName,
				handler: async () => {
					throw new WPKernelError('DeveloperError', {
						message: `Action ${actionName} must be provided via runtime.`,
					});
				},
			}),
		[actionName]
	);

	const result = useAction<void, TaxonomyRecord[]>(action);

	const options = useMemo(() => {
		const records = Array.isArray(result.result) ? result.result : [];
		return records
			.map((item: TaxonomyRecord) => ({
				label: item.name ?? item.slug ?? '',
				value: item.slug ?? '',
			}))
			.filter((item) => item.label && item.value);
	}, [result.result]);

	return {
		options,
		isLoading: result.status === 'running',
		error: result.error
			? (result.error.message ?? 'Failed to load options')
			: null,
		refresh: async () => {
			if (result.run) {
				await result.run(undefined as void);
			}
		},
	};
}

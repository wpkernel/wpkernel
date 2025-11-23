import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Action, Field, View } from '@wordpress/dataviews';
import type { ResourceDataViewController } from '../../types';

type PaginationInfo = {
	totalItems: number;
	totalPages: number;
	infiniteScrollHandler?: () => void;
};

type NormalizedDataViewsProps<TItem> = {
	data: TItem[];
	view: View;
	onChangeView: (view: View) => void;
	fields: Field<TItem>[];
	actions?: Action<TItem>[];
	getItemId: (item: TItem) => string;
	isLoading: boolean;
	paginationInfo: PaginationInfo;
	selection: string[];
	onChangeSelection: (items: string[]) => void;
	search: boolean;
	searchLabel?: string;
	defaultLayouts: Record<string, unknown>;
	config: { perPageSizes: number[] };
	empty?: ReactNode;
};

type UseDataViewsPropsArgs<TItem, TQuery> = {
	controller: ResourceDataViewController<TItem, TQuery>;
	items: TItem[];
	view: View;
	setView: (view: View) => void;
	actions: Action<TItem>[] | undefined;
	getItemId: (item: TItem) => string;
	isLoading: boolean;
	paginationInfo: PaginationInfo;
	selection: string[];
	onChangeSelection: (items: string[]) => void;
	emptyState: ReactNode;
};

export function useDataViewsProps<TItem, TQuery>({
	controller,
	items,
	view,
	setView,
	actions,
	getItemId,
	isLoading,
	paginationInfo,
	selection,
	onChangeSelection,
	emptyState,
}: UseDataViewsPropsArgs<TItem, TQuery>): NormalizedDataViewsProps<TItem> {
	const defaultLayouts = useMemo(() => {
		const layouts: Record<string, unknown> = {
			...(controller.config.defaultLayouts as
				| Record<string, unknown>
				| undefined),
		};
		const viewType = (view as { type?: string }).type;
		if (viewType && !layouts[viewType]) {
			const layout = (view as { layout?: Record<string, unknown> })
				.layout;
			layouts[viewType] = layout ? { layout } : {};
		}
		return layouts;
	}, [controller.config.defaultLayouts, view]);

	return useMemo(
		() => ({
			data: items,
			view,
			onChangeView: setView,
			fields: controller.config.fields,
			actions,
			getItemId,
			isLoading,
			paginationInfo,
			selection,
			onChangeSelection,
			search: controller.config.search ?? true,
			searchLabel: controller.config.searchLabel,
			defaultLayouts,
			config: {
				perPageSizes: controller.config.perPageSizes ?? [
					10, 20, 50, 100,
				],
			},
			empty: emptyState,
		}),
		[
			actions,
			controller.config.fields,
			controller.config.perPageSizes,
			controller.config.search,
			controller.config.searchLabel,
			defaultLayouts,
			emptyState,
			getItemId,
			isLoading,
			items,
			onChangeSelection,
			paginationInfo,
			selection,
			setView,
			view,
		]
	);
}

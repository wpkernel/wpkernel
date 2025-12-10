/* @jsxImportSource react */
import { DataViews } from '@wordpress/dataviews';
import { useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { createNoopReporter } from '@wpkernel/core/reporter';
import { useResolvedController } from '../use-resolved-controller';
import { useDataViewActions } from '../use-data-view-actions';
import type { ResourceDataViewProps } from '../types/props';
import { useRuntimeContext } from '../state/use-runtime-context';
import { useViewState } from '../state/use-view-state';
import { useListState } from '../state/use-list-state';
import { useItemIdGetter } from '../state/use-item-id-getter';
import { useSelection } from '../state/use-selection';
import { usePaginationInfo } from '../state/use-pagination-info';
import { usePermissionState } from '../state/use-permission-state';
import { useDataViewsProps } from '../utils/build-data-views-props';
import { ResourceDataViewBoundary } from './boundary/ResourceDataViewBoundary';
import type { ListResultState, PermissionState } from '../types/state';
import type { DataViewBoundaryState } from '../../../runtime/dataviews/events';
import type { ResourceDataViewController } from '../../types';
import type { Reporter } from '@wpkernel/core/reporter';

function computeBoundaryState<TItem>(
	list: ListResultState<TItem>,
	permission: PermissionState,
	items: TItem[]
): DataViewBoundaryState {
	if (permission.status === 'denied') {
		return 'permission-denied';
	}

	if (list.status === 'error') {
		return 'error';
	}

	const hasItems = items.length > 0;

	if (
		!hasItems &&
		(permission.status === 'checking' || list.status === 'loading')
	) {
		return 'loading';
	}

	if (!hasItems && list.status === 'success') {
		return 'empty';
	}

	return 'content';
}

function useDebugLogDataView<TItem, TQuery>({
	resourceName,
	items,
	listResult,
	permission,
	controller,
	dataViewsProps,
}: {
	resourceName: string;
	items: readonly TItem[];
	listResult: ListResultState<TItem>;
	permission: PermissionState;
	controller: ResourceDataViewController<TItem, TQuery>;
	dataViewsProps: ComponentProps<typeof DataViews>;
}): void {
	const payload = useMemo(() => {
		const firstRow =
			Array.isArray(dataViewsProps?.data) &&
			dataViewsProps.data.length > 0
				? dataViewsProps.data[0]
				: undefined;

		return {
			resource: resourceName,
			itemsLength: items.length,
			listStatus: listResult.status,
			permissionStatus: permission.status,
			fields: controller.config.fields?.length ?? 0,
			actions: controller.config.actions?.length ?? 0,
			view: dataViewsProps.view,
			dataLength: dataViewsProps?.data?.length,
			firstRow,
		};
	}, [
		controller.config.actions,
		controller.config.fields,
		dataViewsProps?.data,
		dataViewsProps.view,
		items.length,
		listResult.status,
		permission.status,
		resourceName,
	]);

	useEffect(() => {
		if (process.env.WPK_DATAVIEWS_DEBUG !== '1') {
			return;
		}
		console.log('[wpk.ui.ResourceDataView]', JSON.stringify(payload));
	}, [payload]);
}

function renderDataViewsNode(
	props: ComponentProps<typeof DataViews>
): JSX.Element | null {
	try {
		return <DataViews {...props} />;
	} catch (_error) {
		return (
			<div data-wpk-debug="rdv-dataviews-error">
				DataViews render error. See console.
			</div>
		);
	}
}

function useReporter<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	contextReporter?: Reporter
): Reporter {
	return useMemo(() => {
		const fromController =
			typeof controller.getReporter === 'function'
				? controller.getReporter()
				: undefined;

		return fromController ?? contextReporter ?? createNoopReporter();
	}, [controller, contextReporter]);
}

function useBoundaryTransition<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	boundaryState: DataViewBoundaryState,
	listResult: ListResultState<TItem>,
	permission: PermissionState,
	items: readonly TItem[],
	totalItems: number
): void {
	const lastBoundaryRef = useRef<DataViewBoundaryState | undefined>();

	useEffect(() => {
		const previous = lastBoundaryRef.current;
		if (previous === boundaryState) {
			return;
		}

		controller.emitBoundaryTransition({
			state: boundaryState,
			previous,
			listStatus: listResult.status,
			permissionStatus: permission.status,
			itemCount: items.length,
			totalItems,
		});

		lastBoundaryRef.current = boundaryState;
	}, [
		boundaryState,
		controller,
		listResult.status,
		permission.status,
		items.length,
		totalItems,
	]);
}

/**
 * A React component that renders a DataViews interface for a given resource.
 *
 * This component integrates with the `@wordpress/dataviews` package to provide a flexible
 * and extensible way to display and interact with resource data. It handles data fetching,
 * state management, and action dispatching.
 *
 * @category DataViews Integration
 * @param    props.resource
 * @param    props.config
 * @param    props.controller
 * @param    props.runtime
 * @param    props.fetchList
 * @param    props.emptyState
 * @template TItem - The type of the items in the resource list.
 * @template TQuery - The type of the query parameters for the resource.
 * @param    props            - The props for the component.
 * @returns A React element that renders the DataViews interface.
 */
export function ResourceDataView<TItem, TQuery>({
	resource,
	config,
	controller: controllerProp,
	runtime: runtimeProp,
	fetchList,
	emptyState,
}: ResourceDataViewProps<TItem, TQuery>) {
	const context = useRuntimeContext(runtimeProp);
	const controller = useResolvedController(
		controllerProp,
		resource,
		config,
		context,
		fetchList
	);

	const { view, setView, viewState } = useViewState(controller);
	const { listResult, items, totalItems } = useListState({
		controller,
		view,
		fetchList,
		reporter: context.reporter,
	});

	const getItemId = useItemIdGetter(controller.config);
	const reporter = useReporter(controller, context.reporter);
	const actions = useDataViewActions(controller, getItemId, context);
	const { selection, handleSelectionChange } = useSelection();
	const paginationInfo = usePaginationInfo(totalItems, viewState.perPage);
	const permission = usePermissionState(controller, reporter);

	const dataViewsProps = useDataViewsProps<TItem, TQuery>({
		controller,
		items,
		view,
		setView,
		actions,
		getItemId,
		isLoading: listResult.isLoading,
		paginationInfo,
		selection,
		onChangeSelection: handleSelectionChange,
		emptyState,
	}) as ComponentProps<typeof DataViews>;

	const boundaryState = computeBoundaryState(listResult, permission, items);
	const resourceName = controller.resourceName ?? resource?.name ?? '';
	useDebugLogDataView({
		resourceName,
		items,
		listResult,
		permission,
		controller,
		dataViewsProps,
	});
	const dataViewsNode = renderDataViewsNode(dataViewsProps);

	useBoundaryTransition(
		controller as ResourceDataViewController<TItem, TQuery>,
		boundaryState,
		listResult,
		permission,
		items,
		totalItems
	);

	return (
		<div
			className="wpk-dataview"
			data-wpk-dataview={controller.resourceName}
			data-wpk-dataview-namespace={context.namespace}
			data-wpk-dataview-loading={
				listResult.status === 'loading' ? 'true' : 'false'
			}
			data-wpk-dataview-total={String(totalItems)}
		>
			<ResourceDataViewBoundary
				list={listResult}
				items={items}
				permission={permission}
				emptyState={emptyState}
			>
				<div data-wpk-debug="rdv-rendered" />
				{dataViewsNode}
			</ResourceDataViewBoundary>
		</div>
	);
}

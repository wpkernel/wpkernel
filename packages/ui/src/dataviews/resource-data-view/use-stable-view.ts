import { useCallback, useEffect, useState } from 'react';
import type { View } from '@wordpress/dataviews';
import type { ResourceDataViewController } from '../types';

/**
 * Merge layout objects from default and concrete views.
 *
 * Default layout provides baseline; explicit view layout wins per key.
 * @param defaultView
 * @param view
 */
function mergeLayouts(
	defaultView: View,
	view: View
): Record<string, unknown> | undefined {
	const defaultLayout = (defaultView as { layout?: Record<string, unknown> })
		.layout;
	const viewLayout = (view as { layout?: Record<string, unknown> }).layout;

	if (!defaultLayout && !viewLayout) {
		return undefined;
	}

	return {
		...(typeof defaultLayout === 'object' ? defaultLayout : {}),
		...(typeof viewLayout === 'object' ? viewLayout : {}),
	};
}

/**
 * Merge a concrete view definition with defaults (fields, filters, sort, layout).
 * @param defaultView
 * @param view
 */
function mergeViewWithDefaults(defaultView: View, view: View): View {
	const mergedLayout = mergeLayouts(defaultView, view);
	const merged = {
		...defaultView,
		...view,
		fields: view.fields ?? defaultView.fields,
		filters: view.filters ?? defaultView.filters,
		sort: view.sort ?? defaultView.sort,
	} as View;

	if (mergedLayout) {
		(merged as { layout?: Record<string, unknown> }).layout = mergedLayout;
	}

	return merged;
}

/**
 * Persist and merge DataViews view state with sensible defaults.
 *
 * - Applies `config.defaultView` to the initial view.
 * - Restores stored preferences when available.
 * - Emits register/unregister + view change events on the controller.
 *
 * @param    controller
 * @param    initial
 * @category DataViews Integration
 * @example
 * ```ts
 * const [view, setView] = useStableView(controller, initialView);
 * <DataViews view={view} onChangeView={setView} />;
 * ```
 */
export function useStableView(
	controller: ResourceDataViewController<unknown, unknown>,
	initial: View
): [View, (next: View) => void] {
	const [view, setView] = useState<View>(() =>
		mergeViewWithDefaults(controller.config.defaultView, initial)
	);

	useEffect(() => {
		let active = true;
		controller.emitRegistered();
		controller
			.loadStoredView()
			.then((stored) => {
				if (!active || !stored) {
					return;
				}
				setView(
					mergeViewWithDefaults(controller.config.defaultView, stored)
				);
			})
			.catch((error) => {
				controller
					.getReporter()
					.debug?.('Failed to restore DataViews view state', {
						error,
					});
			});

		return () => {
			active = false;
			controller.emitUnregistered();
		};
	}, [controller]);

	useEffect(() => {
		setView(mergeViewWithDefaults(controller.config.defaultView, initial));
	}, [controller, initial]);

	const updateView = useCallback(
		(next: View) => {
			const normalized = mergeViewWithDefaults(
				controller.config.defaultView,
				next
			);
			setView(normalized);
			controller.saveView(normalized).catch((error) => {
				controller
					.getReporter()
					.warn?.('Failed to persist DataViews view state', {
						error,
					});
			});
			controller.emitViewChange(normalized);
		},
		[controller]
	);

	return [view, updateView];
}

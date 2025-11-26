import { useCallback, useEffect, useMemo, useState } from 'react';
import type { View } from '@wordpress/dataviews';
import type { DataViewsRuntimeContext } from '../types';

function storageKey(namespace: string, resource: string, suffix?: string) {
	const base = `${namespace}/dataview/${resource}`;
	return suffix ? `${base}/${suffix}` : base;
}

function loadFromStorage(key: string): View | undefined {
	try {
		const raw =
			typeof localStorage === 'undefined'
				? null
				: localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as View) : undefined;
	} catch {
		return undefined;
	}
}

function persistToStorage(key: string, view: View): void {
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(key, JSON.stringify(view));
		}
	} catch {
		// ignore
	}
}

export function usePersistentDataViewState(options: {
	runtime?: DataViewsRuntimeContext;
	resource: string;
	defaultView: View;
	keySuffix?: string;
}): [View, (next: View) => void] {
	const key = useMemo(
		() =>
			storageKey(
				options.runtime?.namespace ?? 'wpkernel',
				options.resource,
				options.keySuffix
			),
		[options.keySuffix, options.resource, options.runtime?.namespace]
	);

	const initial = useMemo<View>(() => {
		return loadFromStorage(key) ?? options.defaultView;
	}, [key, options.defaultView]);

	const [view, setViewState] = useState<View>(initial);

	const setView = useCallback(
		(next: View) => {
			setViewState(next);
			persistToStorage(key, next);
		},
		[key]
	);

	useEffect(() => {
		// Reset when key or defaultView changes.
		setViewState(loadFromStorage(key) ?? options.defaultView);
	}, [key, options.defaultView]);

	return [view, setView];
}

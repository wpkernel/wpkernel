import { useCallback, useMemo, useState } from 'react';

function storageKey(namespace: string, resource: string, suffix?: string) {
	const base = `${namespace}/dataform/${resource}`;
	return suffix ? `${base}/${suffix}` : base;
}

export function usePersistentDataFormState<TData>(options: {
	resource: string;
	namespace?: string;
	keySuffix?: string;
	defaultValue?: Partial<TData>;
}): [Partial<TData>, (next: Partial<TData>) => void, () => void] {
	const key = useMemo(
		() =>
			storageKey(
				options.namespace ?? 'wpkernel',
				options.resource,
				options.keySuffix
			),
		[options.keySuffix, options.namespace, options.resource]
	);

	const initial = useMemo(() => {
		try {
			const raw =
				typeof localStorage === 'undefined'
					? null
					: localStorage.getItem(key);
			return raw
				? (JSON.parse(raw) as Partial<TData>)
				: (options.defaultValue ?? {});
		} catch {
			return options.defaultValue ?? {};
		}
	}, [key, options.defaultValue]);

	const [data, setDataState] = useState<Partial<TData>>(initial);

	const setData = useCallback(
		(next: Partial<TData>) => {
			setDataState(next);
			try {
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem(key, JSON.stringify(next));
				}
			} catch {
				// ignore
			}
		},
		[key]
	);

	const reset = useCallback(() => {
		setData(options.defaultValue ?? {});
	}, [options.defaultValue, setData]);

	return [data, setData, reset];
}

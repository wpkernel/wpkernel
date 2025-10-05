import { createReduxStore, register } from '@wordpress/data';

export function registerKernelStore<
	Key extends string,
	State,
	Actions extends Record<string, (...args: unknown[]) => unknown>,
	Selectors,
>(
	key: Key,
	config: Parameters<typeof createReduxStore<State, Actions, Selectors>>[1]
) {
	const store = createReduxStore<State, Actions, Selectors>(key, config);
	register(store);
	return store;
}

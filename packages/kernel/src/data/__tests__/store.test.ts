import { registerKernelStore } from '../store';
import { ensureWpData } from '@test-utils/wp';

type TestState = { value: number };

type TestActions = {
	increment: (...args: unknown[]) => TestAction;
};

type TestSelectors = {
	getValue: (state: TestState) => number;
};

type TestAction = {
	type: string;
	payload?: unknown;
};

type TestStoreConfig = {
	reducer: (state: TestState | undefined, action: TestAction) => TestState;
	actions: TestActions;
	selectors: TestSelectors;
	resolvers?: Record<string, (...args: unknown[]) => unknown>;
	controls?: Record<string, (...args: unknown[]) => unknown>;
};

jest.mock('@wordpress/data', () => ({
	__esModule: true,
	createReduxStore: (...args: unknown[]) =>
		(window.wp?.data?.createReduxStore as jest.Mock | undefined)?.(...args),
	register: (...args: unknown[]) =>
		(window.wp?.data?.register as jest.Mock | undefined)?.(...args),
}));

describe('registerKernelStore', () => {
	beforeEach(() => {
		const wpData = ensureWpData();
		wpData.createReduxStore.mockReset();
		wpData.register.mockReset();
	});

	it('creates and registers the store with WordPress data registry', () => {
		const wpData = ensureWpData();
		const storeInstance = { name: 'wpk/test-store' };
		wpData.createReduxStore.mockReturnValue(storeInstance);

		const reducer: TestStoreConfig['reducer'] = (
			state = { value: 0 },
			action
		) => {
			if (action.type === 'SET') {
				return { value: Number(action.payload) };
			}
			return state;
		};
		const actions: TestActions = {
			increment: jest.fn((amount: unknown) => ({
				type: 'SET',
				payload: amount,
			})),
		};
		const selectors: TestSelectors = {
			getValue: jest.fn((state) => state.value),
		};

		const config: TestStoreConfig = {
			reducer,
			actions,
			selectors,
		};

		const result = registerKernelStore('wpk/test', config);

		expect(wpData.createReduxStore).toHaveBeenCalledWith(
			'wpk/test',
			config
		);
		expect(wpData.register).toHaveBeenCalledWith(storeInstance);
		expect(result).toBe(storeInstance);
	});

	it('forwards configuration objects without modification', () => {
		const wpData = ensureWpData();
		const storeInstance = { name: 'wpk/forwarded-store' };
		wpData.createReduxStore.mockReturnValue(storeInstance);

		const config: TestStoreConfig = {
			reducer: (state: TestState = { value: 0 }, action: TestAction) => {
				if (action.type === 'SET') {
					return { value: Number(action.payload) };
				}
				return state;
			},
			actions: {
				increment: (...args: unknown[]) => ({
					type: 'SET',
					payload: args[0],
				}),
			},
			selectors: {
				getValue: (state: TestState) => state.value,
			},
			resolvers: {
				resolveValue: jest.fn(),
			},
			controls: {
				fetch: jest.fn(),
			},
		};

		registerKernelStore('wpk/forwarded', config);

		expect(wpData.createReduxStore).toHaveBeenCalledTimes(1);
		expect(wpData.createReduxStore).toHaveBeenCalledWith(
			'wpk/forwarded',
			config
		);
	});
});

/**
 * Test to understand WordPress data generator behavior
 */

import * as wpData from '@wordpress/data';

interface TestItem {
	id: number;
	title: string;
}

type TestWindow = Window &
	typeof globalThis & {
		wp?: {
			data: typeof wpData;
		};
	};

describe('WordPress data generator behavior', () => {
	beforeEach(() => {
		(window as TestWindow).wp = {
			data: wpData,
		};
	});

	afterEach(() => {
		const unregister = (
			wpData as unknown as {
				unregisterStore?: (key: string) => void;
			}
		).unregisterStore;

		try {
			unregister?.('test-store');
		} catch (_error) {
			// Store may not exist
		}

		// window.wp is reset by setup-jest.ts afterEach
	});

	it('should understand how generators work in WordPress data', async () => {
		// Mock fetch function
		const mockFetch = jest.fn().mockResolvedValue({
			items: [
				{ id: 1, title: 'Test 1' },
				{ id: 2, title: 'Test 2' },
			],
		});

		// Create a simple store with generator resolver
		const store = wpData.createReduxStore('test-store', {
			reducer: (state = { items: [] }, action: any) => {
				if (action.type === 'RECEIVE_ITEMS') {
					return { items: action.items };
				}
				return state;
			},
			actions: {
				receiveItems: (items: TestItem[]) => ({
					type: 'RECEIVE_ITEMS',
					items,
				}),
			},
			selectors: {
				getItems: (state: { items: TestItem[] }) => state.items,
			},
			resolvers: {
				*getItems(): Generator<unknown, void, unknown> {
					const response = (yield {
						type: 'FETCH_FROM_API',
						promise: mockFetch(),
					}) as { items: TestItem[] };
					yield {
						type: 'RECEIVE_ITEMS',
						items: response.items,
					};
				},
			},
			controls: {
				FETCH_FROM_API: ({ promise }: { promise: Promise<any> }) =>
					promise,
			},
		});

		wpData.register(store);

		// Test resolver execution
		await wpData.resolveSelect('test-store').getItems();

		const items = wpData.select('test-store').getItems();
		expect(items).toHaveLength(2);
		expect(items[0]).toEqual({ id: 1, title: 'Test 1' });

		expect(
			wpData.select('test-store').hasFinishedResolution('getItems', [])
		).toBe(true);
	});
});

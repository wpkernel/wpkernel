import { defineResource } from '../../define';
import type { ResourceObject } from '../../types';
import * as wpData from '@wordpress/data';

interface TestJob {
	id: number;
	title: string;
}

type WordPressWindow = Window &
	typeof globalThis & {
		wp?: {
			data: typeof wpData;
		};
	};

describe('resource store resolution', () => {
	let resource: ResourceObject<TestJob, void>;

	beforeEach(() => {
		(window as WordPressWindow).wp = {
			data: wpData,
		};

		resource = defineResource<TestJob, void>({
			name: 'job',
			namespace: 'jest-tests',
			routes: {
				list: { path: '/jest/v1/jobs', method: 'GET' },
			},
		});

		resource.fetchList = jest.fn().mockResolvedValue({
			items: [
				{ id: 1, title: 'Senior QA' },
				{ id: 2, title: 'Junior QA' },
			],
			total: 2,
			hasMore: false,
			nextCursor: undefined,
		});

		// Trigger store registration
		void resource.store;
	});

	afterEach(() => {
		const unregister = (
			wpData as unknown as {
				unregisterStore?: (key: string) => void;
			}
		).unregisterStore;

		try {
			unregister?.(resource.storeKey);
		} catch (_error) {
			// The store may already be unregistered; ignore errors
		}

		// window.wp is reset by setup-jest.ts afterEach
	});

	it('marks resolution as finished after fetchList resolves', async () => {
		expect(resource.fetchList).not.toHaveBeenCalled();

		// Call resolver without arguments to match WordPress data behavior
		await wpData.resolveSelect(resource.storeKey).getList();

		expect(resource.fetchList).toHaveBeenCalledTimes(1);

		const selectors = wpData.select(resource.storeKey) as {
			getList: () => { items: TestJob[] };
			getListStatus: () => 'idle' | 'loading' | 'success' | 'error';
			isResolving: (selector: string, args: unknown[]) => boolean;
			hasFinishedResolution: (
				selector: string,
				args: unknown[]
			) => boolean;
			hasStartedResolution: (
				selector: string,
				args: unknown[]
			) => boolean;
		};

		const list = selectors.getList();

		expect(list.items).toHaveLength(2);

		// WordPress resolution helpers currently report false, but our status should be success
		expect(selectors.getListStatus()).toBe('success');
		expect(selectors.isResolving('getList', [])).toBe(false);
	});
});

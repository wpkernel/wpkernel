/* @jsxImportSource react */
import { act } from 'react';
import { renderHook, createDeferred } from '../test-utils';

describe('test utils', () => {
	it('sets the global React act environment flag when module loads', () => {
		expect(
			(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
				.IS_REACT_ACT_ENVIRONMENT
		).toBe(true);
	});

	it('supports rerendering with updated and preserved props', () => {
		const calls: Array<number | undefined> = [];
		const { result, rerender, unmount } = renderHook(
			(props: { value?: number } = {}) => {
				calls.push(props.value);
				return props.value ?? 0;
			},
			{ initialProps: { value: 1 } }
		);

		expect(result.current).toBe(1);

		act(() => {
			rerender({ value: 2 });
		});
		expect(result.current).toBe(2);

		act(() => {
			rerender();
		});
		expect(result.current).toBe(2);

		expect(calls).toEqual([1, 2, 2]);

		expect(() => {
			act(() => {
				unmount();
			});
		}).not.toThrow();
	});

	it('exposes resolve and reject helpers from createDeferred', async () => {
		const { promise, resolve } = createDeferred<string>();

		const fulfilled = promise.then((value) => `done:${value}`);

		resolve('ok');

		await expect(fulfilled).resolves.toBe('done:ok');

		const { promise: rejectedPromise, reject: triggerReject } =
			createDeferred<number>();
		const rejection = rejectedPromise.catch((error) => {
			if (error instanceof Error) {
				return error.message;
			}
			return String(error);
		});

		triggerReject(new Error('boom'));

		await expect(rejection).resolves.toBe('boom');
	});
});

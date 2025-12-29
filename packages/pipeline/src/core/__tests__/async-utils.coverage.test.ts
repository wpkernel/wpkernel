import { maybeAll, maybeThen } from '../async-utils';

describe('async-utils coverage', () => {
	it('throws when maybeThen receives non-function handler', () => {
		expect(() =>
			maybeThen<string, string>(
				'value',
				null as unknown as (value: string) => string
			)
		).toThrow('maybeThen: onFulfilled is not a function');
	});

	it('returns sync array for maybeAll when no promises', () => {
		const result = maybeAll([1, 2, 3]);
		expect(result).toEqual([1, 2, 3]);
	});
});

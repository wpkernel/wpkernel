import { createBundlerFragment } from '../bundler';

describe('bundler fragment (branches)', () => {
	it('skips when layout is missing', () => {
		const fragment = createBundlerFragment();
		const output = { assign: jest.fn() } as any;

		fragment.apply({
			input: { draft: { layout: null } } as any,
			output,
		});

		expect(output.assign).not.toHaveBeenCalled();
	});

	it('ignores errors resolving layout paths', () => {
		const fragment = createBundlerFragment();
		const output = { assign: jest.fn() } as any;
		const layout = {
			resolve: jest.fn(() => {
				throw new Error('boom');
			}),
		};

		expect(() =>
			fragment.apply({
				input: { draft: { layout } } as any,
				output,
			})
		).not.toThrow();
		expect(output.assign).not.toHaveBeenCalled();
	});
});

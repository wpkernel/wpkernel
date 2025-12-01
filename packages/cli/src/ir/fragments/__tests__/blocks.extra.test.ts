import { createBlocksFragment } from '../blocks';

describe('blocks fragment (branches)', () => {
	it('throws when layout is missing', async () => {
		const fragment = createBlocksFragment();

		await expect(
			fragment.apply({
				input: { draft: { layout: null } } as any,
				output: { assign: jest.fn() } as any,
				context: { workspace: { root: '/' } } as any,
			})
		).rejects.toThrow('Layout fragment must run before blocks fragment.');
	});
});

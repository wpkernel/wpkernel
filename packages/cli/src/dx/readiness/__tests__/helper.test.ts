import { createReadinessHelper } from '../helper';

describe('createReadinessHelper', () => {
	it('throws when metadata label is missing', () => {
		expect(() =>
			createReadinessHelper({
				key: 'missing-label',
				metadata: {} as never,
				async detect() {
					return { status: 'ready' as const, state: {} };
				},
				async confirm() {
					return { status: 'ready' as const, state: {} };
				},
			})
		).toThrow(/must specify metadata\.label/i);
	});

	it('normalises label, tags, and scopes', () => {
		const helper = createReadinessHelper({
			key: 'normalised',
			metadata: {
				label: '  My Helper  ',
				tags: [' alpha ', 'beta', 'alpha', ' '],
				scopes: [' init ', '', 'init', 'create '],
			},
			async detect() {
				return { status: 'ready' as const, state: {} };
			},
			async confirm() {
				return { status: 'ready' as const, state: {} };
			},
		});

		expect(helper.metadata.label).toBe('My Helper');
		expect(helper.metadata.tags).toEqual(Object.freeze(['alpha', 'beta']));
		expect(helper.metadata.scopes).toEqual(
			Object.freeze(['init', 'create'])
		);
	});

	it('treats empty tags/scopes as undefined', () => {
		const helper = createReadinessHelper({
			key: 'empty',
			metadata: {
				label: 'Example',
				tags: ['   ', '\n'],
				scopes: ['  '],
			},
			async detect() {
				return { status: 'ready' as const, state: {} };
			},
			async confirm() {
				return { status: 'ready' as const, state: {} };
			},
		});

		expect(helper.metadata.tags).toBeUndefined();
		expect(helper.metadata.scopes).toBeUndefined();
	});
});

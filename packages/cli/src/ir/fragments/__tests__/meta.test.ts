import { createMetaFragment } from '../meta';
import { WPKernelError } from '@wpkernel/core/error';

describe('createMetaFragment', () => {
	const fragment = createMetaFragment();

	function makeApplyOptions(draft: any, optionsOverrides: any = {}) {
		const output = {
			draft,
			assign(partial: any) {
				Object.assign(draft, partial);
			},
		} as any;
		const baseOptions: any = {
			config: { version: 1 as const },
			namespace: 'my-plugin',
			sourcePath: '/project/src/index.ts',
			origin: 'local',
		};
		return {
			context: {} as any,
			input: {
				options: { ...baseOptions, ...optionsOverrides },
				draft,
			} as any,
			output,
			reporter: {} as any,
		} as any;
	}

	it('throws when namespace cannot be sanitised', async () => {
		const draft = {
			layout: {
				resolve(id: string) {
					return id;
				},
				all: {},
			},
			extensions: {},
		} as any;
		await expect(
			fragment.apply(makeApplyOptions(draft, { namespace: '' }))
		).rejects.toThrow(WPKernelError);
	});

	it('assigns meta to draft on success', async () => {
		const draft = {
			layout: {
				resolve(id: string) {
					return id;
				},
				all: {},
			},
			extensions: {},
		} as any;
		const opts = makeApplyOptions(draft, { namespace: 'My-Plugin' });

		await fragment.apply(opts);
		expect(draft.meta).toBeDefined();
		expect(draft.meta.namespace).toBe('My-Plugin');
		expect(draft.php).toBeDefined();
		expect(draft.extensions['ir.meta.core']).toBeDefined();
	});
});

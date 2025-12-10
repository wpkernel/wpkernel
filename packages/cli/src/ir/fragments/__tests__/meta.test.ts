import { createMetaFragment } from '../ir.meta.core';
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
			context: { workspace: { root: '/project' } } as any,
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

	it('populates plugin metadata with defaults and overrides', async () => {
		const draft = {
			layout: {
				resolve(id: string) {
					return id;
				},
				all: {},
			},
			extensions: {},
		} as any;

		const opts = makeApplyOptions(draft, {
			namespace: 'sample-plugin',
			config: {
				version: 1 as const,
				meta: {
					name: 'Custom Plugin',
					version: '9.9.9',
					textDomain: 'custom-text',
					authorUri: 'https://example.test/author',
					pluginUri: 'https://example.test/plugin',
					licenseUri: 'https://example.test/license',
				},
			},
		});

		await fragment.apply(opts);
		expect(draft.meta.plugin).toMatchObject({
			name: 'Custom Plugin',
			description:
				'Bootstrap loader for the Custom Plugin WPKernel integration.',
			version: '9.9.9',
			requiresAtLeast: '6.7',
			requiresPhp: '8.1',
			textDomain: 'custom-text',
			author: 'WPKernel Contributors',
			authorUri: 'https://example.test/author',
			pluginUri: 'https://example.test/plugin',
			license: 'GPL-2.0-or-later',
			licenseUri: 'https://example.test/license',
		});
	});
});

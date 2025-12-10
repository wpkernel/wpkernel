import { createResourcesFragment } from '../ir.resources.core';
import { WPKernelError } from '@wpkernel/core/error';

describe('createResourcesFragment', () => {
	const fragment = createResourcesFragment();

	const mockConfig = {
		version: 1 as const,
		namespace: 'test',
		schemas: {},
		resources: {},
	};

	function makeApplyOptions(draft: any) {
		const output = {
			draft,
			assign(partial: any) {
				Object.assign(draft, partial);
			},
		} as any;
		return {
			context: {} as any,
			input: {
				options: {
					config: mockConfig,
					sourcePath: '',
					origin: '',
					namespace: '',
				},
				draft,
			} as any,
			output,
			reporter: {} as any,
		} as any;
	}

	it('throws if meta extension missing', async () => {
		const draft = { extensions: {} } as any;
		expect(() => fragment.apply(makeApplyOptions(draft))).toThrow(
			WPKernelError
		);
	});

	it('throws if schema accumulator missing', async () => {
		const draft = {
			extensions: { 'ir.meta.core': { sanitizedNamespace: 'ns' } },
		} as any;
		expect(() => fragment.apply(makeApplyOptions(draft))).toThrow(
			WPKernelError
		);
	});

	it('calls buildResources and assigns resources on success', async () => {
		const accumulator = {
			/* minimal accumulator */
		};
		const draft = {
			extensions: {
				'ir.meta.core': { sanitizedNamespace: 'ns' },
				'ir.schemas.core': accumulator,
			},
		} as any;

		await fragment.apply(makeApplyOptions(draft));

		expect(draft.resources).toBeDefined();
		expect(Array.isArray(draft.resources)).toBe(true);
	});
});

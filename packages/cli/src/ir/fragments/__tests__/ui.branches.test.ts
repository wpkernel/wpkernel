import { createUiFragment } from '../ui';
import type { IrFragmentApplyOptions } from '../../types';

describe('ui fragment (branches)', () => {
	const apply = async (
		resources: any[] = [],
		meta: any = {},
		options: any = {}
	) => {
		const output = {
			assign: jest.fn(),
		};
		const draft = {
			resources,
			meta,
		};
		const input = {
			draft,
			options,
		};

		await createUiFragment().apply({
			input,
			output,
		} as unknown as IrFragmentApplyOptions);

		return output.assign.mock.calls[0]?.[0]?.ui;
	};

	it('skips resources without dataviews view', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: { admin: { view: 'custom' } },
			},
		]);
		expect(ui.resources).toHaveLength(0);
	});

	it('handles missing menu config (undefined menu)', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: { admin: { view: 'dataviews' } }, // menu missing
			},
		]);
		expect(ui.resources).toHaveLength(1);
		expect(ui.resources[0].menu).toBeUndefined();
	});

	it('handles empty menu config (returns undefined)', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: { admin: { view: 'dataviews', menu: {} } },
			},
		]);
		expect(ui.resources).toHaveLength(1);
		expect(ui.resources[0].menu).toBeUndefined();
	});

	it('normalises menu slug (prefixes namespace if missing)', async () => {
		const ui = await apply(
			[
				{
					name: 'res1',
					ui: {
						admin: { view: 'dataviews', menu: { slug: 'my-slug' } },
					},
				},
			],
			{ sanitizedNamespace: 'ns' }
		);
		expect(ui.resources[0].menu.slug).toBe('ns-my-slug');
	});

	it('normalises menu slug (keeps prefix if present)', async () => {
		const ui = await apply(
			[
				{
					name: 'res1',
					ui: {
						admin: { view: 'dataviews', menu: { slug: 'ns-slug' } },
					},
				},
			],
			{ sanitizedNamespace: 'ns' }
		);
		expect(ui.resources[0].menu.slug).toBe('ns-slug');
	});

	it('normalises menu slug (keeps exact namespace match)', async () => {
		const ui = await apply(
			[
				{
					name: 'res1',
					ui: { admin: { view: 'dataviews', menu: { slug: 'ns' } } },
				},
			],
			{ sanitizedNamespace: 'ns' }
		);
		expect(ui.resources[0].menu.slug).toBe('ns');
	});

	it('ignores invalid slug', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: { admin: { view: 'dataviews', menu: { slug: 123 } } },
			},
		]);
		// If all fields invalid, menu becomes undefined
		expect(ui.resources[0].menu).toBeUndefined();
	});

	it('ignores empty slug', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: { admin: { view: 'dataviews', menu: { slug: '   ' } } },
			},
		]);
		expect(ui.resources[0].menu).toBeUndefined();
	});

	it('assigns valid title', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: {
					admin: { view: 'dataviews', menu: { title: 'My Title' } },
				},
			},
		]);
		expect(ui.resources[0].menu.title).toBe('My Title');
	});

	it('ignores invalid title', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: { admin: { view: 'dataviews', menu: { title: 123 } } },
			},
		]);
		expect(ui.resources[0].menu).toBeUndefined();
	});

	it('assigns valid capability', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: {
					admin: {
						view: 'dataviews',
						menu: { capability: 'manage_options' },
					},
				},
			},
		]);
		expect(ui.resources[0].menu.capability).toBe('manage_options');
	});

	it('ignores invalid capability', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: {
					admin: { view: 'dataviews', menu: { capability: 123 } },
				},
			},
		]);
		expect(ui.resources[0].menu).toBeUndefined();
	});

	it('normalises parent (prefixes namespace)', async () => {
		const ui = await apply(
			[
				{
					name: 'res1',
					ui: {
						admin: {
							view: 'dataviews',
							menu: { parent: 'parent' },
						},
					},
				},
			],
			{ sanitizedNamespace: 'ns' }
		);
		expect(ui.resources[0].menu.parent).toBe('ns-parent');
	});

	it('ignores invalid parent', async () => {
		const ui = await apply(
			[
				{
					name: 'res1',
					ui: { admin: { view: 'dataviews', menu: { parent: 123 } } },
				},
			],
			{ sanitizedNamespace: 'ns' }
		);
		expect(ui.resources[0].menu).toBeUndefined();
	});

	it('assigns valid position', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: { admin: { view: 'dataviews', menu: { position: 10 } } },
			},
		]);
		expect(ui.resources[0].menu.position).toBe(10);
	});

	it('ignores invalid position (non-finite)', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: {
					admin: { view: 'dataviews', menu: { position: Infinity } },
				},
			},
		]);
		expect(ui.resources[0].menu).toBeUndefined();
	});

	it('ignores invalid position (not number)', async () => {
		const ui = await apply([
			{
				name: 'res1',
				ui: { admin: { view: 'dataviews', menu: { position: '10' } } },
			},
		]);
		expect(ui.resources[0].menu).toBeUndefined();
	});

	it('returns undefined loader if no slug', async () => {
		// No meta.sanitizedNamespace
		const ui = await apply(
			[
				{
					name: 'res1',
					ui: { admin: { view: 'dataviews' } },
				},
			],
			{}
		); // empty meta

		expect(ui.loader).toBeUndefined();
	});

	it('returns undefined loader if no surface resources', async () => {
		const ui = await apply([], { sanitizedNamespace: 'ns' });
		expect(ui.loader).toBeUndefined();
	});
});

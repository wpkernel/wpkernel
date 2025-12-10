import type { ResourceObject } from '@wpkernel/core/resource';
import type { Field, View } from '@wordpress/dataviews';

import {
	DATA_VIEWS_METADATA_INVALID,
	normalizeResourceDataViewMetadata,
} from '../metadata';
import type { ResourceDataViewConfig } from '../../../dataviews/types';

type TestResource = ResourceObject<unknown, { search?: string }> & {
	ui?: { admin?: { view?: string; dataviews?: unknown } };
};

function createResource(
	overrides: {
		dataviews?: Record<string, unknown>;
	} = {}
): TestResource {
	const resource = {
		name: 'jobs',
		routes: { list: { path: '/jobs', method: 'GET' } },
	} as TestResource;

	const baseView: View = {
		type: 'table',
		fields: ['title'],
		page: 1,
		perPage: 20,
	} as View;

	const dataviewConfig: ResourceDataViewConfig<unknown, { search?: string }> =
		{
			fields: [
				{ id: 'title', label: 'Title' } as Field<unknown>,
				{ id: 'status', label: 'Status' } as Field<unknown>,
			],
			defaultView: baseView,
			mapQuery: () => ({ search: undefined }),
			search: true,
			views: [
				{
					id: 'all',
					label: 'All jobs',
					view: baseView,
					isDefault: true,
				},
			],
		};

	const dataviews = {
		...dataviewConfig,
		...(overrides.dataviews ?? {}),
	} as Record<string, unknown>;

	(
		resource as unknown as {
			ui?: { admin?: { view?: string; dataviews?: unknown } };
		}
	).ui = {
		admin: {
			view: 'dataview',
			dataviews,
		},
	};

	return resource;
}

describe('normalizeResourceDataViewMetadata', () => {
	it('returns no metadata when dataviews are absent', () => {
		const resource = { name: 'jobs' } as TestResource;

		const result = normalizeResourceDataViewMetadata(resource);

		expect(result.metadata).toBeUndefined();
		expect(result.issues).toHaveLength(0);
	});

	it('produces normalized metadata for valid configuration', () => {
		const resource = createResource();

		const result = normalizeResourceDataViewMetadata(resource);

		expect(result.issues).toHaveLength(0);
		expect(result.metadata?.config.fields).toHaveLength(2);
		expect(result.metadata?.config.views?.[0]).toEqual(
			expect.objectContaining({ id: 'all', isDefault: true })
		);
	});

	it('captures issues when mapQuery is missing', () => {
		const resource = createResource({
			dataviews: {
				mapQuery: undefined,
			},
		});

		const result = normalizeResourceDataViewMetadata(resource);

		expect(result.metadata).toBeUndefined();
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: DATA_VIEWS_METADATA_INVALID,
					path: expect.arrayContaining([
						'ui',
						'admin',
						'view',
						'mapQuery',
					]),
				}),
			])
		);
	});
});

import type { ResourceStorageConfig } from '@wpkernel/core/resource';

import {
	buildWpPostRouteBundle,
	type BuildWpPostRouteBundleOptions,
} from '../bundle';
import type { MutationHelperResource } from '../../mutation';
import type {
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../../../../types';
import type { ResourceMetadataHost } from '../../../../common/metadata/cache';

type WpPostStorage = Extract<ResourceStorageConfig, { mode: 'wp-post' }>;

describe('buildWpPostRouteBundle', () => {
	const storage: WpPostStorage = {
		mode: 'wp-post',
		postType: 'book',
		statuses: ['draft', 'publish'],
		supports: ['title', 'editor'],
		meta: {
			subtitle: { type: 'string' },
		},
		taxonomies: {
			category: { taxonomy: 'category' },
		},
	};

	const resource: MutationHelperResource = {
		name: 'books',
		storage,
	};

	const options: BuildWpPostRouteBundleOptions = {
		resource,
		pascalName: 'Book',
		identity: { type: 'number', param: 'id' },
		errorCodeFactory: (suffix) => `books_${suffix}`,
	};

	it('returns wp-post route handlers, helpers, and metadata', () => {
		const bundle = buildWpPostRouteBundle(options);

		expect(bundle.mutationMetadata).toEqual({
			channelTag: 'resource.wpPost.mutation',
		});

		expect(bundle.helperMethods).toHaveLength(7);
		expect(bundle.helperMethods.map((method) => method.name.name)).toEqual([
			'getBookPostType',
			'getBookStatuses',
			'normaliseBookStatus',
			'resolveBookPost',
			'syncBookMeta',
			'syncBookTaxonomies',
			'prepareBookResponse',
		]);

		const listContext = buildRouteContext('list');
		const listStatements = bundle.routeHandlers.list?.(listContext);
		expect(listStatements).not.toBeNull();
		expect(listStatements).toBeDefined();

		const listMetadata = listContext.getMetadata();
		expect(listMetadata.cache?.events).toEqual([
			{
				scope: 'list',
				operation: 'read',
				segments: ['books', 'list'],
				description: 'List query',
			},
		]);

		const getContext = buildRouteContext('get', {
			method: 'GET',
			path: '/books/:id',
			cacheSegments: ['books', 'get'],
		});
		const getStatements = bundle.routeHandlers.get?.(getContext);
		expect(getStatements).not.toBeNull();
		expect(getStatements).toBeDefined();

		const getMetadata = getContext.getMetadata();
		expect(getMetadata.cache?.events).toEqual([
			{
				scope: 'get',
				operation: 'read',
				segments: ['books', 'get'],
				description: 'Get request',
			},
		]);

		const createStatements = bundle.routeHandlers.create?.(
			buildRouteContext('create')
		);
		expect(createStatements).not.toBeNull();
		expect(createStatements).toBeDefined();

		const updateStatements = bundle.routeHandlers.update?.(
			buildRouteContext('update', {
				method: 'PUT',
				path: '/books/:id',
				cacheSegments: ['books', 'update'],
			})
		);
		expect(updateStatements).not.toBeNull();
		expect(updateStatements).toBeDefined();

		const removeStatements = bundle.routeHandlers.remove?.(
			buildRouteContext('remove', {
				method: 'DELETE',
				path: '/books/:id',
				cacheSegments: ['books', 'remove'],
			})
		);
		expect(removeStatements).not.toBeNull();
		expect(removeStatements).toBeDefined();
	});
});

function buildRouteContext(
	kind: ResourceControllerRouteMetadata['kind'],
	metadataOverrides: Partial<ResourceControllerRouteMetadata> = {}
) {
	const baseMetadata: ResourceControllerMetadata = {
		kind: 'resource-controller',
		name: 'books',
		identity: { type: 'number', param: 'id' },
		routes: [],
	};

	let metadata: ResourceControllerMetadata = baseMetadata;

	const host: ResourceMetadataHost = {
		getMetadata: () => metadata,
		setMetadata: (next) => {
			metadata = next as ResourceControllerMetadata;
		},
	};

	const routeMetadata: ResourceControllerRouteMetadata = {
		method: 'GET',
		path: '/books',
		kind,
		cacheSegments: ['books', kind],
		...metadataOverrides,
	};

	const context = {
		metadata: routeMetadata,
		metadataHost: host,
	} as const;

	return Object.assign(context, {
		getMetadata: () => metadata,
	});
}

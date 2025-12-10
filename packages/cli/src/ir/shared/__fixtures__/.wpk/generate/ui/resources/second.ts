import { defineResource } from '@wpkernel/core/resource';
import type { Second } from '@/types/second';

export const second = defineResource<Second>({
	id: 'res:9f647c5c64faf1fdca9e58ac93ab248908d3538c09b329f43c6a673b41082768',
	controllerClass: 'Test\\Namespace\\Generated\\Rest\\SecondController',
	name: 'second',
	schemaKey: 'auto:second',
	schemaProvenance: 'auto',
	routes: [
		{
			method: 'GET',
			path: 'https://api.example.com/items',
			transport: 'remote',
			hash: {
				algo: 'sha256',
				inputs: ['method', 'path', 'capability', 'transport'],
				value: '272f956856c8d0150260c37d964dfad23abe9b5cac303b8d158972956d4be7b2',
			},
		},
	],
	cacheKeys: {
		list: {
			source: 'default',
			segments: ['second', 'list', '{}'],
		},
		get: {
			source: 'default',
			segments: ['second', 'get', '__wpk_id__'],
		},
	},
	hash: {
		algo: 'sha256',
		inputs: [
			'name',
			'schemaKey',
			'schemaProvenance',
			'routes',
			'cacheKeys',
			'identity',
			'storage',
			'queryParams',
			'ui',
			'blocks',
		],
		value: '3c8a4566647fbacc6dfc0d7e8ce078dbd961e5ff15c4d3c86ddc675041cd5a5a',
	},
	warnings: [
		{
			code: 'identity.inference.missing',
			message:
				'Unable to infer identity for resource "second". Define resource.identity explicitly.',
			context: {
				resource: 'second',
			},
		},
		{
			code: 'route.remote.absolute',
			message:
				'Route list for resource "second" points to a remote transport (absolute URL).',
			context: {
				resource: 'second',
				route: 'list',
				path: 'https://api.example.com/items',
			},
		},
	],
});

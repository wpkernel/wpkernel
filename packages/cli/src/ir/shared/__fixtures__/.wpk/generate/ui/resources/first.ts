import { defineResource } from '@wpkernel/core/resource';
import type { First } from '@/types/first';

export const first = defineResource<First>({
	id: 'res:2b2c3b26fafbad9ea075f386401355753e02582da6ca8a0d3b6ce4c9d7addd0f',
	controllerClass: 'Test\\Namespace\\Generated\\Rest\\FirstController',
	name: 'first',
	schemaKey: 'auto:first',
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
			segments: ['first', 'list', '{}'],
		},
		get: {
			source: 'default',
			segments: ['first', 'get', '__wpk_id__'],
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
		value: '57d72717277bd78e7a33ffeb31a41c2abb0841becae19485ddceccfe3e2d0708',
	},
	warnings: [
		{
			code: 'identity.inference.missing',
			message:
				'Unable to infer identity for resource "first". Define resource.identity explicitly.',
			context: {
				resource: 'first',
			},
		},
		{
			code: 'route.remote.absolute',
			message:
				'Route list for resource "first" points to a remote transport (absolute URL).',
			context: {
				resource: 'first',
				route: 'list',
				path: 'https://api.example.com/items',
			},
		},
	],
});

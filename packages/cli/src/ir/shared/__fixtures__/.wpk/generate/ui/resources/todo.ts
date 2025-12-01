import { defineResource } from '@wpkernel/core/resource';
import type { Todo } from '@/types/todo';

export const todo = defineResource<Todo>({
	id: 'res:d89a55c24827f61140ab923e9a500d550d0630a7acc2f4de13765fbebe3c782b',
	controllerClass: 'Test\\Namespace\\Generated\\Rest\\TodoController',
	name: 'todo',
	schemaKey: 'todo',
	schemaProvenance: 'manual',
	routes: [
		{
			method: 'GET',
			path: '/test-namespace/v1/items',
			transport: 'local',
			hash: {
				algo: 'sha256',
				inputs: ['method', 'path', 'capability', 'transport'],
				value: 'bd23a154d94281829fc85144b610f5f58db992f1855f6049c47e4bb119c71e6a',
			},
		},
	],
	cacheKeys: {
		list: {
			source: 'default',
			segments: ['todo', 'list', '{}'],
		},
		get: {
			source: 'default',
			segments: ['todo', 'get', '__wpk_id__'],
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
		value: 'c6ca84c15ea5d9bbbb416e51f4f89fbf679145dbcbf54611bca0e7bad2c66968',
	},
	warnings: [
		{
			code: 'identity.inference.missing',
			message:
				'Unable to infer identity for resource "todo". Define resource.identity explicitly.',
			context: {
				resource: 'todo',
			},
		},
	],
});

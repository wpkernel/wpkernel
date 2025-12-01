import { defineResource } from '@wpkernel/core/resource';
import type { Job } from '@/types/job';

export const job = defineResource<Job>({
	id: 'res:abd9387afd9701f23bbd9d38e8093e2d2e2797d2048651400a99fc118f8932f7',
	controllerClass: 'Test\\Namespace\\Generated\\Rest\\JobController',
	name: 'job',
	schemaKey: 'auto:job',
	schemaProvenance: 'auto',
	routes: [
		{
			method: 'GET',
			path: '/test-namespace/v1/jobs',
			transport: 'local',
			hash: {
				algo: 'sha256',
				inputs: ['method', 'path', 'capability', 'transport'],
				value: 'de8202e72ec5d509ca99e1297370dcf2589f131d003986f0a279300607ec1e3e',
			},
		},
	],
	cacheKeys: {
		list: {
			source: 'default',
			segments: ['job', 'list', '{}'],
		},
		get: {
			source: 'default',
			segments: ['job', 'get', '__wpk_id__'],
		},
	},
	storage: {
		mode: 'wp-post',
		meta: {
			department: {
				type: 'string',
				single: true,
			},
			tags: {
				type: 'string',
				single: false,
			},
		},
		postType: 'test_namespace_job',
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
		value: '9eb072166c07e62afce6ab4149aa040a4a481153fb78ac02f4b1d958bb17efa0',
	},
	warnings: [
		{
			code: 'identity.inference.missing',
			message:
				'Unable to infer identity for resource "job". Define resource.identity explicitly.',
			context: {
				resource: 'job',
			},
		},
	],
});

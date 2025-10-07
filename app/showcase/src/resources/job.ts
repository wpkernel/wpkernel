import { defineResource } from '@geekist/wp-kernel';
import type { Job } from '../../types/job';

/**
 * Query parameters for job listing endpoint.
 */
export type JobListParams = {
	q?: string;
	department?: string;
	location?: string;
	status?: 'draft' | 'publish' | 'closed';
	cursor?: string;
};

/**
 * Resource definition for job postings.
 */
export const job = defineResource<Job, JobListParams>({
	name: 'job',
	routes: {
		list: {
			path: '/wp-kernel-showcase/v1/jobs',
			method: 'GET',
		},
		get: {
			path: '/wp-kernel-showcase/v1/jobs/:id',
			method: 'GET',
		},
		create: {
			path: '/wp-kernel-showcase/v1/jobs',
			method: 'POST',
		},
		update: {
			path: '/wp-kernel-showcase/v1/jobs/:id',
			method: 'PUT',
		},
		remove: {
			path: '/wp-kernel-showcase/v1/jobs/:id',
			method: 'DELETE',
		},
	},
	cacheKeys: {
		list: (params?: unknown) => {
			const query = params as JobListParams | undefined;
			return [
				'job',
				'list',
				query?.q,
				query?.department,
				query?.location,
				query?.status,
				query?.cursor,
			];
		},
		get: (params?: string | number) => ['job', 'get', params],
	},
});

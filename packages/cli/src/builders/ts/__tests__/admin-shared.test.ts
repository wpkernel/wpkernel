import {
	resolveInteractivityFeature,
	resolveListRoutePath,
} from '../admin-shared';
import type { ResourceDescriptor } from '../types';

const makeDescriptor = (
	overrides: Partial<ResourceDescriptor> = {}
): ResourceDescriptor => ({
	key: 'job',
	name: 'Job',
	resource: {
		name: 'Job',
		routes: [],
	} as any,
	adminView: 'dataviews',
	dataviews: undefined as any,
	...overrides,
});

describe('admin-shared helpers', () => {
	it('prefers custom interactivity feature and trims whitespace', () => {
		const feature = resolveInteractivityFeature(
			makeDescriptor({
				dataviews: { interactivity: { feature: '  custom  ' } } as any,
			})
		);
		expect(feature).toBe('custom');
	});

	it('falls back to admin-screen interactivity feature when missing/empty', () => {
		expect(resolveInteractivityFeature(makeDescriptor())).toBe(
			'admin-screen'
		);
		expect(
			resolveInteractivityFeature(
				makeDescriptor({
					dataviews: { interactivity: { feature: '   ' } } as any,
				})
			)
		).toBe('admin-screen');
	});

	it('returns list route for first GET without params', () => {
		const descriptor = makeDescriptor({
			resource: {
				routes: [
					{ method: 'POST', path: '/v1/job' },
					{ method: 'GET', path: '/v1/job' },
					{ method: 'GET', path: '/v1/job/:id' },
				],
			} as any,
		});
		expect(resolveListRoutePath(descriptor)).toBe('/v1/job');
	});

	it('skips routes containing params or templated segments', () => {
		const descriptor = makeDescriptor({
			resource: {
				routes: [
					{ method: 'GET', path: '/v1/job/:id' },
					{ method: 'GET', path: '/v1/job/(?P<id>\\d+)' },
					{ method: 'GET', path: '/v1/job/{id}' },
				],
			} as any,
		});
		expect(resolveListRoutePath(descriptor)).toBeNull();
	});
});

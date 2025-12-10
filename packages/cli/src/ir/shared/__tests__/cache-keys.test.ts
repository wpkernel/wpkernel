import {
	deriveCacheKeys,
	createDefaultCacheKeySegments,
	serializeCacheKeys,
} from '../cache-keys';
import { createDefaultResource } from '@cli-tests/ir/resource-builder.mock';

describe('cache-keys utilities', () => {
	it('derives default cache key descriptors', () => {
		const cacheKeys = deriveCacheKeys('demo');

		expect(cacheKeys.list).toEqual({
			source: 'default',
			segments: ['demo', 'list', '{}'],
		});
		expect(cacheKeys.get).toEqual({
			source: 'default',
			segments: ['demo', 'get', '__wpk_id__'],
		});
		expect(cacheKeys.create).toBeUndefined();
		expect(cacheKeys.update).toBeUndefined();
		expect(cacheKeys.remove).toBeUndefined();
	});

	it('creates frozen default segments', () => {
		const defaults = createDefaultCacheKeySegments('demo');

		expect(Object.isFrozen(defaults.list)).toBe(true);
		expect(defaults.list).toEqual(['demo', 'list', '{}']);
	});

	it('serializes all cache key operations when present', () => {
		const resource = createDefaultResource();
		const cacheKeys = resource.cacheKeys;

		const serialised = serializeCacheKeys(cacheKeys);
		expect(serialised).toEqual({
			list: cacheKeys.list,
			get: cacheKeys.get,
			create: cacheKeys.create,
			update: cacheKeys.update,
			remove: cacheKeys.remove,
		});
	});

	it('omits optional entries when undefined', () => {
		const resource = createDefaultResource();
		const cacheKeys = {
			list: resource.cacheKeys.list,
			get: resource.cacheKeys.get,
		} as typeof resource.cacheKeys;

		const serialised = serializeCacheKeys(cacheKeys);
		expect(serialised).toEqual({
			list: cacheKeys.list,
			get: cacheKeys.get,
		});
	});
});

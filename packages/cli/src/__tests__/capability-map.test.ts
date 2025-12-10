import { defineCapabilityMap } from '../ir/types';

describe('defineCapabilityMap', () => {
	it('returns provided map without modification', () => {
		const map = defineCapabilityMap({
			'demo.read': 'read',
			'demo.write': {
				capability: 'edit_demo',
				appliesTo: 'object',
				binding: 'id',
			},
		});

		expect(map).toEqual({
			'demo.read': 'read',
			'demo.write': {
				capability: 'edit_demo',
				appliesTo: 'object',
				binding: 'id',
			},
		});
	});
});

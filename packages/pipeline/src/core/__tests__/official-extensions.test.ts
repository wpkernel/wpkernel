import { OFFICIAL_EXTENSION_BLUEPRINTS } from '../extensions/official';

describe('OFFICIAL_EXTENSION_BLUEPRINTS', () => {
	it('exposes official extension metadata', () => {
		expect(OFFICIAL_EXTENSION_BLUEPRINTS.length).toBeGreaterThan(0);
		expect(OFFICIAL_EXTENSION_BLUEPRINTS[0]?.id).toBeDefined();
	});
});

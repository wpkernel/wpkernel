import * as irSurface from '../index';
import {
	createIr,
	registerCoreBuilders,
	registerCoreFragments,
} from '../createIr';
import { createMetaFragment } from '../fragments/meta';
import {
	createSchemasFragment,
	SCHEMA_EXTENSION_KEY,
} from '../fragments/schemas';
import { createResourcesFragment } from '../fragments/resources';
import { createCapabilitiesFragment } from '../fragments/capabilities';
import { createCapabilityMapFragment } from '../fragments/capability-map';
import { createDiagnosticsFragment } from '../fragments/diagnostics';
import { createBlocksFragment } from '../fragments/blocks';
import { createOrderingFragment } from '../fragments/ordering';
import { createValidationFragment } from '../fragments/validation';

describe('next IR public surface', () => {
	it('re-exports the createIr entrypoint', () => {
		expect(irSurface.createIr).toBe(createIr);
		expect(irSurface.registerCoreBuilders).toBe(registerCoreBuilders);
		expect(irSurface.registerCoreFragments).toBe(registerCoreFragments);
	});

	it('exposes key fragment builders', () => {
		expect(irSurface.createMetaFragment).toBe(createMetaFragment);
		expect(irSurface.createSchemasFragment).toBe(createSchemasFragment);
		expect(irSurface.SCHEMA_EXTENSION_KEY).toBe(SCHEMA_EXTENSION_KEY);
		expect(irSurface.createResourcesFragment).toBe(createResourcesFragment);
		expect(irSurface.createCapabilitiesFragment).toBe(
			createCapabilitiesFragment
		);
		expect(irSurface.createCapabilityMapFragment).toBe(
			createCapabilityMapFragment
		);
		expect(irSurface.createDiagnosticsFragment).toBe(
			createDiagnosticsFragment
		);
		expect(irSurface.createBlocksFragment).toBe(createBlocksFragment);
		expect(irSurface.createOrderingFragment).toBe(createOrderingFragment);
		expect(irSurface.createValidationFragment).toBe(
			createValidationFragment
		);
	});
});

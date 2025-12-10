import * as irSurface from '../index';
import {
	createIr,
	registerCoreBuilders,
	registerCoreFragments,
} from '../createIr';
import { createMetaFragment } from '../fragments/ir.meta.core';
import {
	createSchemasFragment,
	SCHEMA_EXTENSION_KEY,
} from '../fragments/ir.schemas.core';
import { createResourcesFragment } from '../fragments/ir.resources.core';
import { createCapabilitiesFragment } from '../fragments/ir.capabilities.core';
import { createCapabilityMapFragment } from '../fragments/ir.capability-map.core';
import { createDiagnosticsFragment } from '../fragments/ir.diagnostics.core';
import { createBlocksFragment } from '../fragments/ir.blocks.core';
import { createOrderingFragment } from '../fragments/ir.ordering.core';
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

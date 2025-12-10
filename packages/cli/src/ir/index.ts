export {
	createIrWithBuilders,
	createIr,
	registerCoreFragments,
	registerCoreBuilders,
} from './createIr';
export type { CreateIrEnvironment } from './createIr';
export {
	createMetaFragment,
	META_EXTENSION_KEY,
} from './fragments/ir.meta.core';
export {
	createSchemasFragment,
	SCHEMA_EXTENSION_KEY,
} from './fragments/ir.schemas.core';
export { createResourcesFragment } from './fragments/ir.resources.core';
export { createCapabilitiesFragment } from './fragments/ir.capabilities.core';
export { createCapabilityMapFragment } from './fragments/ir.capability-map.core';
export { createDiagnosticsFragment } from './fragments/ir.diagnostics.core';
export { createBlocksFragment } from './fragments/ir.blocks.core';
export { createOrderingFragment } from './fragments/ir.ordering.core';
export { createLayoutFragment } from './fragments/ir.layout.core';
export { createValidationFragment } from './fragments/validation';
export type {
	IRDiagnostic,
	IRDiagnosticSeverity,
	MutableIr,
	IrFragment,
	IrFragmentInput,
	IrFragmentOutput,
} from './types';
export type {
	IRBlock,
	IRPhpProject,
	IRCapabilityDefinition,
	IRCapabilityHint,
	IRCapabilityMap,
	IRCapabilityScope,
	IRResource,
	IRResourceCacheKey,
	FragmentIrOptions,
	IRRoute,
	IRRouteTransport,
	IRSchema,
	IRv1,
	IRWarning,
	SchemaProvenance,
} from './publicTypes';

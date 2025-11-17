export {
	createIr,
	registerCoreFragments,
	registerCoreBuilders,
} from './createIr';
export type { CreateIrEnvironment } from './createIr';
export { buildIr } from './buildIr';
export { createMetaFragment, META_EXTENSION_KEY } from './fragments/meta';
export {
	createSchemasFragment,
	SCHEMA_EXTENSION_KEY,
} from './fragments/schemas';
export { createResourcesFragment } from './fragments/resources';
export { createCapabilitiesFragment } from './fragments/capabilities';
export { createCapabilityMapFragment } from './fragments/capability-map';
export { createDiagnosticsFragment } from './fragments/diagnostics';
export { createBlocksFragment } from './fragments/blocks';
export { createOrderingFragment } from './fragments/ordering';
export { createLayoutFragment } from './fragments/layout';
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
	BuildIrOptions,
	IRBlock,
	IRPhpProject,
	IRCapabilityDefinition,
	IRCapabilityHint,
	IRCapabilityMap,
	IRCapabilityScope,
	IRResource,
	IRResourceCacheKey,
	IRRoute,
	IRRouteTransport,
	IRSchema,
	IRv1,
	IRWarning,
	SchemaProvenance,
} from './publicTypes';

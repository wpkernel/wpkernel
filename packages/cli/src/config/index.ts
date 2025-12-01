/**
 * WPKernel config types and utilities.
 */
export type {
	WPKernelConfigV1,
	SchemaConfig,
	AdaptersConfig,
	PhpAdapterConfig,
	PhpAdapterFactory,
	AdapterContext,
	AdapterExtension,
	AdapterExtensionContext,
	AdapterExtensionFactory,
	ConfigOrigin,
	LoadedWPKernelConfig,
	SchemaRegistry,
	ResourceRegistry,
} from './types';

export { loadWPKernelConfig } from './load-wpk-config';
export { validateWPKernelConfig } from './validate-wpk-config';

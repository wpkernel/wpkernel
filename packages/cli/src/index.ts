/**
 * Top-level exports for the `@wpkernel/cli` package.
 *
 * This module re-exports the public surface of the CLI package so
 * documentation generators can build consistent API pages alongside the
 * wpk and UI packages.
 *
 * @module @wpkernel/cli
 */
/**
 * The current version of the `@wpkernel/cli` package.
 *
 * @category CLI
 */
export { VERSION } from './version';
/**
 * Runs the WPKernel CLI application.
 *
 * This is the main entry point for executing CLI commands.
 *
 * @category CLI
 * @param    args - Command-line arguments.
 * @param    cwd  - The current working directory.
 * @returns A promise that resolves to the exit code of the CLI process.
 */
export { runCli } from './cli/run';

export type {
	WPKernelConfigV1,
	SchemaConfig,
	SchemaRegistry,
	ResourceRegistry,
	AdaptersConfig,
	PhpAdapterConfig,
	PhpAdapterFactory,
	AdapterContext,
	AdapterExtension,
	AdapterExtensionContext,
	AdapterExtensionFactory,
	ConfigOrigin,
	LoadedWPKernelConfig,
} from './config';

export {
	defineCapabilityMap,
	type CapabilityCapabilityDescriptor,
	type CapabilityMapDefinition,
	type CapabilityMapEntry,
	type CapabilityMapScope,
} from './capability-map';

export type {
	IRv1,
	IRSchema,
	IRResource,
	IRRoute,
	IRCapabilityHint,
	IRBlock,
	IRPhpProject,
	BuildIrOptions,
} from './ir/publicTypes';
export type {
	Helper,
	HelperApplyFn,
	HelperApplyOptions,
	HelperDescriptor,
	HelperKind,
	HelperMode,
	CreateHelperOptions,
} from '@wpkernel/pipeline';
export * from './runtime';
export * from './ir';
export * from './builders';
export * from './workspace';
export * from './commands';
export * from './dx';
// export * from './utils';

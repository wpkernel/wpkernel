/**
 * Creates a PHP driver installer helper.
 *
 * This helper is responsible for ensuring that the PHP driver is correctly
 * installed and available for use within the project.
 *
 * @category PHP Driver
 */
export { createPhpDriverInstaller } from './installer';
export type { DriverContext, DriverHelper } from './installer';
/**
 * Builds a PHP code pretty printer instance.
 *
 * This function provides a way to format PHP code consistently, which is
 * crucial for generated code readability and maintainability.
 *
 * @category PHP Driver
 */
export {
	buildPhpPrettyPrinter,
	resolvePrettyPrintScriptPath,
} from './prettyPrinter/createPhpPrettyPrinter';
export type {
	DriverWorkspace,
	WorkspaceLike,
	PhpPrettyPrintPayload,
	PhpPrettyPrintResult,
	PhpPrettyPrinter,
} from './types';

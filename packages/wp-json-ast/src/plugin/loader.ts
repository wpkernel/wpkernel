import {
	buildDeclare,
	buildDeclareItem,
	buildScalarInt,
	type PhpProgram,
} from '@wpkernel/php-json-ast';
import { buildPluginHeaderStatement } from './header';
import type { PluginLoaderProgramConfig } from './types';
import { buildNamespaceStatements } from './helpers';

/**
 * Build the plugin loader program for a generated plugin.
 *
 * This orchestrates header, namespace guards, controller registration, UI wiring,
 * and bootstrap hooks. Heavy lifting lives in loader/* modules to keep this file concise.
 * @param config
 */
export function buildPluginLoaderProgram(
	config: PluginLoaderProgramConfig
): PhpProgram {
	const pluginHeader = buildPluginHeaderStatement(config);
	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);

	const namespaceStatements = buildNamespaceStatements(config);

	return [pluginHeader, strictTypes, namespaceStatements];
}

import {
	buildClass,
	buildIdentifier,
	PHP_CLASS_MODIFIER_FINAL,
	type PhpStmtClass,
} from '@wpkernel/php-json-ast';

import type { CapabilityMapConfig } from './types';
import { buildCallbackMethod } from './callback';
import { buildEnforceMethod, buildResolveCapabilityMethod } from './enforce';
import { buildFallbackMethod, buildCapabilityMapMethod } from './map';
import {
	buildCreateErrorMethod,
	buildGetBindingMethod,
	buildGetDefinitionMethod,
} from './lookup';

interface BuildCapabilityClassOptions {
	readonly capabilityMap: CapabilityMapConfig;
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildCapabilityClass(
	options: BuildCapabilityClassOptions
): PhpStmtClass {
	const { capabilityMap } = options;
	const methods = [
		buildCapabilityMapMethod(capabilityMap.definitions),
		buildFallbackMethod(capabilityMap.fallback),
		buildCallbackMethod(),
		buildResolveCapabilityMethod(),
		buildEnforceMethod(),
		buildGetDefinitionMethod(),
		buildGetBindingMethod(),
		buildCreateErrorMethod(),
	];

	return buildClass(buildIdentifier('Capability'), {
		flags: PHP_CLASS_MODIFIER_FINAL,
		stmts: methods,
	});
}

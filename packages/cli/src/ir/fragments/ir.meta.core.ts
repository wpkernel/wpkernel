import path from 'node:path';
import { sanitizeNamespace } from '@wpkernel/core/namespace';
import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import { createPhpNamespace } from '../shared/php';
import { buildPluginMeta } from '../shared/pluginMeta';
import { toWorkspaceRelative } from '../../workspace';
import type { WPKernelConfigV1 } from '../../config';

/**
 * The extension key for the meta fragment.
 *
 * @category IR
 */
export const META_EXTENSION_KEY = 'ir.meta.core';

/**
 * Creates an IR fragment that processes and assigns metadata to the IR.
 *
 * This fragment sanitizes the project namespace, determines source paths and origins,
 * and sets up the basic PHP configuration for the generated output.
 *
 * @category IR
 * @returns An `IrFragment` instance for meta information.
 */
export function createMetaFragment(): IrFragment {
	return createHelper({
		key: META_EXTENSION_KEY,
		kind: 'fragment',
		mode: 'override',
		dependsOn: ['ir.layout.core'],
		async apply({ input, output, context }: IrFragmentApplyOptions) {
			const sanitizedNamespace = sanitizeNamespace(
				input.options.namespace
			);
			if (!sanitizedNamespace) {
				throw new WPKernelError('ValidationError', {
					message: `Unable to sanitise namespace "${input.options.namespace}" during IR construction.`,
					context: {
						namespace: input.options.namespace,
					},
				});
			}

			if (!input.draft.layout) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Layout fragment must run before meta fragment to provide paths.',
				});
			}

			const meta = {
				version: 1 as const,
				namespace: input.options.namespace,
				sourcePath: toWorkspaceRelative(
					context.workspace.root,
					input.options.sourcePath
				),
				origin: input.options.origin,
				sanitizedNamespace,
				plugin: buildPluginMeta({
					sanitizedNamespace,
					configMeta: input.options.config.meta,
				}),
				features: enumerateFeatures(input.options.config),
				ids: {
					algorithm: 'sha256' as const,
					resourcePrefix: 'res:' as const,
					schemaPrefix: 'sch:' as const,
					blockPrefix: 'blk:' as const,
					capabilityPrefix: 'cap:' as const,
				},
				redactions: ['config.env', 'adapters.secrets'],
				limits: {
					maxConfigKB: 256,
					maxSchemaKB: 1024,
					policy: 'truncate' as const,
				},
			};

			output.assign({
				meta,
				php: {
					namespace: createPhpNamespace(sanitizedNamespace),
					autoload: deriveAutoloadRoot(input.draft.layout.resolve),
					outputDir: input.draft.layout.resolve('php.generated'),
				},
			});

			input.draft.extensions[META_EXTENSION_KEY] = { sanitizedNamespace };
		},
	});
}

function deriveAutoloadRoot(resolveLayout: (id: string) => string): string {
	try {
		const controllersPath = resolveLayout('controllers.applied');
		const dirname = path.posix.dirname(controllersPath);
		if (!dirname || dirname === '.') {
			return '';
		}
		return dirname.endsWith('/') ? dirname : `${dirname}/`;
	} catch {
		// Default to legacy autoload root when layout lacks a controllers entry.
		return 'inc/';
	}
}
const BASE_FEATURES = ['capabilityMap', 'phpAutoload'] as const;
/**
 * Determine the IR feature set derived from the loaded config.
 *
 * @param config - Loaded workspace configuration
 */

export function enumerateFeatures(config: WPKernelConfigV1): string[] {
	const features = new Set<string>(BASE_FEATURES);

	if (Object.keys(config.resources ?? {}).length > 0) {
		features.add('resources');
	}

	if (Object.keys(config.schemas ?? {}).length > 0) {
		features.add('schemas');
	}

	const hasUi = Object.values(config.resources ?? {}).some((resource) =>
		Boolean(resource.ui)
	);
	if (hasUi) {
		features.add('uiRegistry');
	}

	return Array.from(features).sort();
}

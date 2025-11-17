import { sanitizeNamespace } from '@wpkernel/core/namespace';
import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import { toWorkspaceRelative } from '../../utils';
import { createPhpNamespace } from '../shared/php';
import { enumerateFeatures } from '../shared/features';

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
		key: 'ir.meta.core',
		kind: 'fragment',
		mode: 'override',
		dependsOn: ['ir.layout.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
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
				sourcePath: toWorkspaceRelative(input.options.sourcePath),
				origin: input.options.origin,
				sanitizedNamespace,
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
					autoload: 'inc/',
					outputDir: input.draft.layout.resolve('php.generated'),
				},
			});

			input.draft.extensions[META_EXTENSION_KEY] = { sanitizedNamespace };
		},
	});
}

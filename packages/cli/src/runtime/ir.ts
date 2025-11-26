import { WPKernelError } from '@wpkernel/core/error';
import type { IRv1 } from '../ir/publicTypes';
import type { BuilderInput } from './types';

/**
 * Narrowing helper for builders that require the finalized IR.
 *
 * Usage:
 * ```ts
 * const { ir, resources, capabilityMap } = requireIr(input, [
 *   'resources',
 *   'capabilityMap',
 * ]);
 * ```
 * Throws a developer-facing error if `input.ir` is null.
 * @param input
 * @param keys
 */
export function requireIr<K extends keyof IRv1>(
	input: BuilderInput,
	keys?: readonly K[]
): { ir: IRv1 } & Pick<IRv1, K> {
	const ir = input.ir;
	if (!ir) {
		throw new WPKernelError('DeveloperError', {
			message:
				'IR is required for this builder; declare appropriate dependsOn and ensure IR fragments run first.',
			context: { phase: input.phase },
		});
	}

	if (!keys || keys.length === 0) {
		return { ir } as { ir: IRv1 } & Pick<IRv1, K>;
	}

	const slice = keys.reduce(
		(acc, key) => {
			(acc as Pick<IRv1, K>)[key] = ir[key];
			return acc;
		},
		{} as Pick<IRv1, K>
	);

	return { ir, ...slice };
}

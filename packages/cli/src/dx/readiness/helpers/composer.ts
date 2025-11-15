import fs from 'node:fs/promises';
import { resolveBundledComposerAutoloadPath } from '../../../utils/phpAssets';
import { createReadinessHelper } from '../helper';
import type {
	ReadinessDetection,
	ReadinessConfirmation,
	ReadinessHelper,
} from '../types';
import type { DxContext } from '../../context';

export interface ComposerHelperDependencies {
	readonly pathExists: (candidate: string) => Promise<boolean>;
}

export interface ComposerReadinessState {
	readonly autoloadPath: string | null;
	readonly sourcePackage: string | null;
}

function defaultDependencies(): ComposerHelperDependencies {
	return {
		async pathExists(candidate: string): Promise<boolean> {
			try {
				await fs.access(candidate);
				return true;
			} catch (error) {
				if (
					error &&
					typeof error === 'object' &&
					'code' in (error as { code?: unknown }) &&
					(error as { code?: string }).code === 'ENOENT'
				) {
					return false;
				}

				throw error;
			}
		},
	} satisfies ComposerHelperDependencies;
}

async function resolveBundledAutoload(
	dependencies: ComposerHelperDependencies
): Promise<{ path: string; sourcePackage: string } | null> {
	const autoloadPath = resolveBundledComposerAutoloadPath();
	const exists = await dependencies.pathExists(autoloadPath);

	if (exists) {
		return { path: autoloadPath, sourcePackage: '@wpkernel/php-json-ast' };
	}

	return null;
}

export function createComposerReadinessHelper(
	overrides: Partial<ComposerHelperDependencies> = {}
): ReadinessHelper<ComposerReadinessState> {
	const dependencies = {
		...defaultDependencies(),
		...overrides,
	} satisfies ComposerHelperDependencies;

	return createReadinessHelper<ComposerReadinessState>({
		key: 'composer',
		metadata: {
			label: 'Bundled PHP autoload',
			description:
				'Validates that the CLI ships the composer autoload metadata required by bundled PHP helpers.',
			tags: ['composer', 'php'],
			scopes: ['create', 'init', 'generate', 'apply', 'doctor'],
			order: 30,
		},
		async detect(
			_context: DxContext
		): Promise<ReadinessDetection<ComposerReadinessState>> {
			const bundled = await resolveBundledAutoload(dependencies);

			if (bundled) {
				return {
					status: 'ready',
					state: {
						autoloadPath: bundled.path,
						sourcePackage: bundled.sourcePackage,
					},
					message: 'Bundled composer autoload detected.',
				};
			}

			return {
				status: 'pending',
				state: {
					autoloadPath: null,
					sourcePackage: null,
				},
				message:
					'Bundled composer autoload missing from PHP assets package.',
			};
		},
		async confirm(
			_context: DxContext,
			state: ComposerReadinessState
		): Promise<ReadinessConfirmation<ComposerReadinessState>> {
			const exists = state.autoloadPath
				? await dependencies.pathExists(state.autoloadPath)
				: false;

			return {
				status: exists ? 'ready' : 'pending',
				state,
				message: exists
					? 'Bundled composer autoload ready.'
					: 'Bundled composer autoload missing.',
			};
		},
	});
}

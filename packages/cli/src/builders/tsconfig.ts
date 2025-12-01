import path from 'node:path';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import { createHelper } from '../runtime';
import type { BuilderApplyOptions, BuilderHelper } from '../runtime/types';
import type { IRv1 } from '../ir/publicTypes';

function normalise(value: string): string {
	return value.replace(/\\/g, '/');
}

function safeResolve(ir: IRv1 | null | undefined, key: string): string | null {
	if (!ir?.layout) {
		return null;
	}

	try {
		return ir.layout.resolve(key);
	} catch {
		return null;
	}
}

function relativeFromWorkspace(
	workspaceRoot: string,
	target: string | null
): string | null {
	if (!target) {
		return null;
	}

	return normalise(path.relative(workspaceRoot, target));
}

export function createTsConfigBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.tsconfig',
		kind: 'builder',
		dependsOn: ['ir.layout.core'],
		async apply({ context, input, reporter }: BuilderApplyOptions) {
			if (input.phase !== 'generate') {
				return;
			}

			const workspaceRoot = normalise(context.workspace.root);
			const uiApplied = relativeFromWorkspace(
				workspaceRoot,
				safeResolve(input.ir, 'ui.applied')
			);
			const blocksApplied = relativeFromWorkspace(
				workspaceRoot,
				safeResolve(input.ir, 'blocks.applied')
			);
			const controllersApplied = relativeFromWorkspace(
				workspaceRoot,
				safeResolve(input.ir, 'controllers.applied')
			);
			const wpkBundlerConfig = safeResolve(input.ir, 'bundler.config');
			const wpkRoot = wpkBundlerConfig
				? normalise(path.dirname(wpkBundlerConfig))
				: null;

			const extendsPath = normalise(
				path.relative(
					workspaceRoot,
					path.join(workspaceRoot, '..', '..', 'tsconfig.base.json')
				)
			);

			const include = [
				...(uiApplied ? [`${uiApplied}/**/*`] : []),
				...(blocksApplied ? [`${blocksApplied}/**/*`] : []),
				...(controllersApplied ? [`${controllersApplied}/**/*`] : []),
				WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			];

			const exclude = [
				'node_modules',
				'dist',
				'build',
				...(wpkRoot
					? [
							normalise(path.relative(workspaceRoot, wpkRoot)) +
								'/**/*',
						]
					: []),
			];

			const paths: Record<string, string[]> = {};
			if (uiApplied) {
				paths['@/*'] = [`${uiApplied}/*`];
				paths['@/admin/*'] = [`${uiApplied}/admin/*`];
				paths['@/resources/*'] = [`${uiApplied}/resources/*`];
			}

			const tsconfig = {
				$schema: 'https://json.schemastore.org/tsconfig',
				extends: extendsPath,
				compilerOptions: {
					target: 'ES2022',
					module: 'ESNext',
					moduleResolution: 'Bundler',
					jsx: 'react',
					jsxFactory: 'wp.element.createElement',
					jsxFragmentFactory: 'wp.element.Fragment',
					strict: true,
					esModuleInterop: true,
					moduleDetection: 'force',
					resolveJsonModule: true,
					skipLibCheck: true,
					types: ['node', '@wordpress/element'],
					baseUrl: '.',
					...(Object.keys(paths).length > 0 ? { paths } : {}),
				},
				include,
				exclude,
			};

			const file = 'tsconfig.app.json';
			await context.workspace.writeJson(file, tsconfig, { pretty: true });

			reporter.debug('Generated layout-aware tsconfig.', { file });
		},
	});
}

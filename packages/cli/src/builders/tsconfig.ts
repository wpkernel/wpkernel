import path from 'node:path';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import { createHelper } from '../runtime';
import type { BuilderApplyOptions, BuilderHelper } from '../runtime/types';
import type {
	IRBlockPlan,
	IRPhpControllerPlan,
	IRSurfacePlan,
} from '../ir/publicTypes';

function normalise(value: string): string {
	return value.replace(/\\/g, '/');
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
		dependsOn: ['ir.artifacts.plan'],
		async apply({ context, input, reporter }: BuilderApplyOptions) {
			if (input.phase !== 'generate') {
				return;
			}

			if (!input.ir?.artifacts) {
				reporter.debug(
					'Skipping tsconfig generation; missing artifacts.'
				);
				return;
			}

			const { artifacts } = input.ir;
			const workspaceRoot = normalise(context.workspace.root);
			const surfaceDirs = collectSurfaceDirs(artifacts.surfaces);
			const blocksAppliedDirs = collectBlockDirs(artifacts.blocks);
			const controllerDirs = collectControllerDirs(
				artifacts.php.controllers
			);
			const wpkBundlerConfig = artifacts.bundler.configPath;
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
				...surfaceDirs.map(
					(dir) => `${relativeFromWorkspace(workspaceRoot, dir)}/**/*`
				),
				...blocksAppliedDirs.map(
					(dir) => `${relativeFromWorkspace(workspaceRoot, dir)}/**/*`
				),
				...controllerDirs.map(
					(dir) => `${relativeFromWorkspace(workspaceRoot, dir)}/**/*`
				),
				WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			].filter(Boolean) as string[];

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
			const aliasRoot = surfaceDirs[0];
			if (aliasRoot) {
				const rel = relativeFromWorkspace(workspaceRoot, aliasRoot);
				paths['@/*'] = [`${rel}/*`];
				paths['@/admin/*'] = [`${rel}/admin/*`];
				paths['@/resources/*'] = [`${rel}/resources/*`];
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

function collectSurfaceDirs(surfaces: Record<string, IRSurfacePlan>): string[] {
	const dirs = new Set<string>();
	for (const surface of Object.values(surfaces ?? {})) {
		if (surface.appDir) {
			dirs.add(surface.appDir);
		}
	}
	return Array.from(dirs);
}

function collectBlockDirs(blocks: Record<string, IRBlockPlan>): string[] {
	const dirs = new Set<string>();
	for (const block of Object.values(blocks ?? {})) {
		if (block.appliedDir) {
			dirs.add(block.appliedDir);
		}
	}
	return Array.from(dirs);
}

function collectControllerDirs(
	controllers: Record<string, IRPhpControllerPlan>
): string[] {
	const dirs = new Set<string>();
	for (const controller of Object.values(controllers ?? {})) {
		if (controller.appliedPath) {
			dirs.add(path.posix.dirname(controller.appliedPath));
		}
	}
	return Array.from(dirs);
}

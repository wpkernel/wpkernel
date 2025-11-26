import path from 'node:path';
import { resolveBundlerPaths } from './bundler.paths';
import type {
	BuilderApplyOptions,
	BuilderOutput,
	PipelineContext,
	BuilderInput,
} from '../runtime/types';
import type { Workspace } from '../workspace/types';
import type { IRResource, IRv1 } from '../ir/publicTypes';
import { buildRollupDriverArtifacts } from './bundler.artifacts';
import {
	ensureBundlerDependencies,
	ensureBundlerScripts,
} from './bundler.package';
import {
	BUNDLER_TRANSACTION_LABEL,
	VITE_CONFIG_FILENAME,
	DEFAULT_ENTRY_POINT,
} from './bundler.constants';
import { buildViteConfigSource } from './bundler.vite';
import type { PackageJsonLike, RollupDriverArtifacts } from './types';
import {
	resolveBundlerNamespace,
	resolveBundlerVersion,
} from './bundler.state';
import { BundlerError } from './errors/BundlerError';

export function hasBundlerDataViews(input: BuilderInput): boolean {
	return (input.ir?.resources ?? []).some((resource: IRResource) => {
		const adminUi = resource.ui?.admin;
		return Boolean(adminUi?.dataviews) || adminUi?.view === 'dataviews';
	});
}

function hasUiResources(input: BuilderInput): boolean {
	return (input.ir?.resources ?? []).some((resource: IRResource) =>
		Boolean(resource.ui?.admin)
	);
}

export async function applyBundlerGeneration(
	applyOptions: BuilderApplyOptions
): Promise<void> {
	const { context, output, reporter, input } = applyOptions;

	if (input.phase !== 'generate') {
		reporter.debug(
			'createBundler: skipping phase without bundler support.',
			{
				phase: input.phase,
			}
		);
		return;
	}

	if (!hasUiResources(input)) {
		reporter.debug(
			'createBundler: no UI resources detected; skipping bundler artifacts.'
		);
		return;
	}

	context.workspace.begin(BUNDLER_TRANSACTION_LABEL);

	try {
		const pkg = await readPackageJson(context.workspace);
		const sanitizedNamespace = resolveBundlerNamespace(input);
		const version = resolveBundlerVersion(input, pkg);
		const entryPoint = resolveUiEntryPoint(input.ir);
		const paths = resolveBundlerPaths(input.ir);
		const aliasRoot = resolveUiAliasRoot(context.workspace, input.ir);
		const hasDataViews = hasBundlerDataViews(input);
		const hasUi = hasUiResources(input);
		const shimsDir = context.workspace.resolve(paths.shimsDir);
		const dependencyResult = await ensureBundlerDependencies({
			workspaceRoot: context.workspace.root,
			pkg,
			hasUiResources: true,
			namespace: input.options.config.namespace,
			version,
		});

		const scriptResult = ensureBundlerScripts(dependencyResult.pkg);
		const artifacts = buildRollupDriverArtifacts(scriptResult.pkg, {
			aliasRoot,
			shimDir: shimsDir,
			sanitizedNamespace,
			hasUi,
			hasDataViews,
			entryPoint,
			version,
		});

		await persistBundlerArtifacts({
			context,
			output,
			reporter,
			artifacts,
			paths,
			packageResult: {
				pkg: scriptResult.pkg,
				changed: dependencyResult.changed || scriptResult.changed,
			},
		});
	} catch (error) {
		await context.workspace.rollback(BUNDLER_TRANSACTION_LABEL);
		const nativeError =
			error instanceof Error ? error : new Error(String(error));
		throw BundlerError.wrap(nativeError, 'DeveloperError', {
			stage: 'bundler.apply',
		});
	}
}

async function readPackageJson(
	workspace: Workspace
): Promise<PackageJsonLike | null> {
	const contents = await workspace.readText('package.json');
	if (!contents) {
		return null;
	}

	try {
		return JSON.parse(contents) as PackageJsonLike;
	} catch (error) {
		throw new SyntaxError(
			`Failed to parse workspace package.json: ${(error as Error).message}`
		);
	}
}

async function queueManifestWrites(
	context: PipelineContext,
	output: BuilderOutput,
	files: readonly string[]
): Promise<void> {
	for (const file of files) {
		const contents = await context.workspace.read(file);
		if (!contents) {
			continue;
		}

		output.queueWrite({ file, contents });
	}
}

interface PersistBundlerArtifactsArgs {
	readonly context: PipelineContext;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly artifacts: RollupDriverArtifacts;
	readonly paths: ReturnType<typeof resolveBundlerPaths>;
	readonly packageResult: {
		readonly pkg: PackageJsonLike | null;
		readonly changed: boolean;
	};
}

async function writeBundlerShims(
	workspace: Workspace,
	shimsDir: string
): Promise<void> {
	const files: Array<{ name: string; contents: string }> = [
		{
			name: 'wp-react.ts',
			contents: [
				"import * as Element from '@wordpress/element';",
				'',
				"export * from '@wordpress/element';",
				'',
				'export const Fragment = Element.Fragment;',
				'export default Element;',
				'',
				'export function jsx(type: unknown, props: Record<string, unknown> | null, key?: string) {',
				'  return Element.createElement(type as any, { ...(props ?? {}), key });',
				'}',
				'',
				'export const jsxs = jsx;',
				'export const jsxDEV = jsx;',
				'',
				'export { createElement } from "@wordpress/element";',
			].join('\n'),
		},
		{
			name: 'wp-element-jsx-runtime.ts',
			contents: [
				"import { createElement, Fragment } from '@wordpress/element';",
				'',
				'export { Fragment };',
				'',
				'export function jsx(type: unknown, props: Record<string, unknown> | null, key?: string) {',
				'  return createElement(type as any, { ...(props ?? {}), key });',
				'}',
				'',
				'export const jsxs = jsx;',
				'export const jsxDEV = jsx;',
			].join('\n'),
		},
		{
			name: 'wp-element-client.ts',
			contents: [
				"import * as Element from '@wordpress/element';",
				'',
				'function getReactDom(): any {',
				'  return (Element as any).ReactDOM ?? (Element as any);',
				'}',
				'',
				'export function createRoot(container: Element | HTMLElement | null) {',
				'  const reactDom = getReactDom();',
				'  const factory = reactDom?.createRoot;',
				'',
				'  if (typeof factory === "function") {',
				'    return factory(container);',
				'  }',
				'',
				'  const legacyRender = reactDom?.render ?? reactDom?.ReactDOM?.render;',
				'  const legacyUnmount =',
				'    reactDom?.unmountComponentAtNode ?? reactDom?.ReactDOM?.unmountComponentAtNode;',
				'',
				'  return {',
				'    render(element: unknown) {',
				'      if (typeof legacyRender === "function" && container) {',
				'        legacyRender(element as any, container);',
				'      }',
				'    },',
				'    unmount() {',
				'      if (typeof legacyUnmount === "function" && container) {',
				'        legacyUnmount(container);',
				'      }',
				'    },',
				'  };',
				'}',
				'',
				'export function hydrateRoot(...args: any[]) {',
				'  const reactDom = getReactDom();',
				'  const hydrate = reactDom?.hydrateRoot;',
				'  if (typeof hydrate === "function") {',
				'    return hydrate(...args);',
				'  }',
				"  throw new Error('hydrateRoot is not available in @wordpress/element runtime');",
				'}',
				'',
				'export default { createRoot, hydrateRoot };',
			].join('\n'),
		},
	];

	for (const file of files) {
		const target = path.posix.join(shimsDir, file.name);
		await workspace.write(target, file.contents, { ensureDir: true });
	}
}

async function persistBundlerArtifacts(
	args: PersistBundlerArtifactsArgs
): Promise<void> {
	const { context, output, reporter, artifacts, paths, packageResult } = args;

	await context.workspace.writeJson(paths.config, artifacts.config, {
		pretty: true,
	});
	await context.workspace.writeJson(paths.assets, artifacts.assetManifest, {
		pretty: true,
	});

	if (packageResult.changed && packageResult.pkg) {
		await context.workspace.writeJson('package.json', packageResult.pkg, {
			pretty: true,
		});
	}

	const viteConfigSource = buildViteConfigSource({
		bundlerConfigPath: paths.config,
		driverConfig: artifacts.config,
	});
	await context.workspace.write(VITE_CONFIG_FILENAME, viteConfigSource, {
		ensureDir: true,
	});
	await writeBundlerShims(
		context.workspace,
		context.workspace.resolve(paths.shimsDir)
	);

	const manifest = await context.workspace.commit(BUNDLER_TRANSACTION_LABEL);
	await queueManifestWrites(context, output, manifest.writes);

	reporter.debug('Bundler configuration generated.', {
		files: manifest.writes,
	});
}

function resolveUiEntryPoint(ir: IRv1 | null | undefined): string {
	if (!ir?.layout) {
		return DEFAULT_ENTRY_POINT;
	}

	try {
		const uiApplied = ir.layout.resolve('ui.applied');
		return `${uiApplied}/index.tsx`;
	} catch {
		return DEFAULT_ENTRY_POINT;
	}
}

function resolveUiAliasRoot(
	workspace: Workspace,
	ir: IRv1 | null | undefined
): string {
	if (!ir?.layout) {
		return workspace.resolve('src');
	}

	try {
		return workspace.resolve(ir.layout.resolve('ui.applied'));
	} catch {
		return workspace.resolve('src');
	}
}

import path from 'node:path';
import type { Workspace } from '../../workspace/types';
import {
	type ResolveResourceImportOptions,
	type ModuleSpecifierOptions,
} from './types';
import type * as tsMorph from 'ts-morph';
import { loadTsMorph } from './runtime-loader';

/**
 * Workspace file extensions that qualify as module sources.
 *
 * @internal
 */
export const MODULE_SOURCE_EXTENSIONS = [
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
] as const;

/**
 * Resolves a resource module import path, falling back to the configured alias.
 *
 * @param    root0
 * @param    root0.workspace
 * @param    root0.from
 * @param    root0.resourceKey
 * @param    root0.resourceSymbol
 * @param    root0.configPath
 * @param    root0.configured
 * @param    root0.generatedResourcesDir
 * @param    root0.appliedResourcesDir
 * @category Builders
 */
export async function resolveResourceImport({
	workspace,
	from,
	resourceKey,
	generatedResourcesDir,
	appliedResourcesDir,
}: ResolveResourceImportOptions): Promise<string> {
	// Prefer an applied resource module in the workspace.
	const appliedCandidate = await findWorkspaceModule(
		workspace,
		path.join(appliedResourcesDir, resourceKey)
	);

	if (appliedCandidate) {
		return buildModuleSpecifier({
			workspace,
			from,
			target: appliedCandidate,
		});
	}

	// Then fall back to a generated stub, if present.
	const generatedCandidate = await findWorkspaceModule(
		workspace,
		path.join(generatedResourcesDir, resourceKey)
	);

	if (generatedCandidate) {
		return buildModuleSpecifier({
			workspace,
			from,
			target: generatedCandidate,
		});
	}

	// Finally, fall back to the workspace alias. Callers are responsible
	// for ensuring that '@/resources/<key>' is resolvable at build time.
	return `@/resources/${resourceKey}`;
}

/**
 * Builds a module specifier relative to the caller or via the workspace alias.
 *
 * @param    root0
 * @param    root0.workspace
 * @param    root0.from
 * @param    root0.target
 * @category Builders
 */
export function buildModuleSpecifier({
	workspace,
	from,
	target,
}: ModuleSpecifierOptions): string {
	const fromAbsolute = workspace.resolve(from);
	const targetAbsolute = path.isAbsolute(target)
		? target
		: workspace.resolve(target);
	const workspaceRoot = workspace.resolve('.');
	const relativeToWorkspace = path.relative(workspaceRoot, targetAbsolute);

	if (relativeToWorkspace.startsWith('..')) {
		const aliasTarget = stripExtension(relativeToWorkspace)
			.replace(/^(\.\.[\\/])+/, '')
			.replace(/\\/g, '/');

		const normalisedAlias =
			aliasTarget.length > 0 ? aliasTarget.replace(/^\/+/u, '') : '';

		return normalisedAlias.length > 0 ? `@/${normalisedAlias}` : '@/';
	}

	const relative = path.relative(path.dirname(fromAbsolute), targetAbsolute);
	const withoutExtension = stripExtension(relative);

	return normaliseModuleSpecifier(withoutExtension);
}

export async function findWorkspaceModule(
	workspace: Workspace,
	basePath: string
): Promise<string | null> {
	for (const extension of MODULE_SOURCE_EXTENSIONS) {
		const candidate = `${basePath}${extension}`;
		if (await workspace.exists(candidate)) {
			return candidate;
		}
	}

	return null;
}

function stripExtension(modulePath: string): string {
	for (const extension of MODULE_SOURCE_EXTENSIONS) {
		if (modulePath.endsWith(extension)) {
			return modulePath.slice(0, -extension.length);
		}
	}

	return modulePath;
}

function normaliseModuleSpecifier(specifier: string): string {
	const normalised = specifier.replace(/\\/g, '/');
	if (normalised.startsWith('.')) {
		return normalised;
	}
	return `./${normalised}`;
}

async function ensureAdminRuntimeModule({
	workspace,
	runtimePath,
}: {
	readonly workspace: Workspace;
	readonly runtimePath: string;
}): Promise<string> {
	const contents = [
		"import type { WPKernelUIRuntime } from '@wpkernel/core/data';",
		'',
		'let runtime: WPKernelUIRuntime | undefined;',
		'',
		'export const adminScreenRuntime = {',
		'	setUIRuntime(next: WPKernelUIRuntime) {',
		'		runtime = next;',
		'	},',
		'	getUIRuntime() {',
		'		return runtime;',
		'	},',
		'};',
		'',
	].join('\n');

	await workspace.write(runtimePath, contents, { ensureDir: true });
	return runtimePath;
}

export async function writeAdminRuntimeStub(
	workspace: Workspace,
	runtimePath: string
): Promise<void> {
	await ensureAdminRuntimeModule({ workspace, runtimePath });
}

export type TsMorphAccessor = {
	readonly project: tsMorph.Project;
	readonly VariableDeclarationKind: typeof tsMorph.VariableDeclarationKind;
	createSourceFile: (targetPath: string) => tsMorph.SourceFile;
};

export async function buildTsMorphAccessor(options: {
	readonly workspace: Workspace;
}): Promise<TsMorphAccessor> {
	const { Project, VariableDeclarationKind, IndentationText } =
		await loadTsMorph();

	const project = new Project({
		useInMemoryFileSystem: true,
		manipulationSettings: {
			indentationText: IndentationText.Tab,
		},
	});

	const { workspace } = options;

	return {
		project,
		VariableDeclarationKind,
		createSourceFile(targetPath: string): tsMorph.SourceFile {
			const absoluteTarget = workspace.resolve(targetPath);
			return project.createSourceFile(absoluteTarget, '', {
				overwrite: true,
			});
		},
	};
}

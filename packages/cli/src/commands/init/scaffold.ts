import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { Workspace } from '../../workspace';
import { sanitizeNamespace } from '@wpkernel/core/namespace';
import { buildPluginMeta } from '../../ir/shared/pluginMeta';
import {
	applyReplacements,
	buildComposerPackageName,
	buildPhpNamespace,
	ensureTrailingNewline,
	fileExists,
	loadTemplate,
	resolvePathAliasEntries,
	formatPathsForTemplate,
	slugify,
	type ScaffoldFileDescriptor,
	type ScaffoldStatus,
} from './utils';
import { buildPluginLoaderProgram } from '@wpkernel/wp-json-ast';
import { buildPhpPrettyPrinter } from '@wpkernel/php-json-ast/php-driver';
import { loadLayoutFromWorkspace } from '../../ir/fragments/ir.layout.core';

const WPK_CONFIG_FILENAME = WPK_CONFIG_SOURCES.WPK_CONFIG_TS;
const SRC_INDEX_PATH = path.join('src', 'index.ts');
const ESLINT_CONFIG_FILENAME = 'eslint.config.js';
const TSCONFIG_FILENAME = 'tsconfig.json';
const JSCONFIG_FILENAME = 'jsconfig.json';
const COMPOSER_JSON_FILENAME = 'composer.json';
const INC_GITKEEP = path.join('inc', '.gitkeep');
const PLUGIN_LOADER = 'plugin.php';
const VITE_CONFIG_FILENAME = 'vite.config.ts';

export function buildScaffoldDescriptors(
	namespace: string
): ScaffoldFileDescriptor[] {
	return [
		{
			relativePath: WPK_CONFIG_FILENAME,
			templatePath: WPK_CONFIG_FILENAME,
			category: 'wpk',
			replacements: {
				__WPK_NAMESPACE__: namespace,
			},
		},
		{
			relativePath: COMPOSER_JSON_FILENAME,
			templatePath: COMPOSER_JSON_FILENAME,
			category: 'author',
			replacements: {
				__WPK_NAMESPACE__: namespace,
				__WPK_COMPOSER_PACKAGE_NAME__:
					buildComposerPackageName(namespace),
				__WPK_PHP_NAMESPACE__: buildPhpNamespace(namespace),
			},
		},
		{
			relativePath: PLUGIN_LOADER,
			templatePath: PLUGIN_LOADER,
			category: 'author',
			replacements: {
				__WPK_PLUGIN_TITLE__: buildPluginTitle(namespace),
				__WPK_PLUGIN_TEXT_DOMAIN__: namespace,
				__WPK_PHP_NAMESPACE__: buildPhpNamespace(namespace).replace(
					/\\+$/u,
					''
				),
				__WPK_PLUGIN_PACKAGE__: buildPluginPackage(namespace),
			},
		},
		{
			relativePath: INC_GITKEEP,
			templatePath: INC_GITKEEP,
			category: 'wpk',
			skipWhenPluginDetected: true,
		},
		{
			relativePath: SRC_INDEX_PATH,
			templatePath: path.join('src', 'index.ts'),
			category: 'author',
		},
		{
			relativePath: TSCONFIG_FILENAME,
			templatePath: TSCONFIG_FILENAME,
			category: 'wpk',
		},
		{
			relativePath: JSCONFIG_FILENAME,
			templatePath: JSCONFIG_FILENAME,
			category: 'wpk',
		},
		{
			relativePath: ESLINT_CONFIG_FILENAME,
			templatePath: ESLINT_CONFIG_FILENAME,
			category: 'wpk',
		},
		{
			relativePath: VITE_CONFIG_FILENAME,
			templatePath: VITE_CONFIG_FILENAME,
			category: 'wpk',
		},
	];
}

function buildPluginTitle(namespace: string): string {
	const slug = slugify(namespace);
	if (!slug) {
		return 'WPKernel Plugin';
	}

	return slug
		.split('-')
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function buildPluginPackage(namespace: string): string {
	const phpNamespace = buildPhpNamespace(namespace).replace(/\\+$/u, '');
	return phpNamespace.replace(/\\/g, '');
}

export function buildReplacementMap(
	tsconfigReplacements: string
): Map<string, Record<string, string>> {
	return new Map<string, Record<string, string>>([
		[
			TSCONFIG_FILENAME,
			{ '"__WPK_TSCONFIG_PATHS__"': tsconfigReplacements },
		],
		[
			JSCONFIG_FILENAME,
			{ '"__WPK_JSCONFIG_PATHS__"': tsconfigReplacements },
		],
	]);
}

export async function buildPathsReplacement(
	workspaceRoot: string
): Promise<string> {
	const entries = await resolvePathAliasEntries(workspaceRoot);
	return formatPathsForTemplate(entries);
}

export interface CollisionCheckResult {
	readonly skipped: readonly string[];
}

export async function assertNoCollisions({
	workspace,
	files,
	force,
	skippableTargets,
}: {
	readonly workspace: Workspace;
	readonly files: readonly ScaffoldFileDescriptor[];
	readonly force: boolean;
	readonly skippableTargets?: Iterable<string>;
}): Promise<CollisionCheckResult> {
	const collisions = await detectCollisions(workspace, files);
	if (collisions.length === 0 || force) {
		return { skipped: [] };
	}

	const descriptors = new Map(
		files.map((descriptor) => [descriptor.relativePath, descriptor])
	);

	const skipped: string[] = [];
	const fatal: string[] = [];
	const optional = new Set(skippableTargets ?? []);

	for (const relativePath of collisions) {
		const descriptor = descriptors.get(relativePath);
		if (descriptor?.category === 'author' || optional.has(relativePath)) {
			skipped.push(relativePath);
			continue;
		}

		fatal.push(relativePath);
	}

	if (fatal.length > 0) {
		throw new WPKernelError('ValidationError', {
			message:
				'Refusing to overwrite existing files. Re-run with --force to replace them.',
			data: { collisions: fatal },
		});
	}

	return { skipped };
}

export async function writeScaffoldFiles({
	workspace,
	files,
	replacements,
	force,
	skip,
	namespace,
}: {
	readonly workspace: Workspace;
	readonly files: readonly ScaffoldFileDescriptor[];
	readonly replacements: Map<string, Record<string, string>>;
	readonly force: boolean;
	readonly skip?: ReadonlySet<string>;
	readonly namespace: string;
}): Promise<Array<{ path: string; status: ScaffoldStatus }>> {
	const summaries: Array<{ path: string; status: ScaffoldStatus }> = [];
	const skipSet = !force && skip ? new Set(skip) : new Set<string>();

	for (const descriptor of files) {
		if (!force && skipSet.has(descriptor.relativePath)) {
			summaries.push({
				path: descriptor.relativePath,
				status: 'skipped',
			});
			continue;
		}

		let contents: string;
		if (descriptor.relativePath === PLUGIN_LOADER) {
			contents = await renderPluginLoader({
				workspace,
				namespace,
			});
		} else {
			const templateContents = await loadTemplate(
				descriptor.templatePath
			);
			contents = applyReplacements(
				templateContents,
				replacements.get(descriptor.relativePath) ??
					descriptor.replacements ??
					{}
			);
		}

		const existed = await fileExists(workspace, descriptor.relativePath);
		await workspace.write(
			descriptor.relativePath,
			ensureTrailingNewline(contents)
		);
		summaries.push({
			path: descriptor.relativePath,
			status: existed ? 'updated' : 'created',
		});
	}

	return summaries;
}

async function renderPluginLoader({
	workspace,
	namespace,
}: {
	readonly workspace: Workspace;
	readonly namespace: string;
}): Promise<string> {
	const sanitizedNamespace = sanitizeNamespace(namespace);
	if (!sanitizedNamespace) {
		throw new WPKernelError('ValidationError', {
			message: `Unable to sanitise namespace "${namespace}" while scaffolding plugin.php.`,
		});
	}

	const layout = await loadLayoutFromWorkspace({
		workspace,
		strict: true,
	});
	if (!layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'layout.manifest.json not found while scaffolding plugin.php.',
		});
	}

	const plugin = buildPluginMeta({
		sanitizedNamespace,
	});
	const program = buildPluginLoaderProgram({
		origin: WPK_CONFIG_FILENAME,
		namespace: buildPhpNamespace(namespace).replace(/\\+$/u, ''),
		sanitizedNamespace,
		plugin,
		resourceClassNames: [],
		phpGeneratedPath: layout.resolve('php.generated'),
	});

	const printer = buildPhpPrettyPrinter({ workspace });
	const { code } = await printer.prettyPrint({
		filePath: workspace.resolve(PLUGIN_LOADER),
		program,
	});

	return code;
}

async function detectCollisions(
	workspace: Workspace,
	files: readonly ScaffoldFileDescriptor[]
): Promise<string[]> {
	const collisions: string[] = [];

	for (const file of files) {
		if (await fileExists(workspace, file.relativePath)) {
			collisions.push(file.relativePath);
		}
	}

	return collisions;
}

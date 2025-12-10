import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import type { Workspace } from '../../workspace';
import defaultLayoutManifest from '../../../../../layout.manifest.json' assert { type: 'json' };

export function createLayoutFragment(): IrFragment {
	return createHelper({
		key: 'ir.layout.core',
		kind: 'fragment',
		async apply({ input, output, context }: IrFragmentApplyOptions) {
			const layout = await loadLayoutFromWorkspace({
				workspace: context.workspace,
				overrides: input.options.config.directories as
					| Record<string, string>
					| undefined,
			});
			if (!layout) {
				throw new WPKernelError('EnvironmentalError', {
					message:
						'layout.manifest.json not found; cannot resolve artifact paths.',
				});
			}

			output.assign({
				layout,
			});
		},
	});
}

type LayoutLeaf = string;
interface LayoutBranch {
	[key: string]: LayoutBranch | LayoutLeaf;
}
type LayoutNode = LayoutLeaf | LayoutBranch;
type LayoutMap = Record<string, string>;

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function walkLayout(
	root: string,
	node: LayoutNode,
	currentPath: string[],
	out: LayoutMap
): void {
	if (typeof node === 'string') {
		const resolved = path.posix.join(root, ...currentPath);
		out[node] = resolved;
		return;
	}

	const id = (node as Record<string, unknown>).$id;
	if (typeof id === 'string' && id.length > 0) {
		const resolved = path.posix.join(root, ...currentPath);
		out[id] = resolved;
	}

	for (const [segment, child] of Object.entries(node)) {
		if (segment === '$id') {
			continue;
		}

		walkLayout(root, child as LayoutNode, [...currentPath, segment], out);
	}
}

function buildLayoutMap(root: string, node: LayoutNode): LayoutMap {
	const out: LayoutMap = Object.create(null);
	walkLayout(root, node, [], out);
	return out;
}

function normalizeLayout(layout: unknown): Record<string, LayoutNode> {
	if (!isObject(layout) || !isObject(layout.directories)) {
		throw new WPKernelError('ValidationError', {
			message: 'Invalid layout manifest: missing "directories" object.',
		});
	}
	return layout.directories as Record<string, LayoutNode>;
}

const USER_OVERRIDABLE_IDS: Record<string, string> = {
	blocks: 'blocks.applied',
	'blocks.applied': 'blocks.applied',
	controllers: 'controllers.applied',
	'controllers.applied': 'controllers.applied',
	entry: 'entry.applied',
	'entry.applied': 'entry.applied',
	runtime: 'runtime.applied',
	'runtime.applied': 'runtime.applied',
	plugin: 'plugin.loader',
	'plugin.loader': 'plugin.loader',
};

const REQUIRED_LAYOUT_IDS: readonly string[] = [
	'plugin.loader',
	'entry.generated',
	'entry.applied',
	'runtime.generated',
	'runtime.applied',
	'blocks.applied',
	'blocks.generated',
	'app.generated',
	'app.applied',
	'types.generated',
	'php.generated',
	'bundler.config',
	'bundler.assets',
	'bundler.shims',
	'debug.ui',
];

function mergeAppliedOverrides(
	defaults: LayoutMap,
	overrides: Record<string, string> | undefined
): LayoutMap {
	if (!overrides) {
		return defaults;
	}

	const next = { ...defaults };
	for (const [key, value] of Object.entries(overrides)) {
		const targetId = USER_OVERRIDABLE_IDS[key];
		if (!targetId) {
			throw new WPKernelError('ValidationError', {
				message: `Unsupported layout override "${key}". Allowed ids: ${Object.keys(
					USER_OVERRIDABLE_IDS
				).join(', ')}`,
			});
		}

		if (typeof value !== 'string' || value.length === 0) {
			continue;
		}

		next[targetId] = value;
		// Provide the ".applied" alias for convenience.
		next[`${targetId}.applied`] = value;
	}

	return next;
}

function validateRequiredLayoutIds(layout: LayoutMap): void {
	const missing = REQUIRED_LAYOUT_IDS.filter(
		(id) => !layout[id] && !layout[`${id}.applied`]
	);
	if (missing.length > 0) {
		throw new WPKernelError('EnvironmentalError', {
			message: `Invalid layout manifest: missing required layout ids: ${missing.join(', ')}`,
			context: {
				missing,
			},
		});
	}
}

export interface ResolvedLayout {
	resolve: (id: string) => string;
	all: Record<string, string>;
}

async function readManifestText(workspace: Workspace): Promise<string | null> {
	const workspaceManifest = await workspace.readText('layout.manifest.json');
	if (workspaceManifest) {
		return workspaceManifest;
	}

	return JSON.stringify(defaultLayoutManifest);
}

export function resolveLayoutFromManifest(options: {
	readonly manifest: unknown;
	readonly overrides?: Record<string, string>;
}): ResolvedLayout {
	const directories = normalizeLayout(options.manifest);
	const resolved = buildLayoutMap('.', directories);
	const merged = mergeAppliedOverrides(resolved, options.overrides);
	validateRequiredLayoutIds(merged);

	return {
		resolve(id: string): string {
			const value = merged[id] ?? merged[`${id}.applied`];
			if (!value) {
				throw new WPKernelError('DeveloperError', {
					message: `Unknown layout id "${id}".`,
				});
			}
			return value;
		},
		all: merged,
	};
}

export async function loadLayoutFromWorkspace(options: {
	readonly workspace: Workspace;
	readonly overrides?: Record<string, string>;
	readonly strict?: boolean;
}): Promise<ResolvedLayout | null> {
	const manifestText = await readManifestText(options.workspace);
	if (!manifestText) {
		if (options.strict === false) {
			return null;
		}
		throw new WPKernelError('EnvironmentalError', {
			message:
				'layout.manifest.json not found; cannot resolve artifact paths.',
		});
	}

	let manifest: unknown;
	try {
		manifest = JSON.parse(manifestText);
	} catch (error) {
		if (options.strict === false) {
			return null;
		}
		throw new WPKernelError('ValidationError', {
			message: 'Failed to parse layout.manifest.json',
			context: { error },
		});
	}

	return resolveLayoutFromManifest({
		manifest,
		overrides: options.overrides,
	});
}

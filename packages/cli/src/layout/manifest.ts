import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import type { Workspace } from '../workspace';
import defaultLayoutManifest from '../../../../layout.manifest.json' assert { type: 'json' };

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

function mergeAppliedOverrides(
	defaults: LayoutMap,
	overrides: Record<string, string> | undefined
): LayoutMap {
	if (!overrides) {
		return defaults;
	}

	const next = { ...defaults };
	for (const [key, value] of Object.entries(overrides)) {
		if (typeof value !== 'string' || value.length === 0) {
			continue;
		}

		next[key] = value;
		next[`${key}.applied`] = value;
	}

	return next;
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
		throw new WPKernelError('DeveloperError', {
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
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to parse layout.manifest.json',
			context: { error },
		});
	}

	const directories = normalizeLayout(manifest);
	const resolved = buildLayoutMap('.', directories);
	const merged = mergeAppliedOverrides(resolved, options.overrides);

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

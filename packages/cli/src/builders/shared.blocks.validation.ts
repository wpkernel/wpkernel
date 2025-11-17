import path from 'path';
import type { IRBlock } from '../ir';
import type { Workspace } from '../workspace';
import { toWorkspaceRelative } from './shared.blocks.paths';

export function validateBlockManifest(
	manifest: Record<string, unknown>,
	block: IRBlock
): string[] {
	const warnings: string[] = [];

	const checks: Array<{ condition: boolean; message: string }> = [
		{
			condition: isNonEmptyString(manifest.name),
			message: `Block manifest for "${block.key}" is missing a "name" field.`,
		},
		{
			condition: isNonEmptyString(manifest.title),
			message: `Block manifest for "${block.key}" is missing a "title" field.`,
		},
		{
			condition: isNonEmptyString(manifest.category),
			message: `Block manifest for "${block.key}" is missing a "category" field.`,
		},
		{
			condition: isNonEmptyString(manifest.icon),
			message: `Block manifest for "${block.key}" does not define an "icon".`,
		},
		{
			condition:
				hasString(manifest.editorScript) ||
				hasString(manifest.editorScriptModule),
			message: `Block manifest for "${block.key}" is missing "editorScript" or "editorScriptModule".`,
		},
	];

	for (const check of checks) {
		if (!check.condition) {
			warnings.push(check.message);
		}
	}

	if (
		!block.hasRender &&
		!(
			hasString(manifest.viewScript) ||
			hasString(manifest.viewScriptModule)
		)
	) {
		warnings.push(
			`JS-only block "${block.key}" is missing "viewScript" or "viewScriptModule".`
		);
	}

	return warnings;
}
function isNonEmptyString(candidate: unknown): candidate is string {
	return typeof candidate === 'string' && candidate.trim().length > 0;
}
function hasString(candidate: unknown): candidate is string {
	return typeof candidate === 'string' && candidate.length > 0;
}
export function manifestDeclaresRenderCallback(
	manifest: Record<string, unknown>
): boolean {
	const render = manifest.render;
	if (typeof render !== 'string') {
		return false;
	}

	const trimmed = render.trim();
	if (trimmed.length === 0) {
		return false;
	}

	return !trimmed.startsWith('file:');
}
export async function resolveRenderResolution(options: {
	readonly workspace: Workspace;
	readonly manifestDirectory: string;
	readonly manifestObject: Record<string, unknown>;
}): Promise<
	| {
			readonly absolutePath: string;
			readonly relativePath: string;
			readonly exists: boolean;
			readonly declared: boolean;
	  }
	| undefined
> {
	const { workspace, manifestDirectory, manifestObject } = options;
	const render = manifestObject.render;

	if (typeof render === 'string') {
		if (!render.startsWith('file:')) {
			return undefined;
		}

		const relative = render.slice('file:'.length).trim();
		const normalised = relative.startsWith('./')
			? relative.slice(2)
			: relative;
		const absolutePath = path.resolve(manifestDirectory, normalised);
		const relativePath = toWorkspaceRelative(workspace, absolutePath);
		const exists = await workspace.exists(absolutePath);

		return {
			absolutePath,
			relativePath,
			exists,
			declared: true,
		};
	}

	const fallbackAbsolute = path.resolve(manifestDirectory, 'render.php');
	const exists = await workspace.exists(fallbackAbsolute);
	if (!exists) {
		return undefined;
	}

	return {
		absolutePath: fallbackAbsolute,
		relativePath: toWorkspaceRelative(workspace, fallbackAbsolute),
		exists: true,
		declared: false,
	};
}

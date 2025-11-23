import path from 'node:path';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import type { Workspace } from '../../workspace';
import { loadLayoutFromWorkspace } from '../../layout/manifest';
import { PATCH_MANIFEST_PATH as PATCH_MANIFEST_PATH_INTERNAL } from '../../builders/patcher.paths';

export const PATCH_MANIFEST_PATH = PATCH_MANIFEST_PATH_INTERNAL;

export const APPLY_LOG_FALLBACK_PATH = path.posix.join(
	'.wpk',
	'apply',
	'log.json'
);

export async function resolveApplyLogPath(
	workspace: Workspace
): Promise<string> {
	const layout = await loadLayoutFromWorkspace({
		workspace,
		strict: false,
	});
	if (layout) {
		return layout.resolve('apply.log');
	}
	return APPLY_LOG_FALLBACK_PATH;
}

export function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.apply`;
}

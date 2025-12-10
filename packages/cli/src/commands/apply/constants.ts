import path from 'node:path';
import { WPKernelError, WPK_NAMESPACE } from '@wpkernel/core/contracts';
import type { Workspace } from '../../workspace';
import { PATCH_MANIFEST_PATH as PATCH_MANIFEST_PATH_INTERNAL } from '../../builders/patcher.paths';
import { loadLayoutFromWorkspace } from '../../ir/fragments/ir.layout.core';

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
		strict: true,
	});
	if (!layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'layout.manifest.json not found; cannot resolve apply log.',
		});
	}
	return layout.resolve('apply.log');
}

export function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.apply`;
}

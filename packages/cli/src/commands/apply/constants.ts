import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { PATCH_MANIFEST_PATH as PATCH_MANIFEST_PATH_INTERNAL } from '../../builders/patcher.paths';

export const PATCH_MANIFEST_PATH = PATCH_MANIFEST_PATH_INTERNAL;

export const APPLY_LOG_PATH = '.wpk-apply.log';

export function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.apply`;
}

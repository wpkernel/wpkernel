import { resolveApplyLogPath } from './constants';
import type { CreateBackupsOptions } from './types';

function shouldBackupFile(pathname: string, applyLogPath: string): boolean {
	if (!pathname || pathname === '.') {
		return false;
	}

	const normalised = pathname.split('\\').join('/');

	if (normalised === applyLogPath) {
		return false;
	}

	if (normalised.startsWith('.tmp/')) {
		return false;
	}

	// eslint-disable-next-line @wpkernel/no-hardcoded-layout-paths
	if (normalised.startsWith('.wpk/tmp/')) {
		return false;
	}

	if (normalised.endsWith('/')) {
		return false;
	}

	return true;
}

export async function createBackups({
	workspace,
	manifest,
	reporter,
}: CreateBackupsOptions): Promise<void> {
	const applyLogPath = (await resolveApplyLogPath(workspace))
		.split('\\')
		.join('/')
		.toLowerCase();

	const candidates = new Set(
		[...manifest.writes, ...manifest.deletes].filter((file) =>
			shouldBackupFile(file, applyLogPath)
		)
	);

	if (candidates.size === 0) {
		return;
	}

	for (const file of candidates) {
		const contents = await workspace.read(file);
		if (!contents) {
			continue;
		}

		const backupPath = `${file}.bak`;
		await workspace.write(backupPath, contents, { ensureDir: true });
		reporter.info('Created workspace backup.', { file: backupPath });
	}
}

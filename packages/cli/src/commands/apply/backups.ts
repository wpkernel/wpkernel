import { APPLY_LOG_PATH } from './constants';
import type { CreateBackupsOptions } from './types';

function shouldBackupFile(pathname: string): boolean {
	if (!pathname || pathname === '.') {
		return false;
	}

	const normalised = pathname.split('\\').join('/');

	if (normalised === APPLY_LOG_PATH) {
		return false;
	}

	if (normalised.startsWith('.tmp/')) {
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
	const candidates = new Set(
		[...manifest.writes, ...manifest.deletes].filter(shouldBackupFile)
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

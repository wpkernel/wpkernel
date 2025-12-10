import { serialiseError } from './errors';
import { resolveApplyLogPath } from './constants';
import type { ApplyLogEntry, FailureLogOptions } from './types';

export async function appendApplyLog(
	workspace: FailureLogOptions['workspace'],
	entry: ApplyLogEntry
): Promise<void> {
	const applyLogPath = await resolveApplyLogPath(workspace);
	const previous = await workspace.readText(applyLogPath);
	const serialised = JSON.stringify(entry);
	const trimmedPrevious = previous?.replace(/\s+$/, '') ?? '';
	const nextContents =
		trimmedPrevious.length > 0
			? `${trimmedPrevious}\n${serialised}\n`
			: `${serialised}\n`;

	await workspace.write(applyLogPath, nextContents, { ensureDir: true });
}

export async function handleFailureLog({
	workspace,
	dependencies,
	flags,
	exitCode,
	error,
}: FailureLogOptions): Promise<void> {
	await dependencies
		.appendApplyLog(workspace, {
			version: 1,
			timestamp: new Date().toISOString(),
			status: 'failed',
			exitCode,
			flags,
			summary: null,
			records: [],
			actions: [],
			error: serialiseError(error),
		})
		.catch(() => undefined);
}

import crypto from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { toWorkspaceRelative } from '../workspace';

/**
 * Outcome recorded for a file write attempt.
 */
export type FileWriteStatus = 'written' | 'unchanged' | 'skipped';

/**
 * Metadata describing an individual file write event.
 */
export interface FileWriteRecord {
	path: string;
	status: FileWriteStatus;
	hash: string;
	reason?: string;
}

/**
 * Aggregated summary returned by the `FileWriter.summarise` helper.
 */
export interface FileWriterSummary {
	counts: Record<FileWriteStatus, number>;
	entries: FileWriteRecord[];
}

interface FileWriterOptions {
	dryRun?: boolean;
}

/**
 * Track filesystem writes while deduplicating unchanged content.
 */
export class FileWriter {
	private readonly dryRun: boolean;

	private readonly records = new Map<string, FileWriteRecord>();

	constructor(options: FileWriterOptions = {}) {
		this.dryRun = Boolean(options.dryRun);
	}

	/**
	 * Write file contents if they differ from what already exists.
	 *
	 * @param filePath - Absolute or relative file path.
	 * @param contents - File contents to persist.
	 * @return The recorded file write status.
	 */
	async write(filePath: string, contents: string): Promise<FileWriteStatus> {
		const absolutePath = path.resolve(filePath);
		const finalContents = ensureTrailingNewline(contents);
		const newHash = hashContents(finalContents);

		const existing = await readExistingHash(absolutePath);
		const relativePath = toWorkspaceRelative(process.cwd(), absolutePath);

		if (this.dryRun) {
			const status: FileWriteStatus =
				existing?.hash === newHash ? 'unchanged' : 'skipped';
			this.records.set(absolutePath, {
				path: relativePath,
				status,
				hash: newHash,
				reason: status === 'skipped' ? 'dry-run' : undefined,
			});
			return status;
		}

		if (existing?.hash === newHash) {
			this.records.set(absolutePath, {
				path: relativePath,
				status: 'unchanged',
				hash: newHash,
			});
			return 'unchanged';
		}

		await fs.writeFile(absolutePath, finalContents, 'utf8');

		this.records.set(absolutePath, {
			path: relativePath,
			status: 'written',
			hash: newHash,
		});

		return 'written';
	}

	/**
	 * Generate a deterministic summary of all tracked writes.
	 */
	summarise(): FileWriterSummary {
		const entries = Array.from(this.records.values()).sort((a, b) =>
			a.path.localeCompare(b.path)
		);

		const counts: Record<FileWriteStatus, number> = {
			written: 0,
			unchanged: 0,
			skipped: 0,
		};

		for (const entry of entries) {
			counts[entry.status] += 1;
		}

		return { counts, entries };
	}
}

function ensureTrailingNewline(contents: string): string {
	return contents.endsWith('\n') ? contents : `${contents}\n`;
}

async function readExistingHash(
	filePath: string
): Promise<{ hash: string } | null> {
	try {
		const existing = await fs.readFile(filePath, 'utf8');
		return { hash: hashContents(existing) };
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			(error as { code?: string }).code === 'ENOENT'
		) {
			return null;
		}

		throw error;
	}
}

function hashContents(contents: string): string {
	return crypto.createHash('sha256').update(contents, 'utf8').digest('hex');
}

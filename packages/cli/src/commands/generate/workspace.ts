import path from 'node:path';
import { createHash as buildHash } from 'node:crypto';
import { toWorkspaceRelative } from '../../workspace';
import type {
	SummaryBuilderOptions,
	SummaryRecord,
	SummaryEntry,
	SummaryCounts,
	SummaryRecordFactoryOptions,
	SummaryBuilderContract,
	TrackedWorkspaceOptions,
	TrackedWorkspaceResult,
	WorkspaceWriteOptions,
	WorkspaceWriteJsonOptions,
	WorkspaceRemoveOptions,
	WorkspaceFileManifest,
} from './types';
import type { Workspace } from '../../workspace';
import { type FileWriterSummary } from '../../utils/file-writer';

class SummaryBuilder implements SummaryBuilderContract {
	readonly #workspace: Workspace;
	readonly #dryRun: boolean;
	readonly #records = new Map<string, SummaryRecord>();

	constructor(options: SummaryBuilderOptions) {
		this.#workspace = options.workspace;
		this.#dryRun = options.dryRun;
	}

	async recordWrite(absolutePath: string, data: Buffer): Promise<void> {
		const key = path.resolve(absolutePath);
		const existing = this.#records.get(key);

		if (existing) {
			existing.finalHash = hashBuffer(data);
			return;
		}

		const previous = await this.#workspace.read(absolutePath);
		this.#records.set(
			key,
			buildSummaryRecord({
				absolutePath,
				dryRun: this.#dryRun,
				workspace: this.#workspace,
				previous,
				next: data,
			})
		);
	}

	buildSummary(): FileWriterSummary {
		const entries = Array.from(this.#records.values())
			.map((record) => buildEntry(record, this.#dryRun))
			.sort((left, right) => left.path.localeCompare(right.path));

		return {
			counts: aggregateCounts(entries),
			entries,
		} satisfies FileWriterSummary;
	}
}

function buildSummaryRecord(
	options: SummaryRecordFactoryOptions
): SummaryRecord {
	const { absolutePath, workspace, previous, next } = options;
	const originalHash = previous ? hashBuffer(previous) : null;

	return {
		path: toWorkspaceRelative(workspace, absolutePath),
		originalHash,
		finalHash: hashBuffer(next),
	};
}

function buildEntry(record: SummaryRecord, dryRun: boolean): SummaryEntry {
	const hasChanged =
		record.originalHash === null
			? record.finalHash.length > 0
			: record.finalHash !== record.originalHash;

	if (!hasChanged) {
		return createEntry(record, 'unchanged');
	}

	if (dryRun) {
		return createEntry(record, 'skipped', 'dry-run');
	}

	return createEntry(record, 'written');
}

function createEntry(
	record: SummaryRecord,
	status: SummaryEntry['status'],
	reason?: SummaryEntry['reason']
): SummaryEntry {
	return {
		path: record.path,
		status,
		hash: record.finalHash,
		reason,
	};
}

function aggregateCounts(entries: SummaryEntry[]): SummaryCounts {
	return entries.reduce<SummaryCounts>(
		(counts, entry) => ({
			...counts,
			[entry.status]: counts[entry.status] + 1,
		}),
		{ written: 0, unchanged: 0, skipped: 0 }
	);
}

function hashBuffer(buffer: Buffer): string {
	return buildHash('sha256').update(buffer).digest('hex');
}

function ensureBuffer(data: Buffer | string): Buffer {
	return Buffer.isBuffer(data)
		? Buffer.from(data)
		: Buffer.from(data, 'utf8');
}

class TrackingWorkspace implements Workspace {
	readonly #base: Workspace;
	readonly #summary: SummaryBuilder;

	constructor(base: Workspace, summary: SummaryBuilder) {
		this.#base = base;
		this.#summary = summary;
	}

	get root(): string {
		return this.#base.root;
	}

	cwd(): string {
		return this.#base.cwd();
	}

	resolve(...parts: string[]): string {
		return this.#base.resolve(...parts);
	}

	read(file: string): Promise<Buffer | null> {
		return this.#base.read(file);
	}

	readText(file: string): Promise<string | null> {
		return this.#base.readText(file);
	}

	async write(
		file: string,
		data: Buffer | string,
		options?: WorkspaceWriteOptions
	): Promise<void> {
		const absolute = this.#base.resolve(file);
		await this.#summary.recordWrite(absolute, ensureBuffer(data));
		await this.#base.write(file, data, options);
	}

	async writeJson<T>(
		file: string,
		value: T,
		options?: WorkspaceWriteJsonOptions
	): Promise<void> {
		const spacing = options?.pretty ? 2 : undefined;
		const serialised = JSON.stringify(value, null, spacing);
		const absolute = this.#base.resolve(file);
		await this.#summary.recordWrite(
			absolute,
			Buffer.from(serialised, 'utf8')
		);
		await this.#base.writeJson(file, value, options);
	}

	rm(target: string, options?: WorkspaceRemoveOptions): Promise<void> {
		return this.#base.rm(target, options);
	}

	exists(target: string): Promise<boolean> {
		return this.#base.exists(target);
	}

	glob(pattern: string | readonly string[]): Promise<string[]> {
		return this.#base.glob(pattern);
	}

	threeWayMerge(
		file: string,
		base: string,
		current: string,
		incoming: string,
		options?: Parameters<Workspace['threeWayMerge']>[4]
	): Promise<'clean' | 'conflict'> {
		return this.#base.threeWayMerge(file, base, current, incoming, options);
	}

	begin(label?: string): void {
		this.#base.begin(label);
	}

	commit(label?: string): Promise<WorkspaceFileManifest> {
		return this.#base.commit(label);
	}

	rollback(label?: string): Promise<WorkspaceFileManifest> {
		return this.#base.rollback(label);
	}

	dryRun<T>(
		fn: () => Promise<T>
	): Promise<{ result: T; manifest: WorkspaceFileManifest }> {
		return this.#base.dryRun(fn);
	}

	tmpDir(prefix?: string): Promise<string> {
		return this.#base.tmpDir(prefix);
	}
}

export function createTrackedWorkspace(
	workspace: Workspace,
	options: TrackedWorkspaceOptions
): TrackedWorkspaceResult {
	const summary = new SummaryBuilder({ workspace, dryRun: options.dryRun });

	return {
		workspace: new TrackingWorkspace(workspace, summary),
		summary,
	};
}

export async function safeRollback(
	workspace: Workspace,
	label: string
): Promise<void> {
	try {
		await workspace.rollback(label);
	} catch (error) {
		if (error) {
			// swallow rollback failures to preserve original error context
		}
	}
}

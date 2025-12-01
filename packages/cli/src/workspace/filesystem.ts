import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import type {
	FileManifest,
	MergeOptions,
	RemoveOptions,
	Workspace,
	WriteJsonOptions,
	WriteOptions,
} from './types';
import { loadLayoutFromWorkspace } from '../layout/manifest';

interface TransactionOriginalMissing {
	readonly type: 'missing';
}

interface TransactionOriginalFile {
	readonly type: 'file';
	readonly data: Buffer;
}

interface TransactionOriginalDirectory {
	readonly type: 'directory';
	readonly backup: string;
}

type TransactionOriginal =
	| TransactionOriginalMissing
	| TransactionOriginalFile
	| TransactionOriginalDirectory;

interface TransactionRecord {
	readonly label?: string;
	readonly originals: Map<string, TransactionOriginal>;
	readonly writes: Set<string>;
	readonly deletes: Set<string>;
}

function toRelative(root: string, absolute: string): string {
	const relative = path.relative(root, absolute);
	return relative === '' ? '.' : relative;
}

async function removePath(target: string): Promise<void> {
	await fs.rm(target, { recursive: true, force: true });
}

async function ensureParentDir(filePath: string): Promise<void> {
	const directory = path.dirname(filePath);
	await fs.mkdir(directory, { recursive: true });
}

async function listAllEntries(directory: string): Promise<string[]> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const results: string[] = [];

	for (const entry of entries) {
		const absolute = path.join(directory, entry.name);
		results.push(absolute);

		if (entry.isDirectory()) {
			const nested = await listAllEntries(absolute);
			results.push(...nested);
		}
	}

	return results;
}

function normaliseForMatch(root: string, absolute: string): string {
	const relative = path.relative(root, absolute).split(path.sep).join('/');
	return relative === '' ? '.' : relative;
}

function buildPatternMatcher(pattern: string): (candidate: string) => boolean {
	const normalised = pattern.replace(/\\/g, '/');
	const escaped = normalised.replace(/([.+^=!:${}()|[\]/\\])/g, '\\$1');

	// Allow globstars (**/) to match zero or more nested segments.
	const globStarExpanded = escaped.replace(/\\\*\\\*\\\//g, '(?:.*\\/)?');
	const singleStarExpanded = globStarExpanded.replace(/\*/g, '[^/]*');
	const regexSource = `^${singleStarExpanded}$`;
	const matcher = new RegExp(regexSource);
	return (candidate: string) => matcher.test(candidate);
}

interface MergeMarkerSet {
	readonly start: string;
	readonly mid: string;
	readonly end: string;
}

function resolveMergeOutcome(
	base: string,
	current: string,
	incoming: string,
	markers: MergeMarkerSet
): { status: 'clean' | 'conflict'; content: string } {
	if (current === incoming || current.trim() === incoming.trim()) {
		return { status: 'clean', content: current };
	}

	if (base === current) {
		return { status: 'clean', content: incoming };
	}

	if (base === incoming) {
		return { status: 'clean', content: current };
	}

	const conflict = [
		markers.start,
		current,
		markers.mid,
		base,
		markers.end,
		incoming,
		'',
	].join('\n');

	return { status: 'conflict', content: conflict };
}

async function cleanupOriginal(original: TransactionOriginal): Promise<void> {
	if (original.type === 'directory') {
		await removePath(original.backup);
	}
}

async function recordOriginal(
	absolute: string,
	originals: Map<string, TransactionOriginal>,
	relative: string
): Promise<void> {
	if (originals.has(relative)) {
		return;
	}

	try {
		const stats = await fs.lstat(absolute);
		if (stats.isDirectory()) {
			const backupRoot = await fs.mkdtemp(
				path.join(os.tmpdir(), 'wpk-workspace-backup-')
			);
			await fs.cp(absolute, backupRoot, { recursive: true });
			originals.set(relative, { type: 'directory', backup: backupRoot });
			return;
		}

		if (!stats.isFile()) {
			originals.set(relative, { type: 'missing' });
			return;
		}

		const data = await fs.readFile(absolute);
		originals.set(relative, { type: 'file', data });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			originals.set(relative, { type: 'missing' });
			return;
		}

		throw error;
	}
}

function buildManifest(record: TransactionRecord): FileManifest {
	return {
		writes: Array.from(record.writes).sort(),
		deletes: Array.from(record.deletes).sort(),
	};
}

class FilesystemWorkspace implements Workspace {
	readonly #root: string;
	readonly #transactions: TransactionRecord[] = [];

	constructor(root: string) {
		this.#root = root;
	}

	get root(): string {
		return this.#root;
	}

	cwd(): string {
		return this.#root;
	}

	resolve(...parts: string[]): string {
		return path.resolve(this.#root, ...parts);
	}

	async read(file: string): Promise<Buffer | null> {
		const absolute = this.resolve(file);
		try {
			return await fs.readFile(absolute);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return null;
			}

			throw error;
		}
	}

	async readText(file: string): Promise<string | null> {
		const data = await this.read(file);
		return data ? data.toString('utf8') : null;
	}

	async write(
		file: string,
		data: Buffer | string,
		options: WriteOptions = {}
	): Promise<void> {
		const absolute = this.resolve(file);
		const relative = toRelative(this.#root, absolute);
		const transaction = this.#transactions.at(-1);

		if (transaction) {
			await recordOriginal(absolute, transaction.originals, relative);
			transaction.writes.add(relative);
		}

		if (options.ensureDir ?? true) {
			await ensureParentDir(absolute);
		}

		if (typeof data === 'string') {
			await fs.writeFile(absolute, data, {
				encoding: 'utf8',
				mode: options.mode,
			});
			return;
		}

		await fs.writeFile(absolute, data, { mode: options.mode });
	}

	async writeJson<T>(
		file: string,
		value: T,
		options: WriteJsonOptions = {}
	): Promise<void> {
		const spacing = options.pretty ? 2 : undefined;
		const serialised = JSON.stringify(value, null, spacing);
		await this.write(file, serialised, options);
	}

	async exists(target: string): Promise<boolean> {
		const absolute = this.resolve(target);
		try {
			await fs.access(absolute);
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return false;
			}

			throw error;
		}
	}

	async rm(target: string, options: RemoveOptions = {}): Promise<void> {
		const absolute = this.resolve(target);
		const relative = toRelative(this.#root, absolute);
		const transaction = this.#transactions.at(-1);

		if (transaction) {
			await recordOriginal(absolute, transaction.originals, relative);
			transaction.deletes.add(relative);
		}

		const recursive = options.recursive ?? false;
		try {
			await fs.rm(absolute, { recursive, force: true });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return;
			}

			throw error;
		}
	}

	async glob(pattern: string | readonly string[]): Promise<string[]> {
		const patterns = Array.isArray(pattern) ? pattern : [pattern];
		if (patterns.length === 0) {
			return [];
		}

		const matchers = patterns.map(buildPatternMatcher);
		const entries = await listAllEntries(this.#root);

		return entries.filter((absolute) => {
			const relative = normaliseForMatch(this.#root, absolute);
			return matchers.some((matcher) => matcher(relative));
		});
	}

	async threeWayMerge(
		file: string,
		base: string,
		current: string,
		incoming: string,
		options: MergeOptions = {}
	): Promise<'clean' | 'conflict'> {
		const markerSet: MergeMarkerSet = {
			start: options.markers?.start ?? '<<<<<<< CURRENT',
			mid: options.markers?.mid ?? '=======',
			end: options.markers?.end ?? '>>>>>>> INCOMING',
		};

		const outcome = resolveMergeOutcome(base, current, incoming, markerSet);
		await this.write(file, outcome.content);
		return outcome.status;
	}

	begin(label?: string): void {
		this.#transactions.push({
			label,
			originals: new Map(),
			writes: new Set(),
			deletes: new Set(),
		});
	}

	async commit(label?: string): Promise<FileManifest> {
		const record = this.#transactions.pop();
		if (!record) {
			throw new WPKernelError('ValidationError', {
				message:
					'Attempted to commit workspace transaction without an active scope.',
			});
		}

		if (label && record.label && record.label !== label) {
			throw new WPKernelError('ValidationError', {
				message: `Attempted to commit transaction "${label}" but top of stack is "${record.label}".`,
			});
		}

		for (const original of record.originals.values()) {
			await cleanupOriginal(original);
		}

		return buildManifest(record);
	}

	async rollback(label?: string): Promise<FileManifest> {
		const record = this.#transactions.pop();
		if (!record) {
			throw new WPKernelError('ValidationError', {
				message:
					'Attempted to rollback workspace transaction without an active scope.',
			});
		}

		if (label && record.label && record.label !== label) {
			throw new WPKernelError('ValidationError', {
				message: `Attempted to rollback transaction "${label}" but top of stack is "${record.label}".`,
			});
		}

		const entries = Array.from(record.originals.entries()).reverse();
		for (const [relative, original] of entries) {
			const absolute = this.resolve(relative);
			switch (original.type) {
				case 'missing':
					await removePath(absolute);
					break;
				case 'file':
					await ensureParentDir(absolute);
					await fs.writeFile(absolute, original.data);
					break;
				case 'directory':
					await removePath(absolute);
					await fs.cp(original.backup, absolute, { recursive: true });
					break;
			}
		}

		for (const original of record.originals.values()) {
			await cleanupOriginal(original);
		}

		return buildManifest(record);
	}

	async dryRun<T>(
		fn: () => Promise<T>
	): Promise<{ result: T; manifest: FileManifest }> {
		this.begin('dry-run');
		try {
			const result = await fn();
			const manifest = await this.rollback('dry-run');
			return { result, manifest };
		} catch (error) {
			await this.rollback('dry-run').catch(() => undefined);
			throw error;
		}
	}

	async tmpDir(prefix = 'wpk-workspace-'): Promise<string> {
		const layout = await loadLayoutFromWorkspace({
			workspace: this,
			strict: false,
		});
		let base =
			layout?.resolve('workspace.tmp') ??
			path.join(this.#root, '.wpk', 'tmp');
		if (!path.isAbsolute(base)) {
			base = path.join(this.#root, base);
		}
		await fs.mkdir(base, { recursive: true });
		return fs.mkdtemp(path.join(base, prefix));
	}
}

export function buildWorkspace(root: string = process.cwd()): Workspace {
	return new FilesystemWorkspace(root);
}

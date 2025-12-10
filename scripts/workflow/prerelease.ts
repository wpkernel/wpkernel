#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

type ReleaseMode = 'prerelease' | 'patch';

interface Options {
	mode: ReleaseMode;
	preid: string;
	remote: string;
	branch: string;
	push: boolean;
	publish: boolean;
	publishTag?: string;
	version?: string;
	allowDirty: boolean;
}

interface ParsedVersion {
	major: number;
	minor: number;
	patch: number;
	prereleaseLabel?: string;
	prereleaseNumber?: number;
	raw: string;
}

interface ReleaseBranchResolution {
	originalBranch: string;
	releaseBranch: string;
	switched: boolean;
}

const STATE_FILE = '.release-next-version';

function parseArgs(argv: string[]): Options {
	const options: Options = {
		mode: 'prerelease',
		preid: 'beta',
		remote: 'upstream',
		branch: 'main',
		push: false,
		publish: false,
		allowDirty: false,
	};

	const expectValue = (flag: string, value: string | undefined): string => {
		if (!value) {
			throw new Error(`Flag ${flag} requires a value.`);
		}

		return value;
	};

	const valueFlags: Record<string, (value: string) => void> = {
		'--mode': (value) => {
			options.mode = value as ReleaseMode;
		},
		'--preid': (value) => {
			options.preid = value;
		},
		'--remote': (value) => {
			options.remote = value;
		},
		'--branch': (value) => {
			options.branch = value;
		},
		'--publish-tag': (value) => {
			options.publishTag = value;
		},
		'--version': (value) => {
			options.version = value;
		},
	};

	const booleanFlags = new Map<string, () => void>([
		['--push', () => (options.push = true)],
		['--publish', () => (options.publish = true)],
		['--allow-dirty', () => (options.allowDirty = true)],
	]);

	for (let index = 0; index < argv.length; index += 1) {
		const flag = argv[index];
		const assignValue = valueFlags[flag];
		if (assignValue) {
			const nextValue = expectValue(flag, argv[++index]);
			assignValue(nextValue);
			continue;
		}

		const toggle = booleanFlags.get(flag);
		if (toggle) {
			toggle();
			continue;
		}

		throw new Error(`Unknown argument: ${flag}`);
	}

	if (options.mode !== 'prerelease' && options.mode !== 'patch') {
		throw new Error(
			`Unsupported mode "${options.mode}". Use prerelease or patch.`
		);
	}

	return options;
}

function run(command: string, args: readonly string[], cwd: string): void {
	const result = spawnSync(command, [...args], {
		cwd,
		stdio: 'inherit',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function runCapture(
	command: string,
	args: readonly string[],
	cwd: string
): string {
	const result = spawnSync(command, [...args], {
		cwd,
		stdio: ['ignore', 'pipe', 'inherit'],
		encoding: 'utf8',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}

	return result.stdout.trim();
}

function parseVersion(version: string): ParsedVersion {
	const match = version.match(
		/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+)(?:\.(\d+))?)?$/
	);
	if (!match) {
		throw new Error(`Unable to parse semver version "${version}".`);
	}

	const [, major, minor, patch, label, num] = match;
	return {
		major: Number(major),
		minor: Number(minor),
		patch: Number(patch),
		prereleaseLabel: label,
		prereleaseNumber: typeof num === 'string' ? Number(num) : undefined,
		raw: version,
	};
}

function computeNextVersion(
	current: string,
	mode: ReleaseMode,
	preid: string
): string {
	const parsed = parseVersion(current);
	const safePreid = preid || 'beta';

	if (mode === 'patch') {
		return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}-${safePreid}.0`;
	}

	if (parsed.prereleaseLabel === safePreid) {
		const next =
			typeof parsed.prereleaseNumber === 'number'
				? parsed.prereleaseNumber + 1
				: 0;
		return `${parsed.major}.${parsed.minor}.${parsed.patch}-${safePreid}.${next}`;
	}

	return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}-${safePreid}.0`;
}

function getRootPackageVersion(repoRoot: string): string {
	const manifestPath = path.join(repoRoot, 'package.json');
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
		version?: string;
	};

	if (typeof manifest.version !== 'string') {
		throw new Error('Root package.json does not contain a version field.');
	}

	return manifest.version;
}

function readStateVersion(repoRoot: string): string | null {
	const filePath = path.join(repoRoot, STATE_FILE);
	if (!fs.existsSync(filePath)) {
		return null;
	}

	return fs.readFileSync(filePath, 'utf8').trim();
}

function writeStateVersion(repoRoot: string, version: string): void {
	fs.writeFileSync(path.join(repoRoot, STATE_FILE), `${version}\n`);
}

function removeStateFile(repoRoot: string): void {
	const filePath = path.join(repoRoot, STATE_FILE);
	if (fs.existsSync(filePath)) {
		fs.rmSync(filePath);
	}
}

function tagExists(repoRoot: string, version: string): boolean {
	const tagName = `v${version}`;
	return runCapture('git', ['tag', '-l', tagName], repoRoot) === tagName;
}

function runDocsBuild(repoRoot: string): void {
	run('pnpm', ['docs:build'], repoRoot);
}

function stageAll(repoRoot: string): boolean {
	run('git', ['add', '--all'], repoRoot);
	const hasChanges =
		spawnSync('git', ['diff', '--cached', '--quiet'], {
			cwd: repoRoot,
		}).status !== 0;
	return hasChanges;
}

function commitChanges(repoRoot: string, version: string): void {
	const hasStagedChanges =
		spawnSync('git', ['diff', '--cached', '--quiet'], {
			cwd: repoRoot,
		}).status !== 0;
	if (!hasStagedChanges) {
		console.log('Nothing to commit.');
		return;
	}

	run('git', ['commit', '-m', `chore: release v${version}`], repoRoot);
}

function tagRelease(repoRoot: string, version: string): boolean {
	const tagName = `v${version}`;
	const existingTags = runCapture('git', ['tag', '-l', tagName], repoRoot);
	if (existingTags === tagName) {
		console.log(`Tag ${tagName} already exists; skipping tag creation.`);
		return false;
	}

	run('git', ['tag', tagName], repoRoot);
	return true;
}

function pushRelease(
	repoRoot: string,
	remote: string,
	releaseBranch: string,
	targetBranch: string,
	version: string,
	tagCreated: boolean
): void {
	run('git', ['push', remote, `${releaseBranch}:${targetBranch}`], repoRoot);
	if (tagCreated) {
		run('git', ['push', remote, `v${version}`], repoRoot);
	}
}

function publishPackages(repoRoot: string, tag: string): void {
	run(
		'pnpm',
		['-r', 'publish', '--tag', tag, '--access', 'public'],
		repoRoot
	);
}

function stashWorkingTreeIfNeeded(repoRoot: string): string | null {
	const status = runCapture('git', ['status', '--porcelain'], repoRoot);
	if (status.length === 0) {
		return null;
	}

	const token = `prerelease-${Date.now()}`;
	console.log('Stashing local changes before switching to upstream...');
	run('git', ['stash', 'push', '--include-untracked', '-m', token], repoRoot);
	return token;
}

function getTrackingBranch(repoRoot: string): string | null {
	try {
		return runCapture(
			'git',
			['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
			repoRoot
		);
	} catch {
		return null;
	}
}

function resolveReleaseBranch(
	repoRoot: string,
	remote: string,
	targetBranch: string
): ReleaseBranchResolution {
	console.log(`Fetching latest ${remote}/${targetBranch}...`);
	run('git', ['fetch', remote, targetBranch], repoRoot);

	const originalBranch = runCapture(
		'git',
		['rev-parse', '--abbrev-ref', 'HEAD'],
		repoRoot
	);
	if (originalBranch === 'HEAD') {
		throw new Error('Prerelease workflow must run on a named branch.');
	}

	const trackingRef = getTrackingBranch(repoRoot);
	const expectedRef = `${remote}/${targetBranch}`;
	if (trackingRef === expectedRef) {
		return {
			originalBranch,
			releaseBranch: originalBranch,
			switched: false,
		};
	}

	console.log(`Checking out ${expectedRef} for release work...`);
	const tmpBranch = `prerelease-${targetBranch}`;
	run('git', ['checkout', '-B', tmpBranch, expectedRef], repoRoot);
	run(
		'git',
		['branch', '--set-upstream-to', expectedRef, tmpBranch],
		repoRoot
	);

	return { originalBranch, releaseBranch: tmpBranch, switched: true };
}

function restoreWorkingTree(
	repoRoot: string,
	info: ReleaseBranchResolution,
	stashToken: string | null
): void {
	if (info.switched) {
		run('git', ['checkout', info.originalBranch], repoRoot);
		run('git', ['branch', '-D', info.releaseBranch], repoRoot);
	}

	if (stashToken) {
		console.log(
			`Local work remains stashed as "${stashToken}". Run "git stash pop" on ${info.originalBranch} when ready.`
		);
	}
}

function resolveTargetVersion(
	repoRoot: string,
	currentVersion: string,
	options: Options
): string {
	if (options.version) {
		return options.version;
	}

	const stateVersion = readStateVersion(repoRoot);
	if (stateVersion) {
		if (tagExists(repoRoot, stateVersion)) {
			console.log(
				`State file ${STATE_FILE} contains already-released v${stateVersion}; recomputing target.`
			);
			removeStateFile(repoRoot);
		} else {
			return stateVersion;
		}
	}

	const next = computeNextVersion(
		currentVersion,
		options.mode,
		options.preid
	);
	writeStateVersion(repoRoot, next);
	return next;
}

function runReleaseBuild(
	repoRoot: string,
	currentVersion: string,
	targetVersion: string
): void {
	if (currentVersion !== targetVersion) {
		run(
			'pnpm',
			['exec', 'tsx', 'scripts/release/bump-version.ts', targetVersion],
			repoRoot
		);
		return;
	}

	console.log(
		`Workspace already at v${targetVersion}. Re-running docs build to ensure artifacts are fresh.`
	);
	runDocsBuild(repoRoot);
}

function publishIfRequested(repoRoot: string, options: Options): void {
	if (!options.publish) {
		return;
	}

	const publishTag = options.publishTag ?? options.preid;
	console.log(`Publishing packages with npm dist-tag "${publishTag}"...`);
	publishPackages(repoRoot, publishTag);
}

function main(): void {
	const options = parseArgs(process.argv.slice(2));
	const currentFilePath = fileURLToPath(import.meta.url);
	const repoRoot = path.resolve(path.dirname(currentFilePath), '..', '..');

	const stashToken = options.allowDirty
		? null
		: stashWorkingTreeIfNeeded(repoRoot);
	const branchInfo = resolveReleaseBranch(
		repoRoot,
		options.remote,
		options.branch
	);
	const currentVersion = getRootPackageVersion(repoRoot);
	const targetVersion = resolveTargetVersion(
		repoRoot,
		currentVersion,
		options
	);

	console.log(`Preparing release version ${targetVersion}`);
	runReleaseBuild(repoRoot, currentVersion, targetVersion);

	if (!stageAll(repoRoot)) {
		console.log('No file changes detected after build.');
	}

	commitChanges(repoRoot, targetVersion);
	const tagCreated = tagRelease(repoRoot, targetVersion);

	if (options.push) {
		pushRelease(
			repoRoot,
			options.remote,
			branchInfo.releaseBranch,
			options.branch,
			targetVersion,
			tagCreated
		);
	}

	publishIfRequested(repoRoot, options);
	restoreWorkingTree(repoRoot, branchInfo, stashToken);
	removeStateFile(repoRoot);
	console.log(`Release ${targetVersion} complete.`);
}

main();

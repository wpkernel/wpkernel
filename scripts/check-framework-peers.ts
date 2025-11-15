#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { FRAMEWORK_PEERS } from './config/framework-peers';

interface PackageJson {
	readonly name?: string;
	readonly dependencies?: Record<string, string>;
	readonly devDependencies?: Record<string, string>;
	readonly peerDependencies?: Record<string, string>;
}

const REQUIRED_PEERS: Record<string, readonly string[]> = {
	'@wpkernel/cli': [
		'@wpkernel/core',
		'@wpkernel/php-json-ast',
		'@wpkernel/ui',
	],
	'@wpkernel/core': [
		'@wordpress/api-fetch',
		'@wordpress/data',
		'@wordpress/element',
		'@wordpress/hooks',
		'@wordpress/interactivity',
	],
	'@wpkernel/e2e-utils': ['@wpkernel/core'],
	'@wpkernel/php-json-ast': ['@wpkernel/core'],
	'@wpkernel/test-utils': ['@wpkernel/core', '@wpkernel/ui', 'react'],
	'@wpkernel/ui': [
		'@wpkernel/core',
		'@wordpress/components',
		'@wordpress/data',
		'@wordpress/dataviews',
		'@wordpress/element',
		'react',
	],
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function readJsonFile<T>(filePath: string): T {
	const raw = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(raw) as T;
}

function gatherWorkspacePackages(): readonly string[] {
	const packagesDir = path.join(REPO_ROOT, 'packages');
	if (!fs.existsSync(packagesDir)) {
		return [];
	}

	return fs
		.readdirSync(packagesDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(packagesDir, entry.name, 'package.json'))
		.filter((filePath) => fs.existsSync(filePath));
}

function ensureRootDevDependencies(rootPackage: PackageJson): string[] {
	const errors: string[] = [];
	const devDependencies = rootPackage.devDependencies ?? {};

	for (const [dependency, spec] of Object.entries(FRAMEWORK_PEERS)) {
		if (!('devRange' in spec) || !spec.devRange) {
			continue;
		}

		const current = devDependencies[dependency];
		if (!current) {
			errors.push(
				`Root package.json is missing devDependency "${dependency}" (expected ${spec.devRange}).`
			);
			continue;
		}

		if (current !== spec.devRange) {
			errors.push(
				`Root devDependency "${dependency}" is "${current}" (expected ${spec.devRange}).`
			);
		}
	}

	return errors;
}

function collectRequiredPeerErrors(
	packageName: string,
	peerDependencies: Record<string, string>
): string[] {
	const requiredPeers = REQUIRED_PEERS[packageName] ?? [];

	return requiredPeers
		.filter((dependency) => !peerDependencies[dependency])
		.map(
			(dependency) =>
				`${packageName} is missing required peer dependency "${dependency}".`
		);
}

function collectPeerRangeErrors(
	packageName: string,
	peerDependencies: Record<string, string>
): string[] {
	const errors: string[] = [];

	for (const [dependency, spec] of Object.entries(FRAMEWORK_PEERS)) {
		const peerRange = peerDependencies[dependency];
		if (peerRange && peerRange !== spec.peerRange) {
			errors.push(
				`${packageName} declares peer dependency "${dependency}" as "${peerRange}" (expected ${spec.peerRange}).`
			);
		}
	}

	return errors;
}

function collectDependencyPlacementErrors(
	packageName: string,
	dependencies: Record<string, string>
): string[] {
	const errors: string[] = [];

	for (const [dependency, spec] of Object.entries(FRAMEWORK_PEERS)) {
		const dependencyRange = dependencies[dependency];
		if (!dependencyRange) {
			continue;
		}

		// Allow 'tooling' kind dependencies to be in dependencies (they're lazy-loaded)
		if (spec.kind !== 'internal' && spec.kind !== 'tooling') {
			errors.push(
				`${packageName} lists "${dependency}" under dependencies; move it to peerDependencies to keep the package external.`
			);
			continue;
		}

		// Internal workspace packages must use workspace:*
		if (spec.kind === 'internal' && dependencyRange !== 'workspace:*') {
			errors.push(
				`${packageName} lists internal dependency "${dependency}" as "${dependencyRange}" (expected workspace:*).`
			);
		}

		// Tooling packages can use regular semver ranges
		// No validation needed for tooling kind
	}

	return errors;
}

function collectDevDependencyErrors(
	packageName: string,
	devDependencies: Record<string, string>
): string[] {
	const errors: string[] = [];

	for (const [dependency, spec] of Object.entries(FRAMEWORK_PEERS)) {
		const devRange = devDependencies[dependency];
		if (!devRange) {
			continue;
		}

		if (!('devRange' in spec) || !spec.devRange) {
			errors.push(
				`${packageName} declares devDependency "${dependency}" but the shared capability does not define a version. Add a capability entry or remove the devDependency.`
			);
			continue;
		}

		if (devRange !== spec.devRange) {
			errors.push(
				`${packageName} declares devDependency "${dependency}" as "${devRange}" (expected ${spec.devRange}).`
			);
		}
	}

	return errors;
}

function ensurePeerCapability(
	packageJson: PackageJson,
	packagePath: string
): string[] {
	const packageName = packageJson.name ?? packagePath;
	const peerDependencies = packageJson.peerDependencies ?? {};
	const dependencies = packageJson.dependencies ?? {};
	const devDependencies = packageJson.devDependencies ?? {};

	return [
		...collectRequiredPeerErrors(packageName, peerDependencies),
		...collectPeerRangeErrors(packageName, peerDependencies),
		...collectDependencyPlacementErrors(packageName, dependencies),
		...collectDevDependencyErrors(packageName, devDependencies),
	];
}

function main(): void {
	const errors: string[] = [];
	const rootPackage = readJsonFile<PackageJson>(
		path.join(REPO_ROOT, 'package.json')
	);

	errors.push(...ensureRootDevDependencies(rootPackage));

	const workspacePackages = gatherWorkspacePackages();
	for (const packageJsonPath of workspacePackages) {
		const packageJson = readJsonFile<PackageJson>(packageJsonPath);
		errors.push(...ensurePeerCapability(packageJson, packageJsonPath));
	}

	if (errors.length > 0) {
		errors.forEach((message) => console.error(`\u274c ${message}`));
		console.error(
			`\nFound ${errors.length} framework peer dependency issue(s).`
		);
		process.exitCode = 1;
		return;
	}

	console.log('✅ Framework peer dependency capability is satisfied.');
}

main();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PIPELINE_PACKAGE_PATH = 'packages/pipeline/package.json';

function run(command: string, args: readonly string[], cwd: string): void {
	const result = spawnSync(command, [...args], { cwd, stdio: 'inherit' });
	if (result.status !== 0) process.exit(result.status ?? 1);
}

function main(): void {
	const args = process.argv.slice(2);
	const targetVersion = args[0];

	if (!targetVersion) {
		console.error('Usage: tsx scripts/release/release-pipeline.ts <version>');
		process.exit(1);
	}

	const repoRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
	const manifestPath = path.join(repoRoot, PIPELINE_PACKAGE_PATH);

	console.log(`Bumping @wpkernel/pipeline to ${targetVersion}...`);

	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	manifest.version = targetVersion;
	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');

	console.log('Building pipeline...');
	run('turbo', ['run', 'build', '--filter=@wpkernel/pipeline'], repoRoot);

	console.log('Committing and tagging...');
	run('git', ['add', PIPELINE_PACKAGE_PATH], repoRoot);
	// We allow empty if build didn't change files, but package.json def changed.
	run('git', ['commit', '-m', `chore(pipeline): release v${targetVersion}`], repoRoot);

	const tagName = `pipeline-v${targetVersion}`;
	run('git', ['tag', tagName], repoRoot);

	console.log(`\nSuccess! Created tag ${tagName}.`);
	console.log(`Run "git push upstream ${tagName}" to push.`);
	console.log(`Run "pnpm publish -r --filter=@wpkernel/pipeline" to publish.`);
}

main();

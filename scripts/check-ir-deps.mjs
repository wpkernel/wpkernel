#!/usr/bin/env node
/**
 * Quick helper checker: ensures builders that touch `input.ir` declare at least
 * one `ir.*` dependency in helpers.json. This is intentionally lightweight and
 * conservative; it only spots obvious gaps.
 *
 * Usage:
 *   node scripts/check-ir-deps.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(path.join(import.meta.url.replace('file://', ''), '..', '..'));
const helpersPath = path.join(repoRoot, 'scripts', 'helpers.json');

const helpers = JSON.parse(fs.readFileSync(helpersPath, 'utf8')).helpers ?? [];

const missing = [];

for (const helper of helpers) {
	if (helper.kind !== 'builder' || !helper.file) {
		continue;
	}

	const filePath = path.join(repoRoot, helper.file);
	if (!fs.existsSync(filePath)) {
		continue;
	}

	const source = fs.readFileSync(filePath, 'utf8');
	const touchesIr = /input\.ir/.test(source);
	const hasIrDep =
		Array.isArray(helper.dependsOn) &&
		helper.dependsOn.some((dep) => dep.startsWith('ir.'));

	if (touchesIr && !hasIrDep) {
		missing.push({
			key: helper.key,
			file: helper.file,
		});
	}
}

if (missing.length > 0) {
	console.error('Builders touching input.ir without ir.* dependsOn:');
	for (const entry of missing) {
		console.error(`- ${entry.key} (${entry.file})`);
	}
	process.exit(1);
}

console.log('IR dependency check passed.');

#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import ts from 'typescript';

const PACKAGES = ['core', 'cli', 'pipeline', 'php-json-ast', 'ui', 'wp-json-ast'];
const mode = process.argv.includes('--fix') ? 'fix' : 'check';
const stripMaps = process.argv.includes('--strip-maps');
const distGlobs = ['packages/*/dist/**/*.d.ts'];
const offenders = [];

function readSource(file) {
	return fs.readFile(file, 'utf8');
}

function printFile(node, sourceFile) {
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
	return printer.printFile(node, sourceFile);
}

function toPackageAlias(specifier) {
	const pkgPattern = `(${PACKAGES.join('|')})`;
	const relPattern = new RegExp(
		String.raw`^(?:\.\.\/)+(?:packages\/)?${pkgPattern}\/src\/(.+)$`
	);
	const scopedPattern = new RegExp(
		String.raw`^@wpkernel\/${pkgPattern}\/src\/(.+)$`
	);

	const relMatch = specifier.match(relPattern);
	if (relMatch) {
		const [, pkg, rest] = relMatch;
		return `@wpkernel/${pkg}/${rest.replace(/(\.d)?\.ts$/, '').replace(/\.js$/, '')}`;
	}

	const scopedMatch = specifier.match(scopedPattern);
	if (scopedMatch) {
		const [, pkg, rest] = scopedMatch;
		return `@wpkernel/${pkg}/${rest.replace(/(\.d)?\.ts$/, '').replace(/\.js$/, '')}`;
	}

	return null;
}

function normalizeModuleSpecifier(specifier) {
	const alias = toPackageAlias(specifier);
	if (alias) {
		return { specifier: alias.replace(/\.d\.ts$/, '.js'), typeOnly: false };
	}

	if (specifier.endsWith('.d.ts')) {
		return { specifier: specifier.replace(/\.d\.ts$/, '.js'), typeOnly: true };
	}

	if (specifier.endsWith('.ts')) {
		return { specifier: specifier.replace(/\.ts$/, '.js'), typeOnly: false };
	}

	return { specifier, typeOnly: false };
}

function rewriteImportExport(sourceText) {
	const sf = ts.createSourceFile('temp.d.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	let changed = false;

	const visitor = (node) => {
		if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
			const { specifier, typeOnly } = normalizeModuleSpecifier(node.moduleSpecifier.text);
			const nextClause = node.importClause
				? ts.factory.updateImportClause(
						node.importClause,
						typeOnly || node.importClause.isTypeOnly,
						node.importClause.name,
						node.importClause.namedBindings
				  )
				: undefined;

			if (specifier !== node.moduleSpecifier.text || nextClause !== node.importClause) {
				changed = true;
				return ts.factory.updateImportDeclaration(
					node,
					node.modifiers,
					nextClause,
					ts.factory.createStringLiteral(specifier),
					node.assertClause
				);
			}
		}

		if (ts.isExportDeclaration(node)) {
			const moduleSpecifier = node.moduleSpecifier;
			if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) {
				return ts.visitEachChild(node, visitor, ts.nullTransformationContext);
			}

			const { specifier, typeOnly } = normalizeModuleSpecifier(moduleSpecifier.text);
			const isTypeOnly = false;
			if (
				specifier !== node.moduleSpecifier.text ||
				isTypeOnly !== node.isTypeOnly
			) {
				changed = true;
				return ts.factory.updateExportDeclaration(
					node,
					node.modifiers,
					isTypeOnly,
					node.exportClause,
					ts.factory.createStringLiteral(specifier),
					node.assertClause
				);
			}
		}

		return ts.visitEachChild(node, visitor, ts.nullTransformationContext);
	};

	const updated = ts.visitNode(sf, visitor);
	if (!changed) return { changed: false, text: sourceText };
	return { changed: true, text: printFile(updated, sf) };
}

async function processFile(file) {
	const contents = await readSource(file);
	const { changed, text } = rewriteImportExport(contents);
	if (changed) {
		if (mode === 'fix') {
			await fs.writeFile(file, text, 'utf8');
		} else {
			offenders.push(file);
		}
	}
}

async function main() {
	const files = await glob(distGlobs, { posix: true });
	for (const file of files) {
		await processFile(file);
	}

	if (mode === 'fix' && stripMaps) {
		const mapGlobs = distGlobs.map((pattern) => pattern.replace(/\.d\.ts$/, '.d.ts.map'));
		const maps = await glob(mapGlobs, { posix: true });
		await Promise.all(maps.map((file) => fs.rm(file, { force: true })));
	}

	if (mode === 'check' && offenders.length > 0) {
		console.error(
			`Found ${offenders.length} .d.ts files importing package sources, .ts, or .d.ts modules:\n` +
				offenders.map((f) => ` - ${path.posix.normalize(f)}`).join('\n')
		);
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

#!/usr/bin/env ts-node

import path from 'node:path';
import { Project, SyntaxKind, Node } from 'ts-morph';

const root = process.argv[2];
const rootDir = path.resolve(process.cwd(), root);

const project = new Project({
	// assume repo root tsconfig; adjust if needed
	tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
	skipAddingFilesFromTsConfig: false,
});

// Limit to ts / tsx under root
project.addSourceFilesAtPaths([
	path.join(root, '**/*.ts'),
	path.join(root, '**/*.tsx'),
]);

for (const sourceFile of project.getSourceFiles()) {
	const filePath = sourceFile.getFilePath();

	// Only process files under the requested root, and never touch node_modules
	if (!filePath.startsWith(rootDir + path.sep)) {
		continue;
	}
	if (filePath.includes(`${path.sep}node_modules${path.sep}`)) {
		continue;
	}

	let changed = false;

	const typeLiterals = sourceFile.getDescendantsOfKind(
		SyntaxKind.TypeLiteral
	);
	const replacements: {
		node: (typeof typeLiterals)[number];
		text: string;
	}[] = [];

	for (const typeLiteral of typeLiterals) {
		const parent = typeLiteral.getParent();

		// Only touch assertions: `expr as { ... }` or `<{ ... }>expr`
		if (!Node.isAsExpression(parent) && !Node.isTypeAssertion(parent)) {
			continue;
		}

		const members = typeLiteral.getMembers();
		if (members.length === 0) {
			continue;
		}

		const original = typeLiteral.getText();

		// Build a single-line representation of the type literal
		const memberTexts = members.map((m) =>
			m.getText().replace(/\s+/g, ' ').trim()
		);
		const singleLine = `{ ${memberTexts.join(' ')} }`;

		// Inline whenever the single-line form differs from the original.
		// Prettier/ESLint will handle wrapping to your printWidth afterwards.
		if (singleLine !== original) {
			replacements.push({ node: typeLiteral, text: singleLine });
		}
	}

	if (replacements.length > 0) {
		for (const { node, text } of replacements) {
			node.replaceWithText(text);
		}
		changed = true;
	}

	if (changed) {
		// Let ts-morph / TS printer tidy indentation etc.
		sourceFile.formatText({
			indentSize: 2,
			convertTabsToSpaces: true,
		});
		sourceFile.saveSync();
		console.log('Reflowed', sourceFile.getFilePath());
	}
}

/* eslint-disable */
import {
	Project,
	SyntaxKind,
	Node,
	FunctionDeclaration,
	MethodDeclaration,
	FunctionExpression,
	ArrowFunction,
	VariableDeclaration,
} from 'ts-morph';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

type HelperEntry = {
	key: string;
	file: string;
	functionName?: string;
	returnType?: string;
	kind?: string;
	mode?: string;
	priority?: number;
	dependsOn?: string[];
};

// --- ESM-safe repo root ---
const thisFile = fileURLToPath(import.meta.url);
const thisDir = path.dirname(thisFile);
const repoRoot = path.resolve(thisDir, '..');

function walkDir(dir: string, fileList: string[] = []): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walkDir(fullPath, fileList);
		} else if (entry.isFile() && fullPath.endsWith('.ts')) {
			fileList.push(fullPath);
		}
	}
	return fileList;
}

console.time('fileDiscovery');
const packageDir = path.join(repoRoot, 'packages');
const allFiles = walkDir(packageDir);
console.timeEnd('fileDiscovery');
console.log(`Discovered ${allFiles.length} .ts files under packages/`);

const project = new Project({
	useInMemoryFileSystem: false,
	skipAddingFilesFromTsConfig: true,
	skipFileDependencyResolution: true,
	compilerOptions: {}, // syntax-only; we don't need types
});

const outputPath = process.argv[2]
	? path.resolve(process.cwd(), process.argv[2])
	: path.join(repoRoot, 'scripts', 'helpers.json');

console.time('scan:all');

const records: HelperEntry[] = [];

let fileCount = 0;

for (const filePath of allFiles) {
	fileCount++;
	if (fileCount % 25 === 0) {
		console.log(`Scanned ${fileCount} files so far...`);
	}

	const relPath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
	const text = fs.readFileSync(filePath, 'utf8');

	// cheap text filter first
	if (!text.includes('createHelper')) {
		continue;
	}

	// create or overwrite source file in project
	const sourceFile = project.createSourceFile(filePath, text, {
		overwrite: true,
	});

	const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

	for (const call of calls) {
		const expr = call.getExpression();

		// Match:
		//   createHelper(...)
		//   ns.createHelper(...)
		let isCreateHelper = false;
		if (Node.isIdentifier(expr) && expr.getText() === 'createHelper') {
			isCreateHelper = true;
		} else if (
			Node.isPropertyAccessExpression(expr) &&
			expr.getName() === 'createHelper'
		) {
			isCreateHelper = true;
		}

		if (!isCreateHelper) continue;

		const [arg] = call.getArguments();
		if (!arg || !Node.isObjectLiteralExpression(arg)) continue;

		const keyProp = arg.getProperty('key');
		if (!keyProp || !Node.isPropertyAssignment(keyProp)) continue;

		const keyInit = keyProp.getInitializer();
		if (
			!keyInit ||
			!(
				Node.isStringLiteral(keyInit) ||
				Node.isNoSubstitutionTemplateLiteral(keyInit)
			)
		) {
			continue;
		}

		const key = keyInit.getLiteralText();

		let functionName: string | undefined;
		let returnType: string | undefined;
		let kind: string | undefined;
		let mode: string | undefined;
		let priority: number | undefined;
		let dependsOn: string[] | undefined;

		// --- kind: 'builder' | 'fragment' | etc ---
		const kindProp = arg.getProperty('kind');
		if (kindProp && Node.isPropertyAssignment(kindProp)) {
			const init = kindProp.getInitializer();
			if (
				init &&
				(Node.isStringLiteral(init) ||
					Node.isNoSubstitutionTemplateLiteral(init))
			) {
				kind = init.getLiteralText();
			}
		}

		// --- mode: 'sync' | 'async' | etc (optional) ---
		const modeProp = arg.getProperty('mode');
		if (modeProp && Node.isPropertyAssignment(modeProp)) {
			const init = modeProp.getInitializer();
			if (
				init &&
				(Node.isStringLiteral(init) ||
					Node.isNoSubstitutionTemplateLiteral(init))
			) {
				mode = init.getLiteralText();
			}
		}

		// --- priority: numeric literal (optional) ---
		const priorityProp = arg.getProperty('priority');
		if (priorityProp && Node.isPropertyAssignment(priorityProp)) {
			const init = priorityProp.getInitializer();
			if (init && Node.isNumericLiteral(init)) {
				priority = Number(init.getText());
			}
		}

		// --- dependsOn: ['a', 'b', ...] (optional) ---
		const dependsProp = arg.getProperty('dependsOn');
		if (dependsProp && Node.isPropertyAssignment(dependsProp)) {
			const init = dependsProp.getInitializer();
			if (init && Node.isArrayLiteralExpression(init)) {
				dependsOn = init
					.getElements()
					.map((el) =>
						Node.isStringLiteral(el) ||
						Node.isNoSubstitutionTemplateLiteral(el)
							? el.getLiteralText()
							: undefined
					)
					.filter((v): v is string => Boolean(v));
			}
		}
		// Find nearest function-like ancestor
		const fnLike = call.getFirstAncestor(
			(
				node
			): node is
				| FunctionDeclaration
				| MethodDeclaration
				| FunctionExpression
				| ArrowFunction =>
				Node.isFunctionDeclaration(node) ||
				Node.isMethodDeclaration(node) ||
				Node.isFunctionExpression(node) ||
				Node.isArrowFunction(node)
		);

		/* eslint-disable max-depth */
		if (fnLike) {
			if (
				Node.isFunctionDeclaration(fnLike) ||
				Node.isMethodDeclaration(fnLike)
			) {
				functionName = fnLike.getName() ?? undefined;
				returnType = fnLike.getReturnTypeNode()?.getText();
			} else {
				// Arrow/function expression – look for enclosing variable declaration
				const varDecl = fnLike.getFirstAncestor(
					(node): node is VariableDeclaration =>
						Node.isVariableDeclaration(node)
				);
				if (varDecl) {
					functionName = varDecl.getName();
					returnType = varDecl.getTypeNode()?.getText();
				}
			}
		}

		// If still no functionName, try direct variable declaration (e.g. const foo = createHelper(...))
		if (!functionName) {
			const varDecl = call.getFirstAncestor(
				(node): node is VariableDeclaration =>
					Node.isVariableDeclaration(node)
			);

			if (varDecl) {
				functionName = varDecl.getName();
			}

			if (!returnType && varDecl) {
				returnType = varDecl.getTypeNode()?.getText();
			}
		}
		/* eslint-enable max-depth */

		const record: HelperEntry = {
			key,
			file: relPath,
			functionName,
			returnType,
			kind,
			mode,
			priority,
			dependsOn,
		};

		records.push(record);
	}

	sourceFile.forget();
}

console.timeEnd('scan:all');

function isTestFile(relPath: string): boolean {
	return (
		relPath.includes('__tests__/') ||
		relPath.includes('/tests/') ||
		relPath.endsWith('.test.ts') ||
		relPath.endsWith('.spec.ts')
	);
}

const helpers = records.filter((r) => !isTestFile(r.file));
const tests = records.filter((r) => isTestFile(r.file));

const finalOutput = { helpers, tests };

fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2), 'utf8');

console.log(
	`Helpers: ${helpers.length}, Tests: ${tests.length} | output: ${path.relative(
		process.cwd(),
		outputPath
	)}`
);

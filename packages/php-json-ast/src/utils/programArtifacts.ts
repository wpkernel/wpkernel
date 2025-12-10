import { createHash } from 'node:crypto';
import type { PipelineContext, BuilderOutput } from '../programBuilder';
import type {
	PhpProgramCodemodResult,
	PhpProgramCodemodVisitorSummary,
} from '../codemods/types';
import type { PhpProgram } from '../nodes';

export function serialiseAst(ast: unknown): string {
	return `${JSON.stringify(ast, null, 2)}\n`;
}

export interface PersistProgramArtifactsOptions {
	readonly emitAst?: boolean;
}

export async function persistProgramArtifacts(
	context: PipelineContext,
	output: BuilderOutput,
	filePath: string,
	code: string,
	ast: PhpProgram,
	options: PersistProgramArtifactsOptions = {}
): Promise<void> {
	const emitAst = options.emitAst ?? true;

	await context.workspace.write(filePath, code, {
		ensureDir: true,
	});

	output.queueWrite({
		file: filePath,
		contents: code,
	});

	if (!emitAst) {
		return;
	}

	const astPath = `${filePath}.ast.json`;
	const serialisedAst = serialiseAst(ast);

	await context.workspace.write(astPath, serialisedAst, {
		ensureDir: true,
	});

	output.queueWrite({
		file: astPath,
		contents: serialisedAst,
	});
}

export async function persistCodemodDiagnostics(
	context: PipelineContext,
	output: BuilderOutput,
	filePath: string,
	codemod: PhpProgramCodemodResult,
	options: PersistProgramArtifactsOptions = {}
): Promise<void> {
	if (!(options.emitAst ?? true)) {
		return;
	}

	const basePath = `${filePath}.codemod`;
	const beforePath = `${basePath}.before.ast.json`;
	const afterPath = `${basePath}.after.ast.json`;
	const summaryPath = `${basePath}.summary.txt`;
	const beforeDumpPath = `${basePath}.before.dump.txt`;
	const afterDumpPath = `${basePath}.after.dump.txt`;

	const beforeContents = serialiseAst(codemod.before);
	const afterContents = serialiseAst(codemod.after);
	const summaryContents = formatCodemodSummary(codemod);
	const beforeDumpContents = codemod.diagnostics?.dumps?.before ?? null;
	const afterDumpContents = codemod.diagnostics?.dumps?.after ?? null;

	await context.workspace.write(beforePath, beforeContents, {
		ensureDir: true,
	});
	await context.workspace.write(afterPath, afterContents, {
		ensureDir: true,
	});
	await context.workspace.write(summaryPath, summaryContents, {
		ensureDir: true,
	});

	output.queueWrite({
		file: beforePath,
		contents: beforeContents,
	});
	output.queueWrite({
		file: afterPath,
		contents: afterContents,
	});
	output.queueWrite({
		file: summaryPath,
		contents: summaryContents,
	});

	await writeCodemodDump(context, output, beforeDumpPath, beforeDumpContents);
	await writeCodemodDump(context, output, afterDumpPath, afterDumpContents);
}

function ensureTrailingNewline(contents: string): string {
	return contents.endsWith('\n') ? contents : `${contents}\n`;
}

async function writeCodemodDump(
	context: PipelineContext,
	output: BuilderOutput,
	targetPath: string,
	contents: string | null
): Promise<void> {
	if (contents === null) {
		return;
	}

	const normalised = ensureTrailingNewline(contents);

	await context.workspace.write(targetPath, normalised, {
		ensureDir: true,
	});

	output.queueWrite({
		file: targetPath,
		contents: normalised,
	});
}

export function formatCodemodSummary(codemod: PhpProgramCodemodResult): string {
	const beforeHash = hashAst(codemod.before);
	const afterHash = hashAst(codemod.after);
	const differences = collectCodemodDifferences(
		codemod.before,
		codemod.after
	);

	const visitorLines = codemod.visitors.map(formatCodemodVisitorSummary);

	const lines = [
		'Codemod visitors:',
		...(visitorLines.length > 0
			? visitorLines.map((line) => `- ${line}`)
			: ['- <none declared>']),
		'',
		`Before hash: ${beforeHash}`,
		`After hash: ${afterHash}`,
		`Change detected: ${beforeHash === afterHash ? 'no' : 'yes'}`,
		'',
		'Differences:',
		...(differences.length > 0
			? differences.map((diff) => `- ${diff}`)
			: ['- No structural differences detected.']),
		'',
	];

	return `${lines.join('\n')}\n`;
}

export function formatCodemodVisitorSummary(
	visitor: PhpProgramCodemodVisitorSummary
): string {
	const stackIdentifier = `${visitor.stackKey}#${visitor.stackIndex}`;
	return `${visitor.key} (stack ${stackIdentifier}, visitor ${visitor.visitorIndex}) -> ${visitor.class}`;
}

export function collectCodemodDifferences(
	before: PhpProgram,
	after: PhpProgram,
	limit = 20
): string[] {
	const differences: string[] = [];
	compareValues(before, after, '$', differences, limit);
	return differences;
}

export function hashAst(ast: PhpProgram): string {
	const payload = JSON.stringify(ast);
	return createHash('sha256').update(payload).digest('hex');
}

function compareValues(
	before: unknown,
	after: unknown,
	path: string,
	differences: string[],
	limit: number
): void {
	if (
		hasReachedDifferenceLimit(differences, limit) ||
		Object.is(before, after)
	) {
		return;
	}

	const beforeType = describeType(before);
	const afterType = describeType(after);

	if (beforeType !== afterType) {
		differences.push(
			`${path}: type changed from ${beforeType} to ${afterType}`
		);
		return;
	}

	if (Array.isArray(before) && Array.isArray(after)) {
		compareArrays(before, after, path, differences, limit);
		return;
	}

	if (isPlainObject(before) && isPlainObject(after)) {
		compareObjects(before, after, path, differences, limit);
		return;
	}

	differences.push(
		`${path}: ${describeValue(before)} -> ${describeValue(after)}`
	);
}

function compareArrays(
	before: readonly unknown[],
	after: readonly unknown[],
	path: string,
	differences: string[],
	limit: number
): void {
	const length = Math.min(before.length, after.length);

	for (let index = 0; index < length; index += 1) {
		compareValues(
			before[index],
			after[index],
			`${path}[${index}]`,
			differences,
			limit
		);

		if (hasReachedDifferenceLimit(differences, limit)) {
			return;
		}
	}

	if (
		before.length !== after.length &&
		!hasReachedDifferenceLimit(differences, limit)
	) {
		differences.push(
			`${path}: length changed from ${before.length} to ${after.length}`
		);
	}
}

function compareObjects(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	path: string,
	differences: string[],
	limit: number
): void {
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	const sortedKeys = Array.from(keys).sort();

	for (const key of sortedKeys) {
		if (hasReachedDifferenceLimit(differences, limit)) {
			return;
		}

		const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
		const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
		const nextPath = path === '$' ? `$.${key}` : `${path}.${key}`;

		if (!hasBefore) {
			differences.push(`${nextPath}: added ${describeValue(after[key])}`);
			continue;
		}

		if (!hasAfter) {
			differences.push(
				`${nextPath}: removed ${describeValue(before[key])}`
			);
			continue;
		}

		compareValues(before[key], after[key], nextPath, differences, limit);
	}
}

function hasReachedDifferenceLimit(
	differences: readonly unknown[],
	limit: number
): boolean {
	return differences.length >= limit;
}

function describeType(value: unknown): string {
	if (Array.isArray(value)) {
		return 'array';
	}

	if (value === null) {
		return 'null';
	}

	return typeof value;
}

function describeValue(value: unknown): string {
	if (typeof value === 'string') {
		const truncated = value.length > 57 ? `${value.slice(0, 57)}…` : value;
		return JSON.stringify(truncated);
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (value === null) {
		return 'null';
	}

	if (Array.isArray(value)) {
		return `Array(${value.length})`;
	}

	if (isPlainObject(value)) {
		const nodeType =
			typeof (value as { nodeType?: unknown }).nodeType === 'string'
				? ` ${(value as { nodeType: string }).nodeType}`
				: '';
		return `Object${nodeType}`.trim();
	}

	return typeof value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

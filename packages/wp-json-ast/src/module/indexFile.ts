import {
	buildArray,
	buildArrayItem,
	buildBinaryOperation,
	buildName,
	buildReturn,
	buildScalarString,
	type PhpExpr,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

import { buildRestIndexDocblock } from '../common/docblock';
import type {
	IndexProgram,
	IndexProgramConfig,
	ModuleIndexEntry,
} from './types';

/**
 * @param    config
 * @category WordPress AST
 */
export function buildIndexProgram(config: IndexProgramConfig): IndexProgram {
	const docblock = buildRestIndexDocblock({ origin: config.origin });
	const plannedEntries = applyModuleIndexAugmentors(
		config.entries,
		config.augment
	);
	const statements: PhpStmt[] = [
		buildReturn(buildIndexArray(plannedEntries)),
	];

	return {
		namespace: config.namespace,
		docblock,
		metadata:
			config.metadataName === undefined
				? { kind: 'index-file' }
				: { kind: 'index-file', name: config.metadataName },
		statements,
	} satisfies IndexProgram;
}

function applyModuleIndexAugmentors(
	entries: readonly ModuleIndexEntry[],
	augmentors: IndexProgramConfig['augment']
): readonly ModuleIndexEntry[] {
	if (!augmentors || augmentors.length === 0) {
		return entries;
	}

	return augmentors.reduce<readonly ModuleIndexEntry[]>(
		(current, augment) => {
			const result = augment(current);
			return Array.isArray(result) ? result : current;
		},
		entries
	);
}

function buildIndexArray(entries: readonly ModuleIndexEntry[]): PhpExpr {
	const items = entries.map((entry) =>
		buildArrayItem(buildIndexPathExpression(entry.path), {
			key: buildScalarString(entry.className),
		})
	);

	return buildArray(items);
}

function buildIndexPathExpression(path: string): PhpExpr {
	const normalised = path.startsWith('/') ? path : `/${path}`;
	return buildBinaryOperation(
		'Concat',
		buildDirectoryConstFetch(),
		buildScalarString(normalised)
	);
}

function buildDirectoryConstFetch(): PhpExpr {
	return {
		nodeType: 'Expr_ConstFetch',
		attributes: {},
		name: buildName(['__DIR__']),
	} satisfies PhpExpr;
}

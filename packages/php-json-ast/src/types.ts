import type { PhpNode, PhpProgram, PhpStmt } from './nodes';
import type { WorkspaceLike } from './workspace';

export type PhpFileMetadata = Readonly<Record<string, unknown>> & {
	readonly kind?: string;
};

export interface PhpAstBuilder {
	getNamespace: () => string;
	setNamespace: (namespace: string) => void;
	addUse: (statement: string) => void;
	appendDocblock: (line: string) => void;
	appendStatement: (statement: string) => void;
	appendProgramStatement: (statement: PhpStmt) => void;
	getStatements: () => readonly string[];
	getMetadata: () => PhpFileMetadata;
	setMetadata: (metadata: PhpFileMetadata) => void;
	getProgramAst: () => PhpProgram;
}

export type PhpJsonNode = PhpNode;

export type PhpJsonAst = PhpProgram;

export type DriverWorkspace = WorkspaceLike;
export type { WorkspaceLike } from './workspace';
export type {
	PhpPrettyPrintPayload,
	PhpPrettyPrintResult,
	PhpPrettyPrinter,
} from './prettyPrinter/createPhpPrettyPrinter';

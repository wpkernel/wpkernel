import path from 'node:path';
import { createModuleResolver } from './module-url';

const resolveFromCli = createModuleResolver();

function resolvePackageRoot(pkgName: string): string {
	return path.dirname(resolveFromCli(`${pkgName}/package.json`));
}

export function resolveBundledPhpJsonAstIngestionPath(): string {
	const pkgRoot = resolvePackageRoot('@wpkernel/php-json-ast');
	return path.join(pkgRoot, 'php', 'ingest-program.php');
}

export function resolveBundledPhpDriverPrettyPrintPath(): string {
	const pkgRoot = resolvePackageRoot('@wpkernel/php-json-ast');
	return path.join(pkgRoot, 'php', 'pretty-print.php');
}

export function resolveBundledComposerAutoloadPath(): string {
	const pkgRoot = resolvePackageRoot('@wpkernel/php-json-ast');
	return path.join(pkgRoot, 'vendor', 'autoload.php');
}

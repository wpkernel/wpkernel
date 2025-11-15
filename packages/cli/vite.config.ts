import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWPKLibConfig } from '../../vite.config.base';
import pkg from './package.json';

function resolveCliRoot(): string {
	if (typeof __dirname === 'string') {
		return __dirname;
	}

	try {
		const moduleUrl = new Function('return import.meta.url')() as string;
		return fileURLToPath(new URL('.', moduleUrl));
	} catch {
		return process.cwd();
	}
}

const CLI_ROOT = resolveCliRoot();

const externalPeerDependencies = Object.keys(pkg.peerDependencies || {}).filter(
	(dep) => dep !== '@wpkernel/php-json-ast'
);

const external = [
	...externalPeerDependencies,
	'chokidar',
	'clipanion',
	'cosmiconfig',
	'typanion',
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
	'typescript',
	'ts-morph',
];

const config = createWPKLibConfig(
	'@wpkernel/cli',
	{
		index: 'src/index.ts',
	},
	{
		external,
	}
);

const cliSrcRoot = resolvePath(CLI_ROOT, 'src');
const existingAlias = config.resolve?.alias;
const aliasEntries = Array.isArray(existingAlias)
	? existingAlias.slice()
	: Object.entries(existingAlias ?? {}).map(([find, replacement]) => ({
			find,
			replacement,
		}));

aliasEntries.push(
	{
		find: /^@wpkernel\/cli$/,
		replacement: resolvePath(cliSrcRoot, 'index.ts'),
	},
	{
		find: /^@wpkernel\/cli\//,
		replacement: `${cliSrcRoot}/`,
	}
);

config.resolve = {
	...(config.resolve ?? {}),
	alias: aliasEntries,
};

export default config;

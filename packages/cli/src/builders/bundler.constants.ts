import path from 'node:path';

export const VITE_CONFIG_FILENAME = 'vite.config.ts';

export const MONOREPO_DEP_DENYLIST = new Set([
	'loglayer',
	'@loglayer/shared',
	'@loglayer/transport',
	'@loglayer/transport-simple-pretty-terminal',
	'@wpkernel/cli',
	'@wpkernel/e2e-utils',
]);

export const BUNDLER_TRANSACTION_LABEL = 'builder.generate.bundler.core';

export const DEFAULT_ENTRY_POINT = 'src/index.ts';
export const DEFAULT_ENTRY_KEY = 'index';
export const DEFAULT_OUTPUT_DIR = 'build';
export const DEFAULT_ALIAS_ROOT = './src';

export const DEFAULT_ASSET_PATH = path.posix.join(
	DEFAULT_OUTPUT_DIR,
	'index.asset.json'
);

export const DEFAULT_PACKAGE_SCRIPTS: Record<string, string> = {
	start: 'wpk start',
	build: 'vite build',
	generate: 'wpk generate',
	apply: 'wpk apply',
};

export const DEFAULT_WORDPRESS_EXTERNALS = [
	'@wordpress/element',
	'@wordpress/element/jsx-runtime',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/date',
	'@wordpress/hooks',
	'@wordpress/i18n',
	'@wordpress/api-fetch',
	'@wordpress/block-editor',
	'@wordpress/blocks',
	'@wordpress/private-apis',
	'@wordpress/interactivity',
	'@wordpress/url',
];

export const REACT_EXTERNALS = [
	'react',
	'react-dom',
	'react-dom/client',
	'react/jsx-runtime',
	'react/jsx-dev-runtime',
];

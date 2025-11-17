/**
 * ESLint Configuration for WPKernel (Flat Config)
 *
 * Extends WordPress coding standards with custom rules for the framework.
 * @see https://eslint.org/docs/latest/use/configure/configuration-files-new
 */

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import sonarjs from 'eslint-plugin-sonarjs';
import earlyReturn from 'eslint-plugin-early-return';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import path from 'path';
import { fileURLToPath } from 'url';
import noManualTestGlobals from './eslint-rules/no-manual-test-globals.js';
import noConsoleInKernel from './eslint-rules/no-console-in-wpkernel.js';
import noHardcodedNamespaceStrings from './eslint-rules/no-hardcoded-namespace-strings.js';
import configConsistency from './eslint-rules/config-consistency.js';
import cacheKeysValid from './eslint-rules/cache-keys-valid.js';
import capabilityHints from './eslint-rules/capability-hints.js';
import docLinks from './eslint-rules/doc-links.js';
import noHardcodedLayoutPaths from './eslint-rules/no-hardcoded-layout-paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const kernelPlugin = {
	rules: {
		'no-manual-test-globals': noManualTestGlobals,
		'no-console-in-kernel': noConsoleInKernel,
		'no-hardcoded-namespace-strings': noHardcodedNamespaceStrings,
		'config-consistency': configConsistency,
		'cache-keys-valid': cacheKeysValid,
		'capability-hints': capabilityHints,
		'doc-links': docLinks,
		'no-hardcoded-layout-paths': noHardcodedLayoutPaths,
	},
};

const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
});

export default [
	// Convert WordPress recommended config from legacy format
	...compat.extends('plugin:@wordpress/eslint-plugin/recommended'),

	// Global ignores
	{
		ignores: [
			'**/dist/**',
			'**/build/**',
			'**/node_modules/**',
			'**/vendor/**',
			'packages/ui/vendor/**',
			'**/.wordpress-cache/**',
			'**/information/**',
			'coverage/**',
			'.changeset/**',
			'**/*.php', // PHP files handled by PHPCS
		],
	},

	// Base configuration for all files
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tsParser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
			},
		},

		settings: {
			react: {
				version: 'detect',
			},
			'import/resolver': {
				typescript: {
					alwaysTryTypes: true,
					project: './tsconfig.base.json',
				},
			},
		},

		plugins: {
			'@wpkernel': kernelPlugin,
			import: importPlugin,
			unicorn,
			sonarjs,
			'early-return': earlyReturn,
		},

		// Custom rules forWPKernel
		rules: {
			'jsdoc/check-param-names': 'off',
			'jsdoc/check-tag-names': 'off',
			'jsdoc/no-undefined-types': 'off',
			// Disable problematic rule (ESLint 9 compatibility issue)
			'@wordpress/no-unused-vars-before-return': 'off',
			'no-else-return': 'error',
			'no-fallthrough': 'error',
			'default-case-last': 'error',
			complexity: ['error', 10],
			'max-depth': ['error', 3],
			'max-nested-callbacks': ['error', 3],
			'unicorn/no-negated-condition': 'error',
			'unicorn/prefer-switch': 'error',
			'unicorn/no-nested-ternary': 'error',
			'sonarjs/no-collapsible-if': 'error',
			'sonarjs/no-nested-switch': 'error',
			'sonarjs/cognitive-complexity': ['error', 15],

			// Enforce no deep imports across packages (must use public entry points)
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/packages/*/src/**'],
							message:
								'Deep package imports are forbidden. Use public entry points like @wpkernel/core instead.',
						},
					],
				},
			],

			// Allow console in development (can be overridden per package)
			'no-console': 'off',

			// Prefer named exports for better tree-shaking
			'import/prefer-default-export': 'off',
			'import/no-default-export': 'warn',

			// Allow unresolved imports in config files (they're dev dependencies)
			'import/no-unresolved': [
				'error',
				{
					ignore: [
						'^@typescript-eslint/',
						'^@eslint/',
						'^globals$',
						'^@wordpress/',
						'^@wpkernel/',
						'^@wpkernel/core',
						'^@loglayer/',
					],
				},
			],

			'@wpkernel/no-console-in-kernel': 'error',
			'@wpkernel/no-hardcoded-namespace-strings': 'error',
			'@wpkernel/config-consistency': 'error',
			'@wpkernel/cache-keys-valid': 'error',
			'@wpkernel/capability-hints': 'error',
			'@wpkernel/doc-links': 'warn',
			'@wpkernel/no-hardcoded-layout-paths': 'warn',
		},
	}, // WordPress Script Modules - runtime-resolved imports
	{
		files: ['examples/*/src/**/*.js', 'examples/*/src/**/*.jsx'],
		rules: {
			'import/no-unresolved': [
				'error',
				{
					ignore: ['^@wordpress/'],
				},
			],
		},
	},

	// CLI bin files - runtime-resolved paths
	{
		files: ['packages/cli/bin/**/*.js'],
		rules: {
			'import/no-unresolved': 'off',
		},
	},

	// TypeScript files
	{
		files: ['**/*.ts', '**/*.tsx'],
		plugins: {
			'@typescript-eslint': tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'import/named': 'off',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
				},
			],
		},
	},

	// Test files - relaxed rules
	{
		files: [
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
			'**/__tests__/**',
			'**/tests/**',
			'**/testing/**',
		],
		languageOptions: {
			globals: {
				...globals.jest,
			},
		},
		rules: {
			complexity: 'off',
			'max-depth': 'off',
			'max-nested-callbacks': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'import/no-default-export': 'off',
			'import/no-extraneous-dependencies': 'off',
		},
	},

	// Config files can use default exports and devDependencies (root and nested)
	{
		files: [
			'*.config.js',
			'*.config.ts',
			'*.config.cjs',
			'*.config.mjs',
			'**/*.config.js',
			'**/*.config.ts',
			'**/*.config.cjs',
			'**/*.config.mjs',
			'**/bin/**', // CLI bin files
		],
		rules: {
			'import/no-default-export': 'off',
			'import/no-extraneous-dependencies': [
				'error',
				{
					devDependencies: true,
					optionalDependencies: false,
					peerDependencies: false,
					packageDir: [__dirname], // Look for dependencies in monorepo root
				},
			],
			// Allow multiple imports from packages with subpath exports (e.g., @kucrut/vite-for-wp and @kucrut/vite-for-wp/plugins)
			'import/no-duplicates': 'off',
		},
	},

	{
		files: [
			'packages/cli/**/*.{js,ts,tsx}',
			'packages/ui/**/*.{js,ts,tsx}',
			'packages/e2e-utils/**/*.{js,ts,tsx}',
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '@wpkernel/core',
							message:
								'Use scoped module entry points like @wpkernel/core/reporter to avoid bundling unused surface area.',
						},
					],
					patterns: [
						{
							group: ['**/packages/*/src/**'],
							message:
								'Deep package imports are forbidden. Use public entry points like @wpkernel/core instead.',
						},
					],
				},
			],
		},
	},

	{
		files: ['packages/cli/**/*.{js,ts,tsx}'],
		rules: {
			'import/no-extraneous-dependencies': 'off',
		},
	},

	// ESLint rules - allow default exports and relax complexity
	{
		files: ['eslint-rules/**/*.js'],
		rules: {
			'import/no-default-export': 'off',
			complexity: 'off', // ESLint rules can be complex
		},
	},
];

/**
 * ESLint Configuration for WP Kernel (Flat Config)
 *
 * Extends WordPress coding standards with custom rules for the framework.
 * @see https://eslint.org/docs/latest/use/configure/configuration-files-new
 */

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import path from 'path';
import { fileURLToPath } from 'url';
import noManualTestGlobals from './eslint-rules/no-manual-test-globals.js';
import noConsoleInKernel from './eslint-rules/no-console-in-kernel.js';
import noHardcodedNamespaceStrings from './eslint-rules/no-hardcoded-namespace-strings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const kernelPlugin = {
	rules: {
		'no-manual-test-globals': noManualTestGlobals,
		'no-console-in-kernel': noConsoleInKernel,
		'no-hardcoded-namespace-strings': noHardcodedNamespaceStrings,
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
			'@kernel': kernelPlugin,
		},

		// Custom rules for WP Kernel
		rules: {
			// Disable problematic rule (ESLint 9 compatibility issue)
			'@wordpress/no-unused-vars-before-return': 'off',

			// Enforce no deep imports across packages (must use public entry points)
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/packages/*/src/**'],
							message:
								'Deep package imports are forbidden. Use public entry points like @geekist/wp-kernel instead.',
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
						'^@kernel/',
						'^@geekist/wp-kernel',
						'^@loglayer/',
					],
				},
			],

			'@kernel/no-console-in-kernel': 'error',
			'@kernel/no-hardcoded-namespace-strings': 'error',
		},
	}, // WordPress Script Modules - runtime-resolved imports
	{
		files: ['app/*/src/**/*.js', 'app/*/src/**/*.jsx'],
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
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
				},
			],
		},
	},

	// Test files - more relaxed rules + enforce test patterns
	{
		files: [
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
			'**/test/**',
			'**/testing/**',
			'**/tests/**',
			'**/__tests__/**',
		],
		plugins: {
			'@kernel': kernelPlugin,
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'import/no-default-export': 'off',
			// Disable extraneous dependencies rule for test files
			// In a monorepo with centralized dependency management, this rule is more harmful than helpful
			'import/no-extraneous-dependencies': 'off',
			// Enforce centralized test patterns
			'@kernel/no-manual-test-globals': 'error',
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
];

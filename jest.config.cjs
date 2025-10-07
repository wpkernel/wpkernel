/**
 * Jest configuration for WP Kernel monorepo
 * Uses @wordpress/jest-preset-default for WordPress compatibility
 */

module.exports = {
	preset: '@wordpress/jest-preset-default',
	testEnvironment: 'jsdom',

	// Test file locations
	roots: ['<rootDir>/packages', '<rootDir>/app', '<rootDir>/tests'],
	testMatch: [
		'**/__tests__/**/*.ts',
		'**/__tests__/**/*.tsx',
		'**/__tests__/**/*.test.ts',
		'**/__tests__/**/*.test.tsx',
	],

	// Module resolution
	moduleNameMapper: {
		// Strip .js extensions for Jest (TypeScript source files are .ts)
		'^(\\.{1,2}/.*)\\.js$': '$1',
		// Test utilities (with and without .js extension)
		'^@test-utils/(.*)\\.js$': '<rootDir>/tests/test-utils/$1',
		'^@test-utils/(.*)$': '<rootDir>/tests/test-utils/$1',
		// Workspace package aliases
		'^@geekist/wp-kernel$': '<rootDir>/packages/kernel/src',
		'^@geekist/wp-kernel/(.*)$': '<rootDir>/packages/kernel/src/$1',
		'^@geekist/wp-kernel-ui$': '<rootDir>/packages/ui/src',
		'^@geekist/wp-kernel-ui/(.*)$': '<rootDir>/packages/ui/src/$1',
		'^@geekist/wp-kernel-cli$': '<rootDir>/packages/cli/src',
		'^@geekist/wp-kernel-cli/(.*)$': '<rootDir>/packages/cli/src/$1',
		'^@geekist/wp-kernel-e2e-utils$': '<rootDir>/packages/e2e-utils/src',
		'^@geekist/wp-kernel-e2e-utils/(.*)$':
			'<rootDir>/packages/e2e-utils/src/$1',
	},

	// TypeScript transformation
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: {
					jsx: 'react-jsx',
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
				},
			},
		],
	},

	// Coverage configuration
	collectCoverageFrom: [
		'packages/*/src/**/*.{ts,tsx}',
		// Exclude showcase app (example/demo code, not framework code)
		'!app/showcase/src/**',
		// Exclude e2e-utils (browser-only code, can't be unit tested in JSDOM)
		'!packages/e2e-utils/src/**',
		// Exclude testing utilities (test helpers, not production code)
		'!packages/ui/src/hooks/testing/**',
		'!packages/*/src/**/*.d.ts',
		'!app/*/src/**/*.d.ts',
		'!packages/*/src/**/__tests__/**',
		'!app/*/src/**/__tests__/**',
		// Exclude entry point index files (trivial re-exports)
		'!packages/*/src/index.ts',
		'!packages/kernel/src/*/index.ts',
	],
	coverageThreshold: {
		global: {
			branches: 89,
			functions: 90,
			lines: 90,
			statements: 90,
		},
	},
	coverageDirectory: '<rootDir>/coverage',
	coverageReporters: ['text', 'lcov', 'html'],

	// Ignore patterns
	testPathIgnorePatterns: [
		'/node_modules/',
		'/dist/',
		'/build/',
		'/.wp-env/',
		'/packages/e2e-utils/tests/', // Exclude Playwright E2E tests
		'/__tests__/e2e/', // Exclude all E2E test directories
		'/tests/test-globals.d.ts', // Exclude ambient type declarations
		'/tests/setup-jest.ts', // Exclude setup file from being run as test
		'.spec.ts$', // Exclude Playwright spec files
	],

	// Setup files
	setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.ts'],

	// Performance
	maxWorkers: '50%',
};

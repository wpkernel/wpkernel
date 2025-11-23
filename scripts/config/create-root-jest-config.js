import path from 'node:path';
import { fileURLToPath } from 'node:url';
import baseConfig from '../../jest.config.base.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, '..', '..');
const cliGlobalSetup = path.resolve(
	repoRoot,
	'packages/cli/tests/jest-global-setup.js'
);

const INTEGRATION_TEST_PATTERN = '\\.integration\\.test\\.(?:[jt]sx?)$';

export function createRootJestConfig(options = {}) {
	const skipIntegration = options.skipIntegration ?? false;
	const distModuleRedirects = {
		'^@wpkernel/(core|pipeline|php-json-ast|ui|wp-json-ast)/dist/(.*?)(?:\\.js)?$':
			'<rootDir>/packages/$1/src/$2',
		'^@wpkernel/([^/]+)/dist/(.*)$': '<rootDir>/packages/$1/dist/$2',
	};

	const config = {
		...baseConfig,
		bail: 1, // Fail fast on first error
		roots: ['<rootDir>/packages', '<rootDir>/examples', '<rootDir>/tests'],
		moduleNameMapper: {
			...distModuleRedirects,
			...baseConfig.moduleNameMapper,
			'^@test-utils/(.*)\\.js$': '<rootDir>/tests/test-utils/$1',
			'^@test-utils/(.*)$': '<rootDir>/tests/test-utils/$1',
			'^@wordpress/element/jsx-runtime$': 'react/jsx-runtime',
			'^@loglayer/transport-simple-pretty-terminal$':
				'<rootDir>/tests/mocks/loglayer-transport-simple-pretty-terminal.ts',
			'^@wpkernel/core$': '<rootDir>/packages/core/src',
			'^@wpkernel/core/(.*)$': '<rootDir>/packages/core/src/$1',
			'^@wpkernel/ui$': '<rootDir>/packages/ui/src',
			'^@wpkernel/ui/(.*)$': '<rootDir>/packages/ui/src/$1',
			'^@wpkernel/cli$': '<rootDir>/packages/cli/src',
			'^@wpkernel/cli/(.*)$': '<rootDir>/packages/cli/src/$1',
			'^@wpkernel/e2e-utils$': '<rootDir>/packages/e2e-utils/src',
			'^@wpkernel/e2e-utils/(.*)$': '<rootDir>/packages/e2e-utils/src/$1',
			'^@wpkernel/test-utils$': '<rootDir>/packages/test-utils/src',
			'^@wpkernel/test-utils/(.*)$':
				'<rootDir>/packages/test-utils/src/$1',
			'^@wpkernel/php-json-ast$': '<rootDir>/packages/php-json-ast/src',
			'^@wpkernel/php-json-ast/(.*)$':
				'<rootDir>/packages/php-json-ast/src/$1',
			'^@wpkernel/wp-json-ast$': '<rootDir>/packages/wp-json-ast/src',
			'^@wpkernel/wp-json-ast/(.*)$':
				'<rootDir>/packages/wp-json-ast/src/$1',
			'^@wpkernel/php-driver$': '<rootDir>/packages/php-driver/src',
			'^@wpkernel/php-driver/(.*)$':
				'<rootDir>/packages/php-driver/src/$1',
		},
		collectCoverageFrom: [
			'packages/*/src/**/*.{ts,tsx}',
			'!examples/showcase/src/**',
			'!packages/e2e-utils/src/**',
			'!packages/test-utils/src/**',
			'!packages/ui/src/hooks/testing/**',
			'!packages/cli/src/cli/**',
			'!packages/cli/src/commands/**',
			'!packages/cli/src/internal/**',
			'!packages/cli/src/version.ts',
			'!packages/cli/src/ir/__fixtures__/**',
			'!**/__fixtures__/**',
			'!<rootDir>/packages/ui/src/dataviews/test-support/**',
			'!packages/*/src/**/*.d.ts',
			'!examples/*/src/**/*.d.ts',
			'!packages/*/src/**/__tests__/**',
			'!examples/*/src/**/__tests__/**',
			'!packages/*/src/index.ts',
			'!packages/core/src/*/index.ts',
			'!packages/cli/src/ir/index.ts',
		],
		coverageThreshold: {
			global: {
				branches: 80,
				functions: 83,
				lines: 88,
				statements: 88,
			},
		},
		coverageDirectory: '<rootDir>/coverage',
		coverageReporters: ['text', 'lcov', 'html'],
		testPathIgnorePatterns: [
			'/node_modules/',
			'/dist/',
			'/build/',
			'/.cache/',
			'/.wp-env/',
			'/packages/e2e-utils/tests/',
			'/__tests__/e2e/',
			'/tests/test-globals.d.ts',
			'/tests/setup-jest.ts',
			'.spec.ts$',
			'testUtils\\.test-support\\.(?:js|ts|tsx)$',
		],
		setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.ts'],
	};

	const ignorePatterns = new Set(config.testPathIgnorePatterns ?? []);

	if (skipIntegration) {
		ignorePatterns.add(INTEGRATION_TEST_PATTERN);
	}

	config.testPathIgnorePatterns = Array.from(ignorePatterns);

	if (!skipIntegration) {
		config.globalSetup = cliGlobalSetup;
	}

	const cliDistPath = '<rootDir>/packages/cli/dist';
	config.modulePathIgnorePatterns = [
		...(config.modulePathIgnorePatterns ?? []),
		cliDistPath,
		'/.cache/',
	];
	config.watchPathIgnorePatterns = [
		...(config.watchPathIgnorePatterns ?? []),
		cliDistPath,
	];

	return config;
}

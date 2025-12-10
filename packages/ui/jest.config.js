import { createWPKJestConfig } from '@wpkernel/scripts/config/create-wpk-jest-config.js';

export default createWPKJestConfig({
	displayName: '@wpkernel/ui',
	packageDir: import.meta.url,
	moduleNameMapper: {
		'^@wordpress/element/jsx-runtime$': 'react/jsx-runtime',
		'^@wordpress/dataviews/wp$':
			'<rootDir>/packages/ui/tests/mocks/dataviews-wp.ts',
	},
	collectCoverageFrom: [
		'<rootDir>/packages/ui/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/ui/src/**/__tests__/**',
		'!<rootDir>/packages/ui/src/**/*.d.ts',
		'!<rootDir>/packages/ui/src/index.ts',
		'!<rootDir>/packages/ui/src/hooks/testing/**',
		'!<rootDir>/packages/ui/src/dataviews/test-support/**',
	],
	coverageThreshold: {
		global: {
			branches: 89,
			functions: 90,
			lines: 90,
			statements: 90,
		},
	},
});

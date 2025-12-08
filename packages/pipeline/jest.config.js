import { createWPKJestConfig } from '@wpkernel/scripts/config/create-wpk-jest-config.js';

export default createWPKJestConfig({
	displayName: '@wpkernel/pipeline',
	packageDir: import.meta.url,
	coveragePathIgnorePatterns: [
		'/src/index\\.ts$',
		'/src/extensions/index\\.ts$',
	],
	collectCoverageFrom: [
		'<rootDir>/packages/pipeline/src/**/*.{ts,tsx}',
		'!<rootDir>/packages/pipeline/src/index.ts',
		'!<rootDir>/packages/pipeline/src/extensions/index.ts',
	],
});

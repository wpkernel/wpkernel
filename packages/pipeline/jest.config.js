import { createWPKJestConfig } from '@wpkernel/scripts/config/create-wpk-jest-config.js';

export default createWPKJestConfig({
	displayName: '@wpkernel/pipeline',
	packageDir: import.meta.url,
	coveragePathIgnorePatterns: ['/index\\.ts$'],
});

import { createHelper } from '../../src/runtime';

function createStubBuilder(key: string) {
	return createHelper({
		key,
		kind: 'builder',
		async apply() {
			// intentionally blank stub
		},
	});
}

export function buildBuildersMock() {
	const actualBuilders = jest.requireActual('../../src/builders');

	return {
		createBundler: jest.fn(() =>
			createStubBuilder('builder.generate.stub.bundler')
		),
		createPlanBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.plan')
		),
		createUiEntryBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ui-entry')
		),
		createApplyPlanBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.plan')
		),
		createPatcher: jest.fn(() =>
			createStubBuilder('builder.generate.stub.patcher')
		),
		createPhpBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.php')
		),
		createJsBlocksBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.blocks')
		),
		createTsBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts')
		),
		createTsCapabilityBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts-capability')
		),
		createTsIndexBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts-index')
		),
		createTsConfigBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.tsconfig')
		),
		createPhpDriverInstaller: actualBuilders.createPhpDriverInstaller,
	};
}

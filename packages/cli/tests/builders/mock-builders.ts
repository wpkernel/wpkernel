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
		createJsBlocksBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.blocks')
		),
		createTsTypesBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts-types')
		),
		createTsResourcesBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts-resources')
		),
		createAdminScreenBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts-adminScreen')
		),
		createAppConfigBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts-appConfig')
		),
		createAppFormBuilder: jest.fn(() =>
			createStubBuilder('builder.generate.stub.ts-appForm')
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

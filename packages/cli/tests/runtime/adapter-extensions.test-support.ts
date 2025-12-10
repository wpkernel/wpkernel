import path from 'node:path';
import type { WPKernelConfigV1 } from '../../src/config/types';
import { buildTestArtifactsPlan, makeIr } from '@cli-tests/ir.test-support';
import type {
	PipelineExtensionHook,
	PipelineExtensionHookOptions,
} from '../../src/runtime/types';
import { buildAdapterExtensionsExtension } from '../../src/runtime/adapterExtensions';
import { makeWorkspaceMock } from '../workspace.test-support';
import type { Workspace } from '../../src/workspace';
import { createReporterMock } from '../reporter';
import { buildEmptyGenerationState } from '../../src/apply/manifest';
import { loadTestLayoutSync } from '../layout.test-support';

export function buildAdapterExtensionOptions(
	overrides: Partial<PipelineExtensionHookOptions> = {}
): PipelineExtensionHookOptions {
	const config: WPKernelConfigV1 = {
		version: 1,
		namespace: 'test',
		resources: {},
		schemas: {},
	} as WPKernelConfigV1;

	const layout = loadTestLayoutSync();
	const workspace = makeWorkspaceMock({
		root: '/tmp/workspace',
		resolve: jest
			.fn<
				ReturnType<Workspace['resolve']>,
				Parameters<Workspace['resolve']>
			>()
			.mockImplementation((value?: string) =>
				value ? path.join('/tmp/workspace', value) : '/tmp/workspace'
			),
		write: jest
			.fn<
				ReturnType<Workspace['write']>,
				Parameters<Workspace['write']>
			>()
			.mockResolvedValue(undefined),
	});
	const reporter = createReporterMock();

	const artifact = makeIr({
		meta: {
			sanitizedNamespace: 'TestNamespace',
			namespace: 'test',
			origin: 'typescript',
			sourcePath: '/tmp/workspace/wpk.config.ts',
		},
		layout,
		artifacts: buildTestArtifactsPlan(layout),
	});

	const generationState = buildEmptyGenerationState();

	const base: PipelineExtensionHookOptions = {
		context: {
			phase: 'generate',
			workspace,
			reporter,
			generationState,
		},
		options: {
			phase: 'generate',
			config,
			namespace: 'test',
			origin: 'typescript',
			sourcePath: '/tmp/workspace/wpk.config.ts',
			workspace,
			reporter,
			generationState,
		},
		artifact,
		lifecycle: 'after-fragments',
	};

	return {
		...base,
		...overrides,
		context: {
			...base.context,
			...overrides.context,
		},
		options: {
			...base.options,
			...overrides.options,
		},
		lifecycle: overrides.lifecycle ?? base.lifecycle,
	};
}

export async function buildAdapterExtensionHook(
	config: WPKernelConfigV1
): Promise<{
	hook: PipelineExtensionHook;
	options: PipelineExtensionHookOptions;
}> {
	const extension = buildAdapterExtensionsExtension();
	const registration = await extension.register({} as never);
	const hook = (
		typeof registration === 'function'
			? registration
			: (registration?.hook ?? (() => Promise.resolve()))
	) as PipelineExtensionHook;
	const baseOptions = buildAdapterExtensionOptions();
	const options: PipelineExtensionHookOptions = {
		...baseOptions,
		context: { ...baseOptions.context },
		options: {
			...baseOptions.options,
			config,
			namespace: config.namespace,
			origin: 'typescript',
			sourcePath: '/tmp/workspace/wpk.config.ts',
		},
	};

	return { hook, options };
}

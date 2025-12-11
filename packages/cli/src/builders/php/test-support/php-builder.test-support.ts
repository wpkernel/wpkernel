/* eslint-env jest */
import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../runtime/types';
import type { IRv1 } from '../../../ir/publicTypes';
import { createArtifactsFragment } from '../../../ir/fragments/ir.artifacts.plan';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import type { Workspace } from '../../../workspace/types';
import { buildEmptyGenerationState } from '../../../apply/manifest';
import { makeIr, type DeepPartial } from '../../../../tests/ir.test-support';
import { type WPKernelConfigV1 } from '../../../config';
import { type MutableIr } from '../../../ir';

const DEFAULT_CONFIG_SOURCE = 'tests.config.ts';

export function createReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

export function createPipelineContext(
	overrides?: Partial<PipelineContext>
): PipelineContext {
	const workspace = makeWorkspaceMock<Workspace>({
		root: '/workspace',
	});

	const base: PipelineContext = {
		workspace,
		reporter: createReporter(),
		phase: 'generate',
		generationState: buildEmptyGenerationState(),
	};

	return {
		...base,
		...overrides,
		workspace: overrides?.workspace ?? base.workspace,
		reporter: overrides?.reporter ?? base.reporter,
		phase: overrides?.phase ?? base.phase,
		generationState: overrides?.generationState ?? base.generationState,
	};
}

export function createBuilderInput(
	overrides?: Partial<BuilderInput>
): BuilderInput {
	const namespace = resolveNamespace(overrides);

	const base: BuilderInput = {
		phase: 'generate',
		options: {
			namespace,
			origin: DEFAULT_CONFIG_SOURCE,
			sourcePath: DEFAULT_CONFIG_SOURCE,
		},
		ir: null,
	};

	return {
		...base,
		...overrides,
		options: buildBuilderOptions(base.options, overrides?.options, {
			namespace,
		}),
	};
}

export function createBuilderOutput(): BuilderOutput & {
	queueWrite: jest.Mock<void, [BuilderOutput['actions'][number]]>;
} {
	const actions: BuilderOutput['actions'] = [];
	const queueWrite = jest.fn((action: BuilderOutput['actions'][number]) => {
		actions.push(action);
	});

	return {
		actions,
		queueWrite,
	};
}

type MinimalIrOverrides = DeepPartial<IRv1> & { namespace?: string };

export function createMinimalIr(overrides: MinimalIrOverrides = {}): IRv1 {
	const namespace = resolveNamespaceFromOverrides(overrides);
	const baseIr = makeIr();
	const layout = overrides.layout
		? ({ ...baseIr.layout, ...overrides.layout } as IRv1['layout'])
		: baseIr.layout;
	const defaultPhpOutputDir = path.posix.dirname(
		baseIr.artifacts.php.pluginLoaderPath
	);
	const php = overrides.php
		? {
				namespace,
				autoload: 'inc/',
				outputDir: overrides.php.outputDir ?? defaultPhpOutputDir,
				...overrides.php,
			}
		: {
				namespace,
				autoload: 'inc/',
				outputDir: defaultPhpOutputDir,
			};

	return makeIr({
		...overrides,
		namespace,
		layout,
		php,
	});
}

export async function seedArtifacts(
	ir: IRv1,
	reporter?: Reporter
): Promise<IRv1> {
	const fragment = createArtifactsFragment();
	const context = createPipelineContext({ reporter });
	const config = (ir as unknown as { config?: WPKernelConfigV1 }).config ?? {
		version: 1,
		namespace: ir.meta.namespace,
		resources: {},
		schemas: {},
	};
	const draft = ir as unknown as MutableIr;

	await fragment.apply({
		context,
		input: {
			options: {
				config,
				namespace: ir.meta.namespace,
				origin: ir.meta.origin,
				sourcePath: ir.meta.sourcePath,
			},
			draft,
		},
		output: {
			draft,
			assign(partial) {
				Object.assign(draft, partial);
			},
		},
		reporter: context.reporter,
	});

	return ir;
}

function resolveNamespaceFromOverrides(overrides: MinimalIrOverrides): string {
	return overrides?.meta?.namespace ?? overrides.namespace ?? 'DemoPlugin';
}

function resolveNamespace(overrides?: Partial<BuilderInput>): string {
	return (
		overrides?.options?.namespace ??
		overrides?.ir?.meta?.namespace ??
		'demo-plugin'
	);
}

function buildBuilderOptions(
	baseOptions: BuilderInput['options'],
	overrideOptions: BuilderInput['options'] | undefined,
	context: { namespace: string }
): BuilderInput['options'] {
	return {
		...baseOptions,
		...overrideOptions,
		namespace: context.namespace,
	};
}

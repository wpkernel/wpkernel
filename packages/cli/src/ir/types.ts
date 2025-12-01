import { WPKernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuildIrOptions,
	IRBlock,
	IRDiagnostic,
	IRCapabilityHint,
	IRCapabilityMap,
	IRLayout,
	IRPhpProject,
	IRResource,
	IRReferenceSummary,
	IRSchema,
	IRBundler,
	IRUiSurface,
	IRv1,
	IRArtifactsPlan,
} from './publicTypes';
import type { WPKernelConfigV1 } from '../config/types';
import type {
	FragmentFinalizationMetadata,
	Helper,
	HelperApplyOptions,
} from '@wpkernel/pipeline';
import type { PipelineContext } from '../runtime/types';

export interface MutableIr {
	meta: IRv1['meta'] | null;
	readonly config: WPKernelConfigV1;
	schemas: IRSchema[];
	resources: IRResource[];
	capabilities: IRCapabilityHint[];
	capabilityMap: IRCapabilityMap | null;
	blocks: IRBlock[];
	php: IRPhpProject | null;
	layout: IRLayout | null;
	ui: IRUiSurface | null;
	bundler: IRBundler | null;
	artifacts: IRArtifactsPlan;
	diagnostics: IRDiagnostic[];
	references: IRReferenceSummary | null;
	extensions: Record<string, unknown>;
}

export function buildIrDraft(options: BuildIrOptions): MutableIr {
	return {
		meta: null,
		config: options.config,
		schemas: [],
		resources: [],
		capabilities: [],
		capabilityMap: null,
		blocks: [],
		php: null,
		layout: null,
		ui: null,
		bundler: null,
		artifacts: createEmptyArtifactsPlan(),
		diagnostics: [],
		references: null,
		extensions: Object.create(null),
	};
}

const CORE_FRAGMENT_PREFIXES = [
	'ir.meta.',
	'ir.layout.',
	'ir.schemas.',
	'ir.resources.',
	'ir.ui.',
	'ir.capabilities.',
	'ir.capability-map.',
	'ir.diagnostics.',
	'ir.blocks.',
	'ir.bundler.',
	'ir.ordering.',
	'ir.validation.',
] as const;

function assertCoreFragmentsExecuted(
	helpers: FragmentFinalizationMetadata<'fragment'>
): void {
	const missing = new Set(helpers.fragments.missing);

	for (const prefix of CORE_FRAGMENT_PREFIXES) {
		const registered = helpers.fragments.registered.some((key) =>
			key.startsWith(prefix)
		);

		if (!registered) {
			continue;
		}

		const executed = helpers.fragments.executed.some((key) =>
			key.startsWith(prefix)
		);

		if (!executed) {
			missing.add(`${prefix}*`);
		}
	}

	if (missing.size > 0) {
		const missingList = Array.from(missing).sort().join(', ');
		throw new WPKernelError('ValidationError', {
			message: `IR finalisation aborted because the following fragments did not execute: ${missingList}.`,
		});
	}
}

export function finalizeIrDraft(
	draft: MutableIr,
	helpers: FragmentFinalizationMetadata<'fragment'>
): IRv1 {
	assertCoreFragmentsExecuted(helpers);

	if (!draft.meta) {
		throw new WPKernelError('ValidationError', {
			message:
				'IR meta fragment did not set metadata before pipeline completion.',
		});
	}

	if (!draft.capabilityMap) {
		throw new WPKernelError('ValidationError', {
			message:
				'IR capability map fragment did not resolve capability map before pipeline completion.',
		});
	}

	if (!draft.php) {
		throw new WPKernelError('ValidationError', {
			message:
				'IR PHP fragment did not configure PHP project before pipeline completion.',
		});
	}

	if (!draft.layout) {
		throw new WPKernelError('ValidationError', {
			message:
				'IR layout fragment did not resolve layout before pipeline completion.',
		});
	}

	if (!draft.artifacts) {
		throw new WPKernelError('ValidationError', {
			message:
				'IR artifacts fragment did not resolve artifact plans before pipeline completion.',
		});
	}

	const diagnostics =
		draft.diagnostics.length > 0 ? draft.diagnostics.slice() : undefined;
	const references = draft.references ? { ...draft.references } : undefined;

	return {
		meta: draft.meta,
		schemas: draft.schemas,
		resources: draft.resources,
		capabilities: draft.capabilities,
		capabilityMap: draft.capabilityMap,
		blocks: draft.blocks,
		php: draft.php,
		bundler: draft.bundler ?? undefined,
		layout: draft.layout,
		ui: draft.ui ?? undefined,
		artifacts: draft.artifacts,
		diagnostics,
		references,
	};
}

function createEmptyArtifactsPlan(): IRArtifactsPlan {
	return {
		pluginLoader: undefined,
		controllers: Object.create(null),
		resources: Object.create(null),
		uiResources: Object.create(null),
		blocks: Object.create(null),
		schemas: Object.create(null),
		js: undefined,
	};
}

export interface IrFragmentInput {
	readonly options: BuildIrOptions;
	readonly draft: MutableIr;
}

export interface IrFragmentOutput {
	readonly draft: MutableIr;
	assign: (partial: Partial<MutableIr>) => void;
}

export function buildIrFragmentOutput(draft: MutableIr): IrFragmentOutput {
	return {
		draft,
		assign(partial) {
			const entries: Array<[keyof MutableIr, unknown]> = [
				['meta', partial.meta],
				['schemas', partial.schemas],
				['resources', partial.resources],
				['capabilities', partial.capabilities],
				['capabilityMap', partial.capabilityMap],
				['blocks', partial.blocks],
				['php', partial.php],
				['layout', partial.layout],
				['ui', partial.ui],
				['bundler', partial.bundler],
				['diagnostics', partial.diagnostics],
				['references', partial.references],
				['extensions', partial.extensions],
			];

			const target = draft as unknown as Record<string, unknown>;
			for (const [key, value] of entries) {
				if (value) {
					target[key] = value as never;
				}
			}
		},
	};
}

export type IrFragment = Helper<
	PipelineContext,
	IrFragmentInput,
	IrFragmentOutput,
	PipelineContext['reporter'],
	'fragment'
>;

export type IrFragmentApplyOptions = HelperApplyOptions<
	PipelineContext,
	IrFragmentInput,
	IrFragmentOutput,
	PipelineContext['reporter']
> & {
	reporter: Reporter;
};

export type { IRDiagnostic, IRDiagnosticSeverity } from './publicTypes';

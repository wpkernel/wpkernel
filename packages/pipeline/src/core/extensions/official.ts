import type { PipelineExtension } from '../types';

/**
 * Identifier for a pipeline extension factory.
 *
 * @category Pipeline
 */
export interface ExtensionFactorySignature<TOptions = unknown> {
	/**
	 * Human readable name for documentation and diagnostics.
	 */
	readonly name: string;
	/**
	 * Suffix appended to the canonical pipeline extension namespace.
	 */
	readonly slug: string;
	/**
	 * Shape of the options object accepted by the factory.
	 */
	readonly options: TOptions;
}

/**
 * Individual behaviour exposed by an extension blueprint.
 *
 * @category Pipeline
 */
export interface ExtensionBehaviour {
	readonly name: string;
	readonly description: string;
	readonly helperAnnotations?: readonly string[];
	readonly reporterEvents?: readonly string[];
	readonly integrations?: readonly string[];
}

/**
 * Documentation-first blueprint for an extension incubated in this package.
 *
 * @category Pipeline
 */
export interface ExtensionBlueprint {
	readonly id: string;
	readonly status: 'planned' | 'in-development';
	readonly summary: string;
	readonly factory?: ExtensionFactorySignature;
	readonly behaviours: readonly ExtensionBehaviour[];
	readonly pipelineTouchPoints: readonly string[];
	readonly rolloutNotes: readonly string[];
}

/**
 * Pipeline extension factory type used throughout the blueprints.
 *
 * @category Pipeline
 */
export type AnyPipelineExtensionFactory = (
	options?: unknown
) => PipelineExtension<unknown, unknown, unknown, unknown>;

/**
 * Blueprint catalogue for official extensions that the pipeline team will own.
 *
 * @example
 * ```ts
 * import { OFFICIAL_EXTENSION_BLUEPRINTS } from '@wpkernel/pipeline/extensions';
 *
 * const liveRunner = OFFICIAL_EXTENSION_BLUEPRINTS.find(
 * 	(entry) => entry.id === 'live-runner'
 * );
 *
 * if (liveRunner?.factory) {
 * 	console.log(`Factory slug: ${liveRunner.factory.slug}`);
 * }
 * ```
 *
 * @category Pipeline
 */
export const OFFICIAL_EXTENSION_BLUEPRINTS: readonly ExtensionBlueprint[] = [
	{
		id: 'live-runner',
		status: 'in-development',
		summary:
			'Provides live progress, retry orchestration, and interactive prompts powered by reporter events.',
		factory: {
			name: 'createLivePipelineRunExtension',
			slug: 'live-runner',
			options: {
				renderer: 'PipelineReporterRenderer',
				retries:
					'{ default: number; helpers?: Record<string, number>; }',
				prompts: 'PromptAdapter',
			},
		},
		behaviours: [
			{
				name: 'Live progress renderer',
				description:
					'Stream helper lifecycle events to a renderer so users can observe DAG execution in real time.',
				reporterEvents: [
					'pipeline:run:started',
					'pipeline:helper:started',
					'pipeline:helper:succeeded',
					'pipeline:helper:failed',
				],
				integrations: [
					'Terminal renderers that consume structured pipeline reporter events.',
					'Remote observability tools that aggregate helper lifecycle data.',
				],
			},
			{
				name: 'Retry and recovery prompts',
				description:
					'Allow helpers to declare retry policies and surface interactive prompts when failures occur.',
				helperAnnotations: [
					'helper.meta.retryPolicy',
					'helper.meta.prompt',
				],
				integrations: [
					'Prompt adapters that negotiate stdin/stdout access for interactive CLIs.',
				],
			},
			{
				name: 'Reporter-driven telemetry',
				description:
					'Emit structured progress payloads so headless environments can capture telemetry without a TTY renderer.',
				reporterEvents: [
					'pipeline:progress:update',
					'pipeline:retry:scheduled',
					'pipeline:retry:completed',
				],
			},
		],
		pipelineTouchPoints: [
			'Consumes helper-provided metadata via createHelper() options.',
			'Subscribes to reporter hooks exposed on the pipeline context.',
			'Registers a single extension hook through createPipelineExtension.',
		],
		rolloutNotes: [
			'Full extension keys are constructed with the pipeline namespace constant from @wpkernel/core/contracts.',
			'Initial milestone focuses on read-only telemetry to validate event semantics.',
			'Interactive prompts ship once reporter transport supports stdin multiplexing.',
			'Retries remain deterministic by respecting helper dependency ordering.',
		],
	},
	{
		id: 'concurrency',
		status: 'planned',
		summary:
			'Adds a scheduler that can run independent helper branches in parallel without violating dependency constraints.',
		factory: {
			name: 'createDeterministicConcurrencyExtension',
			slug: 'concurrency',
			options: {
				maxConcurrency: 'number | "auto"',
				groups: 'Record<string, number>',
			},
		},
		behaviours: [
			{
				name: 'Deterministic worker pool',
				description:
					'Implements a ready-queue executor that only schedules helpers whose dependencies have settled.',
				helperAnnotations: ['helper.meta.concurrencyGroup'],
				integrations: [
					'Workload schedulers that expose capacity metrics or enforce rate limits.',
				],
			},
			{
				name: 'Reporter integration',
				description:
					'Propagates worker state (idle, busy, saturated) via reporter events so renderers can show resource usage.',
				reporterEvents: [
					'pipeline:concurrency:queue',
					'pipeline:concurrency:worker-state',
				],
			},
		],
		pipelineTouchPoints: [
			'Wraps executeHelpers() with a concurrency-aware scheduler.',
			'Requires dependency graph snapshots for ready-queue calculation.',
			'Extends helper registration validation to guard conflicting group caps.',
		],
		rolloutNotes: [
			'Full extension keys are constructed with the pipeline namespace constant from @wpkernel/core/contracts.',
			'Prototype with read-only metrics before enabling true parallel execution.',
			'Guarantee stable helper ordering for equal-priority tasks to aid reproducibility.',
		],
	},
];

export type { ExtensionBlueprint as OfficialExtensionBlueprint };

import type {
	DiagnosticManager,
	DiagnosticManagerInitConfig,
} from './diagnostic-manager.types';
import type {
	Helper,
	HelperDescriptor,
	HelperKind,
	PipelineDiagnostic,
	PipelineReporter,
} from '../types';
import type { RegisteredHelper } from '../dependency-graph';

/**
 * Creates a diagnostic manager instance scoped to a pipeline.
 *
 * The manager collects helper registration conflicts, missing dependencies, unused helper
 * notifications, and runtime diagnostics. It stores them until the reporter becomes available and
 * replays the backlog immediately when one is provided. This keeps `createPipeline` focused on the
 * high-level orchestration while the manager owns stateful bookkeeping concerns.
 *
 * @param    params
 * @example
 * ```ts
 * const manager = initDiagnosticManager({
 *   options,
 *   fragmentKind: 'fragment',
 *   builderKind: 'builder',
 * });
 * manager.flagUnusedHelper(helper, 'fragment', 'not executed', []);
 * manager.record({ type: 'conflict', key: 'demo', mode: 'extend', helpers: [], message: '' });
 * ```
 *
 * @category Pipeline
 * @internal
 */
export function initDiagnosticManager<
	TRunOptions,
	TBuildOptions,
	TContext extends { reporter: TReporter },
	TReporter extends PipelineReporter,
	TDraft,
	TArtifact,
	TDiagnostic extends PipelineDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind extends HelperKind,
	TBuilderKind extends HelperKind,
	TFragmentHelper extends Helper<
		TContext,
		TFragmentInput,
		TFragmentOutput,
		TReporter,
		TFragmentKind
	>,
	TBuilderHelper extends Helper<
		TContext,
		TBuilderInput,
		TBuilderOutput,
		TReporter,
		TBuilderKind
	>,
>(
	params: DiagnosticManagerInitConfig<
		TRunOptions,
		TBuildOptions,
		TContext,
		TReporter,
		TDraft,
		TArtifact,
		TDiagnostic,
		TRunResult,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	>
): DiagnosticManager<
	TRunOptions,
	TBuildOptions,
	TContext,
	TReporter,
	TDraft,
	TArtifact,
	TDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind,
	TBuilderKind,
	TFragmentHelper,
	TBuilderHelper
> {
	const staticDiagnostics: TDiagnostic[] = [];
	const runDiagnostics: TDiagnostic[] = [];
	let isInRun = false;

	const loggedDiagnosticsByReporter = new WeakMap<
		TReporter,
		Set<TDiagnostic>
	>();
	let diagnosticReporter: TReporter | undefined;

	const describeHelper = (
		kind: HelperKind,
		helper: HelperDescriptor
	): string => {
		if (kind === params.fragmentKind) {
			return `Fragment helper "${helper.key}"`;
		}

		if (kind === params.builderKind) {
			return `Builder helper "${helper.key}"`;
		}

		return `Helper "${helper.key}"`;
	};

	const logDiagnostic = (diagnostic: TDiagnostic): void => {
		if (!diagnosticReporter || !params.options.onDiagnostic) {
			return;
		}

		const loggedForReporter =
			loggedDiagnosticsByReporter.get(diagnosticReporter);
		if (loggedForReporter?.has(diagnostic)) {
			return;
		}

		const trackingSet = loggedForReporter ?? new Set<TDiagnostic>();
		params.options.onDiagnostic({
			reporter: diagnosticReporter,
			diagnostic,
		});
		trackingSet.add(diagnostic);
		if (!loggedForReporter) {
			loggedDiagnosticsByReporter.set(diagnosticReporter, trackingSet);
		}
	};

	const record = (diagnostic: TDiagnostic): void => {
		if (isInRun) {
			runDiagnostics.push(diagnostic);
		} else {
			staticDiagnostics.push(diagnostic);
		}
		logDiagnostic(diagnostic);
	};

	const flagConflict = (
		helper: HelperDescriptor,
		existing: HelperDescriptor,
		kind: HelperKind,
		message: string
	): void => {
		const diagnostic =
			params.options.createConflictDiagnostic?.({
				helper: helper as unknown as TFragmentHelper | TBuilderHelper,
				existing: existing as unknown as
					| TFragmentHelper
					| TBuilderHelper,
				message,
			}) ??
			({
				type: 'conflict',
				key: helper.key,
				mode: helper.mode,
				helpers: [
					existing.origin ?? existing.key,
					helper.origin ?? helper.key,
				],
				message,
				kind,
			} as unknown as TDiagnostic);

		record(diagnostic);
	};

	const flagMissingDependency = (
		helper: HelperDescriptor,
		dependency: string,
		kind: HelperKind
	): void => {
		const message = `${describeHelper(
			kind,
			helper
		)} depends on unknown helper "${dependency}".`;
		const diagnostic =
			params.options.createMissingDependencyDiagnostic?.({
				helper: helper as unknown as TFragmentHelper | TBuilderHelper,
				dependency,
				message,
			}) ??
			({
				type: 'missing-dependency',
				key: helper.key,
				dependency,
				message,
				kind,
				helper: helper.origin ?? helper.key,
				dependsOn: helper.dependsOn,
			} as unknown as TDiagnostic);

		record(diagnostic);
	};

	const flagUnusedHelper = (
		helper: HelperDescriptor,
		kind: HelperKind,
		reason: string,
		dependsOn: readonly string[]
	): void => {
		const message = `${describeHelper(kind, helper)} ${reason}.`;
		const diagnostic =
			params.options.createUnusedHelperDiagnostic?.({
				helper: helper as unknown as TFragmentHelper | TBuilderHelper,
				message,
			}) ??
			({
				type: 'unused-helper',
				key: helper.key,
				message,
				kind,
				helper: helper.origin ?? helper.key,
				dependsOn,
			} as unknown as TDiagnostic);

		record(diagnostic);
	};

	const reviewUnusedHelpers = <THelper extends HelperDescriptor>(
		entries: RegisteredHelper<THelper>[],
		visited: Set<string>,
		kind: HelperKind
	): void => {
		for (const entry of entries) {
			if (visited.has(entry.id)) {
				continue;
			}

			flagUnusedHelper(
				entry.helper as unknown as HelperDescriptor,
				kind,
				'was registered but never executed',
				entry.helper.dependsOn
			);
		}
	};

	const setReporter = (reporter: TReporter | undefined): void => {
		diagnosticReporter = reporter;
		if (!diagnosticReporter) {
			return;
		}

		// Replay all diagnostics for the new reporter
		const allDiagnostics = [...staticDiagnostics, ...runDiagnostics];
		for (const diagnostic of allDiagnostics) {
			logDiagnostic(diagnostic);
		}
	};

	const readDiagnostics = (): TDiagnostic[] => [
		...staticDiagnostics,
		...runDiagnostics,
	];

	const prepareRun = (): void => {
		isInRun = true;
		runDiagnostics.length = 0;
		if (diagnosticReporter) {
			loggedDiagnosticsByReporter.delete(diagnosticReporter);
		}
		// We should re-log static diagnostics to this reporter for this run context,
		// as it's a "fresh" run for the user.
		// However, logDiagnostic checks if already logged for this reporter instance.
		// Since we just cleared the reporter's history in loggedDiagnosticsByReporter,
		// we should re-emit static diagnostics now?
		// Yes, because the reporter needs to see them again if they are relevant to context.
		// The caller usually calls setReporter AFTER prepareRun (in context.ts).
		// setReporter replays EVERYTHING. So we are good.
	};

	const endRun = (): void => {
		isInRun = false;
	};

	return {
		describeHelper,
		flagConflict,
		flagMissingDependency,
		flagUnusedHelper,
		reviewUnusedHelpers,
		setReporter,
		record,
		readDiagnostics,
		prepareRun,
		endRun,
	} satisfies DiagnosticManager<
		TRunOptions,
		TBuildOptions,
		TContext,
		TReporter,
		TDraft,
		TArtifact,
		TDiagnostic,
		TRunResult,
		TFragmentInput,
		TFragmentOutput,
		TBuilderInput,
		TBuilderOutput,
		TFragmentKind,
		TBuilderKind,
		TFragmentHelper,
		TBuilderHelper
	>;
}

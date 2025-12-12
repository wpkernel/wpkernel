import type { RegisteredHelper } from '../dependency-graph';
import type { ErrorFactory } from '../error-factory';
import type {
	HelperDescriptor,
	HelperExecutionSnapshot,
	HelperKind,
} from '../types';

/**
 * Creates a snapshot summarising helper execution for a specific stage.
 *
 * @param    entries
 * @param    visited
 * @param    kind
 * @example
 * ```ts
 * const snapshot = buildExecutionSnapshot(fragmentEntries, visited, 'fragment');
 * console.log(snapshot.executed.length);
 * ```
 *
 * @category Pipeline
 * @internal
 */
export function buildExecutionSnapshot<
	THelper extends HelperDescriptor<TKind>,
	TKind extends HelperKind,
>(
	entries: RegisteredHelper<THelper>[],
	visited: Set<string>,
	kind: TKind
): HelperExecutionSnapshot<TKind> {
	const registered: string[] = [];
	const executed: string[] = [];
	const missing: string[] = [];

	for (const entry of entries) {
		const key = entry.helper.key;
		registered.push(key);

		if (visited.has(entry.id)) {
			executed.push(key);
		} else {
			missing.push(key);
		}
	}

	return {
		kind,
		registered,
		executed,
		missing,
	} satisfies HelperExecutionSnapshot<TKind>;
}

/**
 * Throws when required helpers in a stage were never executed.
 *
 * @param    entries
 * @param    snapshot
 * @param    kind
 * @param    describeHelper
 * @param    createError
 * @category Pipeline
 * @internal
 */
export function assertAllHelpersExecuted<
	THelper extends HelperDescriptor<TKind>,
	TKind extends HelperKind,
>(
	entries: RegisteredHelper<THelper>[],
	snapshot: HelperExecutionSnapshot<TKind>,
	kind: TKind,
	describeHelper: (kind: HelperKind, helper: HelperDescriptor) => string,
	createError: ErrorFactory
): void {
	if (snapshot.missing.length === 0) {
		return;
	}

	const requiredMissing = entries.filter(
		(entry) =>
			snapshot.missing.includes(entry.helper.key) &&
			!entry.helper.optional
	);

	if (requiredMissing.length === 0) {
		return;
	}

	const missingDescriptions = requiredMissing.map((entry) =>
		describeHelper(kind, entry.helper as unknown as HelperDescriptor)
	);

	throw createError(
		'ValidationError',
		`Pipeline finalisation aborted because ${missingDescriptions.join(', ')} did not execute.`
	);
}

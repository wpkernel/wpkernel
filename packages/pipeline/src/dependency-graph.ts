import type { HelperDescriptor, HelperKind } from './types';

/**
 * A registered helper with its unique identifier and registration index.
 *
 * @internal
 */
export interface RegisteredHelper<THelper> {
	readonly helper: THelper;
	readonly id: string;
	readonly index: number;
}

/**
 * Internal graph state for dependency resolution.
 *
 * @internal
 */
interface DependencyGraphState<THelper> {
	readonly adjacency: Map<string, Set<string>>;
	readonly indegree: Map<string, number>;
	readonly entryById: Map<string, RegisteredHelper<THelper>>;
}

/**
 * Describes a helper that depends on a missing helper key.
 *
 * @internal
 */
export interface MissingDependencyIssue<THelper> {
	readonly dependant: RegisteredHelper<THelper>;
	readonly dependencyKey: string;
}

/**
 * Options for dependency graph creation.
 *
 * @internal
 */
export interface CreateDependencyGraphOptions<THelper> {
	readonly onMissingDependency?: (
		issue: MissingDependencyIssue<THelper>
	) => void;
	readonly onUnresolvedHelpers?: (options: {
		readonly unresolved: RegisteredHelper<THelper>[];
	}) => void;
	/**
	 * Optional set of helper keys that are considered “already satisfied”.
	 * Useful when a pipeline run intentionally omits certain helpers (e.g. IR
	 * fragments) but builders still declare them as dependencies.
	 */
	readonly providedKeys?: readonly string[];
}

/**
 * Creates a unique identifier for a registered helper.
 *
 * Format: `{kind}:{key}#{index}`
 *
 * @param helper      - The helper descriptor
 * @param helper.kind
 * @param index       - The registration index
 * @param helper.key
 * @returns A unique string identifier
 *
 * @internal
 */
export function createHelperId(
	helper: { kind: HelperKind; key: string },
	index: number
): string {
	return `${helper.kind}:${helper.key}#${index}`;
}

/**
 * Comparator for sorting helpers by priority, key, then registration index.
 *
 * Higher priority comes first. If equal, sorts by key alphabetically.
 * If still equal, sorts by registration index.
 *
 * @param a  - First helper entry
 * @param b  - Second helper entry
 * @returns Negative if a < b, positive if a > b, zero if equal
 *
 * @internal
 */
export function compareHelpers<THelper extends HelperDescriptor>(
	a: RegisteredHelper<THelper>,
	b: RegisteredHelper<THelper>
): number {
	if (a.helper.priority !== b.helper.priority) {
		return b.helper.priority - a.helper.priority;
	}

	if (a.helper.key !== b.helper.key) {
		return a.helper.key.localeCompare(b.helper.key);
	}

	return a.index - b.index;
}

/**
 * Initializes the dependency graph state with adjacency list and indegree map.
 *
 * @param entries - All registered helpers
 * @returns Graph state with empty adjacency lists and zero indegrees
 *
 * @internal
 */
function createGraphState<THelper>(
	entries: RegisteredHelper<THelper>[]
): DependencyGraphState<THelper> {
	const adjacency = new Map<string, Set<string>>();
	const indegree = new Map<string, number>();
	const entryById = new Map<string, RegisteredHelper<THelper>>();

	for (const entry of entries) {
		adjacency.set(entry.id, new Set());
		indegree.set(entry.id, 0);
		entryById.set(entry.id, entry);
	}

	return { adjacency, indegree, entryById };
}

/**
 * Registers all dependency edges in the graph.
 *
 * For each helper, links its declared `dependsOn` keys to actual helper instances.
 * Collects any missing dependencies for error reporting.
 *
 * @param entries - All registered helpers
 * @param graph   - The graph state to populate
 * @returns Array of missing dependency issues (empty if all resolved)
 *
 * @internal
 */
function registerHelperDependencies<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	graph: DependencyGraphState<THelper>
): MissingDependencyIssue<THelper>[] {
	const missing: MissingDependencyIssue<THelper>[] = [];

	for (const entry of entries) {
		for (const dependencyKey of entry.helper.dependsOn) {
			const linked = linkDependency(
				entries,
				graph,
				dependencyKey,
				entry.id
			);

			if (!linked) {
				missing.push({
					dependant: entry,
					dependencyKey,
				});
			}
		}
	}

	return missing;
}

/**
 * Links a dependency key to all matching helpers.
 *
 * A helper can depend on a key that matches multiple helper instances
 * (e.g., different modes or priorities). All matches are linked.
 *
 * @param entries       - All registered helpers
 * @param graph         - The graph state
 * @param dependencyKey - The key from `dependsOn`
 * @param dependantId   - The ID of the dependent helper
 * @returns `true` if at least one match found, `false` if no matches
 *
 * @internal
 */
function linkDependency<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	graph: DependencyGraphState<THelper>,
	dependencyKey: string,
	dependantId: string
): boolean {
	const related = entries.filter(
		({ helper }) => helper.key === dependencyKey
	);

	if (related.length === 0) {
		return false;
	}

	for (const dependency of related) {
		const neighbours = graph.adjacency.get(dependency.id);
		if (!neighbours) {
			continue;
		}

		neighbours.add(dependantId);
		const current = graph.indegree.get(dependantId) ?? 0;
		graph.indegree.set(dependantId, current + 1);
	}

	return true;
}

/**
 * Performs a topological sort using Kahn's algorithm.
 *
 * Returns helpers in dependency order (dependencies before dependants).
 * Also returns any unresolved helpers (circular dependencies or orphaned nodes).
 *
 * @param entries - All registered helpers
 * @param graph   - The dependency graph
 * @returns Ordered helpers and any unresolved helpers
 *
 * @internal
 */
function sortByDependencies<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	graph: DependencyGraphState<THelper>
): {
	ordered: RegisteredHelper<THelper>[];
	unresolved: RegisteredHelper<THelper>[];
} {
	const ready = entries.filter(
		(entry) => (graph.indegree.get(entry.id) ?? 0) === 0
	);
	ready.sort(compareHelpers);

	const ordered: RegisteredHelper<THelper>[] = [];
	const indegree = new Map(graph.indegree);
	const visited = new Set<string>();

	while (ready.length > 0) {
		const current = ready.shift();
		if (!current) {
			break;
		}

		ordered.push(current);
		visited.add(current.id);

		const neighbours = graph.adjacency.get(current.id);
		if (!neighbours) {
			continue;
		}

		for (const neighbourId of neighbours) {
			const nextValue = (indegree.get(neighbourId) ?? 0) - 1;
			indegree.set(neighbourId, nextValue);
			if (nextValue !== 0) {
				continue;
			}

			const neighbour = graph.entryById.get(neighbourId);
			if (!neighbour) {
				continue;
			}

			ready.push(neighbour);
			ready.sort(compareHelpers);
		}
	}

	const unresolved = entries.filter((entry) => !visited.has(entry.id));

	return { ordered, unresolved };
}

/**
 * Handles missing dependency issues by invoking callbacks and throwing errors.
 *
 * @param missing
 * @param options
 * @param createError
 * @internal
 */
function handleMissingDependencies<THelper extends HelperDescriptor>(
	missing: MissingDependencyIssue<THelper>[],
	options: CreateDependencyGraphOptions<THelper> | undefined,
	createError: (code: string, message: string) => Error
): void {
	if (missing.length === 0) {
		return;
	}

	if (options?.onMissingDependency) {
		for (const issue of missing) {
			options.onMissingDependency(issue);
		}
	}

	const missingByHelper = new Map<string, string[]>();
	for (const issue of missing) {
		const helperKey = issue.dependant.helper.key;
		const deps = missingByHelper.get(helperKey) ?? [];
		deps.push(issue.dependencyKey);
		missingByHelper.set(helperKey, deps);
	}

	const descriptions = Array.from(missingByHelper.entries())
		.map(
			([helper, deps]) =>
				`"${helper}" → [${deps.map((d) => `"${d}"`).join(', ')}]`
		)
		.join(', ');

	throw createError(
		'ValidationError',
		`Helpers depend on unknown helpers: ${descriptions}.`
	);
}

/**
 * Handles unresolved helpers by invoking callbacks and throwing errors.
 *
 * @param unresolved
 * @param options
 * @param createError
 * @internal
 */
function handleUnresolvedHelpers<THelper extends HelperDescriptor>(
	unresolved: RegisteredHelper<THelper>[],
	options: CreateDependencyGraphOptions<THelper> | undefined,
	createError: (code: string, message: string) => Error
): void {
	if (unresolved.length === 0) {
		return;
	}

	if (options?.onUnresolvedHelpers) {
		options.onUnresolvedHelpers({ unresolved });
	}

	const unresolvedKeys = unresolved.map((entry) => entry.helper.key);

	throw createError(
		'ValidationError',
		`Detected unresolved pipeline helpers: ${unresolvedKeys.join(', ')}.`
	);
}

/**
 * Creates a dependency graph and returns the topological order.
 *
 * Validates that all dependencies exist and that there are no circular dependencies.
 * Throws `WPKernelError` if validation fails.
 *
 * @param  entries     - All registered helpers with their IDs
 * @param  options     - Optional callbacks for diagnostic reporting
 * @param  createError - Error factory function
 * @returns Ordered helpers and the adjacency list
 * @throws {Error} If dependencies are missing or unresolved
 *
 * @internal
 */
export function createDependencyGraph<THelper extends HelperDescriptor>(
	entries: RegisteredHelper<THelper>[],
	options: CreateDependencyGraphOptions<THelper> | undefined,
	createError: (code: string, message: string) => Error
): {
	order: RegisteredHelper<THelper>[];
	adjacency: Map<string, Set<string>>;
} {
	const graph = createGraphState(entries);
	const missing = registerHelperDependencies(entries, graph);

	const provided = new Set(options?.providedKeys ?? []);
	const actionableMissing = missing.filter(
		(issue) => !provided.has(issue.dependencyKey)
	);

	handleMissingDependencies(actionableMissing, options, createError);

	const { ordered, unresolved } = sortByDependencies(entries, graph);

	handleUnresolvedHelpers(unresolved, options, createError);

	return { order: ordered, adjacency: graph.adjacency };
}

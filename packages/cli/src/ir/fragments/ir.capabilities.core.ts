import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import type { IRCapabilityHint, IRResource } from '../publicTypes';

/**
 * Creates an IR fragment that collects capability hints from resource definitions.
 *
 * This fragment depends on the resources fragment to gather all defined capabilities
 * across the project, which are then used for generating capability maps.
 *
 * @category IR
 * @returns An `IrFragment` instance for capability collection.
 */
export function createCapabilitiesFragment(): IrFragment {
	return createHelper({
		key: 'ir.capabilities.core',
		kind: 'fragment',
		dependsOn: ['ir.resources.core'],
		apply({ input, output }: IrFragmentApplyOptions) {
			const capabilities = collectCapabilityHints(input.draft.resources);
			output.assign({ capabilities });
		},
	});
}

/**
 * Collect capability hints from a list of IR resources.
 *
 * Scans each resource's routes for a declared capability and aggregates
 * references so callers can reason about which resources and routes
 * reference a given capability key. The returned hints are deterministically
 * sorted for stable output.
 *
 * @param    resources - IR resources to scan for capability references
 * @returns Sorted array of capability hints with their references
 * @category IR
 */
function collectCapabilityHints(resources: IRResource[]): IRCapabilityHint[] {
	const hints = new Map<string, IRCapabilityHint>();

	for (const resource of resources) {
		for (const route of resource.routes) {
			if (!route.capability) {
				continue;
			}

			const existing = hints.get(route.capability);
			const reference = {
				resource: resource.name,
				route: route.path,
				transport: route.transport,
			} as const;

			if (existing) {
				existing.references.push(reference);
				continue;
			}

			hints.set(route.capability, {
				key: route.capability,
				source: 'resource',
				references: [reference],
			});
		}
	}

	const sorted = Array.from(hints.values()).sort((a, b) =>
		a.key.localeCompare(b.key)
	);
	for (const hint of sorted) {
		hint.references.sort((a, b) => {
			const resourceComparison = a.resource.localeCompare(b.resource);
			if (resourceComparison !== 0) {
				return resourceComparison;
			}

			return a.route.localeCompare(b.route);
		});
	}

	return sorted;
}

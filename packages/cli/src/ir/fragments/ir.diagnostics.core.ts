import { createHelper } from '../../runtime';
import type { IRDiagnostic, IRWarning } from '../publicTypes';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

const DIAGNOSTICS_FRAGMENT_KEY = 'ir.diagnostics.core';

function toResourceDiagnostic(
	resourceId: string,
	warning: IRWarning
): IRDiagnostic {
	return {
		code: `IR.RES.${warning.code}`,
		message: warning.message,
		severity: 'warn',
		target: {
			type: 'resource',
			id: resourceId,
			path: `/resources/${resourceId}`,
		},
		hint: warning.hint,
		source: 'fragment:resources',
	};
}

function toCapabilityDiagnostic(warning: IRWarning): IRDiagnostic {
	return {
		code: `IR.CAP.${warning.code}`,
		message: warning.message,
		severity: 'warn',
		target: {
			type: 'capability-map',
			path: '/capabilityMap',
		},
		hint: warning.hint,
		source: 'fragment:capability-map',
	};
}

function sortDiagnostics(values: IRDiagnostic[]): IRDiagnostic[] {
	return values.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Creates an IR fragment that collects and aggregates diagnostics (warnings) from other fragments.
 *
 * This fragment depends on the resources and capability-map fragments to gather
 * any warnings or issues identified during their processing and consolidates them
 * into a single list of diagnostics in the IR.
 *
 * @category IR
 * @returns An `IrFragment` instance for diagnostics collection.
 */
export function createDiagnosticsFragment(): IrFragment {
	return createHelper({
		key: DIAGNOSTICS_FRAGMENT_KEY,
		kind: 'fragment',
		dependsOn: ['ir.resources.core', 'ir.capability-map.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const diagnostics: IRDiagnostic[] = [];

			for (const resource of input.draft.resources) {
				for (const warning of resource.warnings) {
					diagnostics.push(
						toResourceDiagnostic(resource.id, warning)
					);
				}
			}

			if (input.draft.capabilityMap) {
				for (const warning of input.draft.capabilityMap.warnings) {
					diagnostics.push(toCapabilityDiagnostic(warning));
				}
			}

			output.assign({ diagnostics: sortDiagnostics(diagnostics) });
		},
	});
}

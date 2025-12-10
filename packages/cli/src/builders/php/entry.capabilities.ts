import { createHelper } from '../../runtime';
import type { BuilderApplyOptions, BuilderHelper } from '../../runtime/types';
import {
	buildCapabilityModule,
	buildProgramTargetPlanner,
	getPhpBuilderChannel,
	DEFAULT_DOC_HEADER,
} from '@wpkernel/wp-json-ast';
import type { CapabilityModuleWarning } from '@wpkernel/wp-json-ast';

/**
 * Creates a PHP builder helper for generating capability-related code.
 *
 * This helper processes the `capabilityMap` from the IR and generates PHP
 * classes and functions that define and manage WordPress capabilities,
 * ensuring proper access control for REST routes.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating capability code.
 */
export function createPhpCapabilityHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.capability',
		kind: 'builder',
		dependsOn: [
			'builder.generate.php.channel.bootstrap',
			'ir.artifacts.plan',
		],
		async apply(options: BuilderApplyOptions) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				return;
			}
			if (!input.ir.artifacts?.php) {
				options.reporter.debug(
					'createPhpCapabilityHelper: missing PHP artifacts plan; skipping.'
				);
				return;
			}

			const { ir } = input;

			const namespace = `${ir.php.namespace}\\Generated\\Capability`;
			const module = buildCapabilityModule({
				origin: ir.meta.origin,
				namespace,
				capabilityMap: ir.capabilityMap,
				hooks: {
					onWarning: (warning) =>
						forwardCapabilityWarning(options.reporter, warning),
				},
			});

			const planner = buildProgramTargetPlanner({
				workspace: options.context.workspace,
				outputDir: ir.php.outputDir,
				channel: getPhpBuilderChannel(options.context),
				docblockPrefix: DEFAULT_DOC_HEADER,
			});

			planner.queueFiles({ files: module.files });
		},
	});
}

function forwardCapabilityWarning(
	reporter: BuilderApplyOptions['reporter'],
	warning: CapabilityModuleWarning
): void {
	switch (warning.kind) {
		case 'capability-map-warning': {
			reporter.warn('Capability helper warning emitted.', {
				code: warning.warning.code,
				message: warning.warning.message,
				context: warning.warning.context,
			});
			break;
		}
		case 'capability-definition-missing': {
			reporter.warn('Capability falling back to default capability.', {
				// canonical
				capability: warning.capability,
				fallbackCapability: warning.fallbackCapability,
				scope: warning.fallbackScope,
				// legacy compatibility: tests/tools expecting an array alias
				capabilities: [warning.fallbackCapability],
			});
			break;
		}
		case 'capability-definition-unused': {
			reporter.warn('Capability definition declared but unused.', {
				capability: warning.capability,
				scope: warning.scope,
			});
			break;
		}
		default:
			throw new TypeError('Unhandled capability warning kind.');
	}
}

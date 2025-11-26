import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
	PipelineContext,
} from '../../runtime/types';
import {
	buildProgramTargetPlanner,
	buildRestControllerModuleFromPlan,
	DEFAULT_DOC_HEADER,
	type PhpBuilderChannel,
} from '@wpkernel/wp-json-ast';
import type { IRResource } from '../../ir/publicTypes';
// import { resolveIdentityConfig, type ResolvedIdentity } from './identity';
import { getPhpBuilderChannel } from '@wpkernel/wp-json-ast';
import { getWpPostRouteHelperState } from './controller.wpPostRoutes';
import { getResourceStorageHelperState } from './storage.artifacts';
import { buildResourcePlans } from './controller.resourcePlans';
import { isWriteRoute } from './controller.planTypes';

/**
 * Creates a PHP builder helper for resource-specific REST controllers.
 *
 * This helper iterates through each resource defined in the IR and generates
 * a corresponding REST controller. It integrates with various storage helpers
 * (transient, wp-option, wp-taxonomy, wp-post) to provide appropriate CRUD
 * operations for each resource.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating resource REST controllers.
 */
export function createPhpResourceControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources',
		kind: 'builder',
		dependsOn: [
			'builder.generate.php.core',
			'builder.generate.php.controller.resources.storage.transient',
			'builder.generate.php.controller.resources.storage.wpOption',
			'builder.generate.php.controller.resources.storage.wpTaxonomy',
			'builder.generate.php.controller.resources.wpPostRoutes',
		],
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, reporter } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const { ir } = input;
			if (ir.resources.length === 0) {
				reporter.debug(
					'createPhpResourceControllerHelper: no resources discovered.'
				);
				await next?.();
				return;
			}

			for (const resource of ir.resources) {
				warnOnMissingCapabilities({ reporter, resource });
			}

			const storageState = getResourceStorageHelperState(options.context);
			const wpPostRoutesState = getWpPostRouteHelperState(
				options.context
			);

			const moduleResult = buildRestControllerModuleFromPlan({
				origin: ir.meta.origin,
				pluginNamespace: ir.php.namespace,
				sanitizedNamespace: ir.meta.sanitizedNamespace,
				capabilityClass: `${ir.php.namespace}\\Generated\\Capability\\Capability`,
				resources: buildResourcePlans({
					ir,
					storageState,
					wpPostRoutesState,
					reporter,
				}),
				includeBaseController: false,
			});

			queueResourceControllerFiles({
				files: moduleResult.files,
				workspace: options.context.workspace,
				channel: getPhpBuilderChannel(options.context),
				outputDir: ir.php.outputDir,
			});

			await next?.();
		},
	});
}

interface WarnOnMissingCapabilitiesOptions {
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly resource: IRResource;
}

function warnOnMissingCapabilities(
	options: WarnOnMissingCapabilitiesOptions
): void {
	const { reporter, resource } = options;

	for (const route of resource.routes) {
		if (!isWriteRoute(route.method) || route.capability) {
			continue;
		}

		reporter.warn('Write route missing capability.', {
			resource: resource.name,
			method: route.method,
			path: route.path,
		});
	}
}

interface QueueResourceControllerFileOptions {
	readonly files: ReturnType<
		typeof buildRestControllerModuleFromPlan
	>['files'];
	readonly channel: PhpBuilderChannel;
	readonly workspace: PipelineContext['workspace'];
	readonly outputDir: string;
}

function queueResourceControllerFiles(
	options: QueueResourceControllerFileOptions
): void {
	const planner = buildProgramTargetPlanner({
		workspace: options.workspace,
		outputDir: options.outputDir,
		channel: options.channel,
		docblockPrefix: DEFAULT_DOC_HEADER,
	});

	planner.queueFiles({
		files: options.files,
		filter: (file) => file.metadata.kind === 'resource-controller',
	});
}

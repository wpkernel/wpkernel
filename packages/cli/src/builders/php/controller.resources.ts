import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	PipelineContext,
} from '../../runtime/types';
import {
	buildProgramTargetPlanner,
	buildRestControllerModuleFromPlan,
	DEFAULT_DOC_HEADER,
	type PhpBuilderChannel,
	type ResourceControllerMetadata,
} from '@wpkernel/wp-json-ast';
import type { IRPhpControllerPlan, IRResource } from '../../ir/publicTypes';
import { getPhpBuilderChannel } from '@wpkernel/wp-json-ast';
import { getWpPostRouteHelperState } from './controller.wpPostRoutes';
import { getResourceStorageHelperState } from './storage.artifacts';
import { buildResourcePlan } from './controller.resourcePlans';
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
			'builder.generate.php.channel.bootstrap',
			'builder.generate.php.controller.resources.storage.transient',
			'builder.generate.php.controller.resources.storage.wpOption',
			'builder.generate.php.controller.resources.storage.wpTaxonomy',
			'builder.generate.php.controller.resources.wpPostRoutes',
			'ir.artifacts.plan',
		],
		async apply(options: BuilderApplyOptions) {
			const { input, reporter } = options;
			if (input.phase !== 'generate' || !input.ir) {
				return;
			}
			if (!input.ir.artifacts?.php) {
				reporter.debug(
					'createPhpResourceControllerHelper: missing PHP artifacts plan; skipping.'
				);
				return;
			}

			const { ir } = input;
			if (ir.resources.length === 0) {
				reporter.debug(
					'createPhpResourceControllerHelper: no resources discovered.'
				);
				return;
			}

			for (const resource of ir.resources) {
				warnOnMissingCapabilities({ reporter, resource });
			}

			const controllerPlansByName = buildControllerPlanIndex(
				ir.resources,
				input.ir.artifacts.php.controllers
			);

			if (controllerPlansByName.size === 0) {
				reporter.debug(
					'createPhpResourceControllerHelper: no controller plans available; skipping.'
				);
				return;
			}

			const storageState = getResourceStorageHelperState(options.context);
			const wpPostRoutesState = getWpPostRouteHelperState(
				options.context
			);

			const resourcePlans = ir.resources
				.filter((resource) => controllerPlansByName.has(resource.name))
				.map((resource) => {
					const plan = controllerPlansByName.get(resource.name)!;
					const resourcePlan = buildResourcePlan({
						ir,
						resource,
						storageState,
						wpPostRoutesState,
						reporter,
					});

					return {
						...resourcePlan,
						className: plan.className,
					};
				});

			if (resourcePlans.length === 0) {
				reporter.debug(
					'createPhpResourceControllerHelper: no resources matched controller plans; skipping.'
				);
				return;
			}

			const moduleResult = buildRestControllerModuleFromPlan({
				origin: ir.meta.origin,
				pluginNamespace: ir.php.namespace,
				sanitizedNamespace: ir.meta.sanitizedNamespace,
				capabilityClass: `${ir.php.namespace}\\Generated\\Capability\\Capability`,
				resources: resourcePlans,
				includeBaseController: false,
			});

			queueResourceControllerFiles({
				files: moduleResult.files,
				workspace: options.context.workspace,
				channel: getPhpBuilderChannel(options.context),
				controllerPlansByName,
				reporter,
			});
		},
	});
}

function buildControllerPlanIndex(
	resources: readonly IRResource[],
	controllerPlans: Record<string, IRPhpControllerPlan> = {}
): Map<string, IRPhpControllerPlan> {
	const planIndex = new Map<string, IRPhpControllerPlan>();

	for (const resource of resources) {
		const plan = controllerPlans[resource.id];
		if (plan) {
			planIndex.set(resource.name, plan);
		}
	}

	return planIndex;
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
	readonly controllerPlansByName: Map<string, IRPhpControllerPlan>;
	readonly reporter: BuilderApplyOptions['reporter'];
}

function queueResourceControllerFiles(
	options: QueueResourceControllerFileOptions
): void {
	const planner = buildProgramTargetPlanner({
		workspace: options.workspace,
		outputDir: options.workspace.cwd(),
		channel: options.channel,
		docblockPrefix: DEFAULT_DOC_HEADER,
	});

	for (const file of options.files) {
		if (file.metadata.kind !== 'resource-controller') {
			continue;
		}

		const metadata = file.metadata as ResourceControllerMetadata;
		const plan = options.controllerPlansByName.get(metadata.name);
		if (!plan) {
			options.reporter.debug(
				`createPhpResourceControllerHelper: no controller plan for resource ${metadata.name}; skipping file.`
			);
			continue;
		}

		planner.queueFile(file, { filePath: plan.generatedPath });
	}
}

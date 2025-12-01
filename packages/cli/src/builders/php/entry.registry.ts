import { createHelper } from '../../runtime';
import type { BuilderApplyOptions, BuilderHelper } from '../../runtime/types';
import {
	buildPersistenceRegistryModule,
	buildProgramTargetPlanner,
	DEFAULT_DOC_HEADER,
	type PersistenceRegistryResourceConfig,
} from '@wpkernel/wp-json-ast';
import type { IRv1 } from '../../ir/publicTypes';
import { getPhpBuilderChannel } from '@wpkernel/php-json-ast';

/**
 * Creates a PHP builder helper for generating the persistence registry.
 *
 * This helper generates a PHP class that registers all resources and their
 * associated storage and identity configurations, allowing the WordPress
 * application to interact with them.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating the persistence registry.
 */
export function createPhpPersistenceRegistryHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.registration.persistence',
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
					'createPhpPersistenceRegistryHelper: missing PHP artifacts plan; skipping.'
				);
				return;
			}

			const { ir } = input;
			const namespace = `${ir.php.namespace}\\Generated\\Registration`;
			const module = buildPersistenceRegistryModule({
				origin: ir.meta.origin,
				namespace,
				resources: mapResources(ir),
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

function mapResources(ir: IRv1): readonly PersistenceRegistryResourceConfig[] {
	return ir.resources.map((resource) => ({
		name: resource.name,
		storage: resource.storage ?? null,
		identity: resource.identity ?? null,
	}));
}

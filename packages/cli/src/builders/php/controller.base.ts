import { createHelper } from '../../runtime';
import type { BuilderApplyOptions, BuilderHelper } from '../../runtime/types';
import {
	buildBaseControllerProgram,
	buildGeneratedModuleProgram,
	buildProgramTargetPlanner,
	DEFAULT_DOC_HEADER,
	deriveModuleNamespace,
	getPhpBuilderChannel,
	moduleSegment,
	type ModuleNamespaceConfig,
} from '@wpkernel/wp-json-ast';

/**
 * Creates a PHP builder helper for the base REST controller.
 *
 * This helper generates the `BaseController.php` file, which serves as the
 * foundation for all other REST controllers in the generated PHP output.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating the base REST controller.
 */
export function createPhpBaseControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.base',
		kind: 'builder',
		dependsOn: ['builder.generate.php.channel.bootstrap'],
		async apply(options: BuilderApplyOptions) {
			if (options.input.phase !== 'generate' || !options.input.ir) {
				return;
			}

			const { ir } = options.input;
			const namespaceConfig: ModuleNamespaceConfig = {
				pluginNamespace: ir.php.namespace,
				sanitizedPluginNamespace: ir.meta.sanitizedNamespace,
				segments: [
					moduleSegment('Generated', ''),
					moduleSegment('Rest', ''),
				],
			};
			const program = buildBaseControllerProgram({
				origin: ir.meta.origin,
				namespace: namespaceConfig,
			});
			const derivedNamespace =
				program.namespace ??
				deriveModuleNamespace(namespaceConfig).namespace;
			const planner = buildProgramTargetPlanner({
				workspace: options.context.workspace,
				outputDir: ir.php.outputDir,
				channel: getPhpBuilderChannel(options.context),
				docblockPrefix: DEFAULT_DOC_HEADER,
			});

			const fileProgram = buildGeneratedModuleProgram({
				namespace: derivedNamespace,
				docblock: program.docblock,
				metadata: program.metadata,
				statements: program.statements,
			});

			planner.queueFile({
				fileName: 'Rest/BaseController.php',
				program: fileProgram,
				metadata: program.metadata,
				docblock: program.docblock,
				uses: [],
				statements: [],
			});
			options.reporter.debug(
				'createPhpBaseControllerHelper: queued Rest/BaseController.php.'
			);
		},
	});
}

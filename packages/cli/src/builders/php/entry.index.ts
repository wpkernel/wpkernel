import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import {
	buildGeneratedModuleProgram,
	buildIndexProgram,
	buildProgramTargetPlanner,
	DEFAULT_DOC_HEADER,
	type ModuleIndexEntry,
} from '@wpkernel/wp-json-ast';
import type { IRv1 } from '../../ir/publicTypes';
import { toPascalCase } from './utils';
import { getPhpBuilderChannel } from '@wpkernel/php-json-ast';

/**
 * Creates a PHP builder helper for generating the main `index.php` file.
 *
 * This helper generates the primary entry point for the generated PHP code,
 * which includes and initializes all other generated components like controllers,
 * capabilities, and the persistence registry.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating the `index.php` file.
 */
export function createPhpIndexFileHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.index',
		kind: 'builder',
		dependsOn: [
			'builder.generate.php.core',
			'builder.generate.php.plugin-loader',
			'builder.generate.php.controller.resources',
			'builder.generate.php.capability',
			'builder.generate.php.registration.persistence',
			'ir.resources.core',
			'ir.capability-map.core',
			'ir.layout.core',
		],
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const ir = input.ir;

			const moduleNamespace = `${ir.php.namespace}\\Generated`;
			const program = buildIndexProgram({
				origin: ir.meta.origin,
				namespace: moduleNamespace,
				entries: buildIndexEntries(ir),
			});

			const planner = buildProgramTargetPlanner({
				workspace: options.context.workspace,
				outputDir: ir.php.outputDir,
				channel: getPhpBuilderChannel(options.context),
				docblockPrefix: DEFAULT_DOC_HEADER,
			});

			const fileProgram = buildGeneratedModuleProgram({
				namespace: program.namespace ?? moduleNamespace,
				docblock: program.docblock,
				metadata: program.metadata,
				statements: program.statements,
			});

			planner.queueFile({
				fileName: 'index.php',
				program: fileProgram,
				metadata: program.metadata,
				docblock: program.docblock,
				uses: [],
				statements: [],
			});
			options.reporter.debug(
				'createPhpIndexFileHelper: queued PHP index file.'
			);
			await next?.();
		},
	});
}

function buildIndexEntries(ir: IRv1): ModuleIndexEntry[] {
	const namespace = `${ir.php.namespace}\\Generated`;
	const entries: ModuleIndexEntry[] = [
		{
			className: `${namespace}\\Rest\\BaseController`,
			path: 'Rest/BaseController.php',
		},
		{
			className: `${namespace}\\Capability\\Capability`,
			path: 'Capability/Capability.php',
		},
		{
			className: `${namespace}\\Registration\\PersistenceRegistry`,
			path: 'Registration/PersistenceRegistry.php',
		},
	];

	for (const resource of ir.resources) {
		const pascal = toPascalCase(resource.name);
		entries.push({
			className: `${namespace}\\Rest\\${pascal}Controller`,
			path: `Rest/${pascal}Controller.php`,
		});
	}

	return entries;
}

import path from 'path';
import { type TsBuilderCreator } from '../types';
import { loadTsMorph } from './runtime.loader';
import { buildModuleSpecifier } from './shared.imports';
import { toCamelCase } from './shared.metadata';

/**
 * Builds a `TsBuilderCreator` for generating DataViews registry metadata.
 *
 * This creator emits a TypeScript module describing the auto-registration
 * metadata for a resource so tests and tooling can import the registry
 * snapshot emitted during generation.
 *
 * @category AST Builders
 * @example
 * ```ts
 * const creator = buildDataViewRegistryCreator();
 * await creator.create(context);
 * ```
 * @returns A `TsBuilderCreator` instance for registry metadata generation.
 */

export function buildDataViewRegistryCreator(): TsBuilderCreator {
	return {
		key: 'builder.generate.ts.dataviewRegistry.core',
		async create(context) {
			const { VariableDeclarationKind } = await loadTsMorph();
			const { descriptor } = context;
			const registryPath = path.join(
				context.paths.uiGenerated,
				'registry',
				'dataviews',
				`${descriptor.key}.ts`
			);
			const configImport = buildModuleSpecifier({
				workspace: context.workspace,
				from: registryPath,
				target: context.sourcePath,
			});
			const identifier = `${toCamelCase(
				descriptor.name
			)}DataViewRegistryEntry`;
			const preferencesKey =
				descriptor.dataviews.preferencesKey ??
				`${context.ir.meta.namespace}/dataviews/${descriptor.name}`;

			const sourceFile = context.project.createSourceFile(
				registryPath,
				'',
				{ overwrite: true }
			);

			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui/dataviews',
				namedImports: [
					{
						name: 'DataViewRegistryEntry',
						isTypeOnly: true,
					},
				],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: configImport,
				namespaceImport: 'wpkConfigModule',
			});
			sourceFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: identifier,
						type: 'DataViewRegistryEntry',
						initializer: (writer) => {
							writer.writeLine('{');
							writer.indent(() => {
								writer.write('resource: ');
								writer.quote(descriptor.name);
								writer.writeLine(',');
								writer.write('preferencesKey: ');
								writer.quote(preferencesKey);
								writer.writeLine(',');
								writer.write('metadata: ');
								writer.write(
									`wpkConfigModule.wpkConfig.resources[${JSON.stringify(
										descriptor.key
									)}].ui!.admin!.dataviews as unknown as Record<string, unknown>`
								);
								writer.writeLine(',');
							});
							writer.write('}');
						},
					},
				],
			});

			await context.emit({
				filePath: registryPath,
				sourceFile,
			});
		},
	};
}

import path from 'path';
import { type TsBuilderCreator } from '../types';
import { loadTsMorph } from './runtime.loader';
import { buildModuleSpecifier } from './shared.imports';
import { toCamelCase } from './shared.metadata';

/**
 * Builds a `TsBuilderCreator` for generating DataView fixture modules.
 *
 * Each fixture re-exports the configured `ResourceDataViewConfig` for a resource
 * so tests and custom UI entry points can import a stable configuration object.
 *
 * @category Builders
 */
export function buildDataViewFixtureCreator(): TsBuilderCreator {
	return {
		key: 'builder.generate.ts.dataviewFixture.core',
		async create(context) {
			const { VariableDeclarationKind } = await loadTsMorph();
			const { descriptor } = context;
			const fixturePath = path.join(
				context.paths.uiGenerated,
				'fixtures',
				'dataviews',
				`${descriptor.key}.ts`
			);

			const configImport = buildModuleSpecifier({
				workspace: context.workspace,
				from: fixturePath,
				target: context.sourcePath,
			});

			const identifier = `${toCamelCase(descriptor.name)}DataViewConfig`;
			const sourceFile = context.project.createSourceFile(
				fixturePath,
				'',
				{ overwrite: true }
			);

			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui/dataviews',
				namedImports: [
					{
						name: 'ResourceDataViewConfig',
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
						type: 'ResourceDataViewConfig<unknown, unknown>',
						initializer: (writer) => {
							writer.write(
								'wpkConfigModule.wpkConfig.resources['
							);
							writer.quote(descriptor.key);
							writer.write('].ui!.admin!.dataviews');
						},
					},
				],
			});

			await context.emit({ filePath: fixturePath, sourceFile });
		},
	};
}

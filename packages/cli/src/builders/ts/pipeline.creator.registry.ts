import path from 'path';
import {
	type TsBuilderCreator,
	type TsBuilderCreatorContext,
	type ResourceDescriptor,
} from '../types';
import type * as tsMorph from 'ts-morph';
type VariableDeclarationKindValue = typeof tsMorph.VariableDeclarationKind;
type SourceFile = tsMorph.SourceFile;
import { loadTsMorph } from './runtime.loader';
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
			ensureRegistryDataViews(context.descriptor);
			const { VariableDeclarationKind } = await loadTsMorph();
			const { descriptor } = context;
			const listRoutePath = resolveListRoutePath(descriptor);
			const registryPath = buildRegistryPath(context);
			const names = buildRegistryNames(descriptor, context);

			const sourceFile = context.project.createSourceFile(
				registryPath,
				'',
				{ overwrite: true }
			);

			addRegistryImports(sourceFile, listRoutePath);
			addRegistryEntry({
				sourceFile,
				VariableDeclarationKind,
				descriptor,
				listRoutePath,
				identifier: names.identifier,
				preferencesKey: names.preferencesKey,
			});

			await context.emit({
				filePath: registryPath,
				sourceFile,
			});
		},
	};
}

function ensureRegistryDataViews(descriptor: ResourceDescriptor): void {
	if (!descriptor.dataviews) {
		throw new Error('Registry fixture requires inferred dataviews in IR');
	}
}

function resolveListRoutePath(descriptor: ResourceDescriptor): string | null {
	const routePath = descriptor.config.routes?.list?.path;
	return typeof routePath === 'string' ? routePath : null;
}

function buildRegistryPath(context: TsBuilderCreatorContext) {
	return path.join(
		context.paths.uiGenerated,
		'registry',
		'dataviews',
		`${context.descriptor.key}.ts`
	);
}

function buildRegistryNames(
	descriptor: ResourceDescriptor,
	context: TsBuilderCreatorContext
) {
	return {
		identifier: `${toCamelCase(descriptor.name)}DataViewRegistryEntry`,
		preferencesKey: `${context.ir.meta.namespace}/dataviews/${descriptor.name}`,
	};
}

function addRegistryImports(
	sourceFile: SourceFile,
	listRoutePath: string | null
) {
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/ui/dataviews',
		namedImports: [
			{
				name: 'DataViewRegistryEntry',
				isTypeOnly: true,
			},
		],
	});
	if (listRoutePath) {
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@wordpress/api-fetch',
			defaultImport: 'apiFetch',
		});
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@wordpress/url',
			namedImports: [{ name: 'addQueryArgs' }],
		});
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@wpkernel/core/resource',
			namedImports: [
				{
					name: 'ListResponse',
					isTypeOnly: true,
				},
			],
		});
	}
}

function addRegistryEntry(options: {
	sourceFile: SourceFile;
	VariableDeclarationKind: VariableDeclarationKindValue;
	descriptor: ResourceDescriptor;
	listRoutePath: string | null;
	identifier: string;
	preferencesKey: string;
}) {
	const {
		sourceFile,
		VariableDeclarationKind,
		descriptor,
		listRoutePath,
		identifier,
		preferencesKey,
	} = options;

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
							'{ fields: [], defaultView: { type: "table" }, mapQuery: (query: Record<string, unknown>) => query ?? {} } as Record<string, unknown>'
						);
						writer.writeLine(',');
						if (listRoutePath) {
							writer.write(
								'fetchList: async (query: Record<string, unknown>): Promise<ListResponse<unknown>> => '
							);
							writer.inlineBlock(() => {
								writer.writeLine(
									`const path = addQueryArgs('${listRoutePath}', query);`
								);
								writer.writeLine(
									'const response = (await apiFetch({ path })) as { items?: unknown[]; total?: number } | undefined;'
								);
								writer.writeLine(
									'const items = Array.isArray(response?.items) ? response.items : [];'
								);
								writer.writeLine(
									"const total = typeof response?.total === 'number' ? response.total : items.length;"
								);
								writer.writeLine('return { items, total };');
							});
							writer.writeLine(',');
						}
					});
					writer.write('}');
				},
			},
		],
	});
}

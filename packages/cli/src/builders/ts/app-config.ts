import path from 'path';
import { createHelper } from '../../runtime';
import type { BuilderApplyOptions } from '../../runtime/types';
import { toPascalCase } from './metadata';
import { resolveAdminNames, resolveAdminPaths } from './admin-screen';
import { resolveAdminScreenComponentMetadata } from './admin-shared';
import type { IRResource } from '../../ir/publicTypes';
import type { ResourcePostMetaDescriptor } from '@wpkernel/core/resource';
import type { CodeBlockWriter, SourceFile } from 'ts-morph';
import { buildTsMorphAccessor, type TsMorphAccessor } from './imports';

export function createAppConfigBuilder() {
	return createHelper({
		key: 'builder.generate.ts.appConfig.core',
		kind: 'builder',
		dependsOn: ['ir.artifacts.plan', 'ir.resources.core', 'ir.meta.core'],
		async apply({ input, context, output, reporter }: BuilderApplyOptions) {
			if (input.phase !== 'generate' || !input.ir) {
				reporter?.debug('app config builder: prerequisites missing', {
					phase: input.phase,
					hasIr: Boolean(input.ir),
				});
				return;
			}

			const ir = input.ir;
			const { createSourceFile, VariableDeclarationKind } =
				await buildTsMorphAccessor({ workspace: context.workspace });

			for (const resource of ir.resources) {
				const uiPlan = ir.artifacts.uiResources[resource.id];
				if (!uiPlan || !uiPlan.generatedAppDir) {
					reporter?.debug(
						'app config builder: missing ui plan for resource',
						{ resource: resource.name }
					);
					continue;
				}

				const descriptor = {
					key: resource.name,
					name: resource.name,
					namespace: ir.meta.namespace,
					resource,
					dataviews: undefined,
					menu: undefined,
				};

				const componentMeta =
					resolveAdminScreenComponentMetadata(descriptor);
				const names = resolveAdminNames(descriptor, componentMeta);
				const { generatedScreenPath } = resolveAdminPaths(
					uiPlan,
					descriptor,
					componentMeta
				);

				const configPath = path.join(
					path.dirname(generatedScreenPath),
					'config.tsx'
				);

				const sourceFile = createSourceFile(configPath);
				addConfigContents({
					sourceFile,
					VariableDeclarationKind,
					descriptor,
					resource,
					namespace: ir.meta.namespace ?? '',
					dataViewConfigIdentifier: names.dataViewConfigIdentifier,
				});

				sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
				const contents = sourceFile.getFullText();
				await context.workspace.write(configPath, contents, {
					ensureDir: true,
				});
				output.queueWrite({ file: configPath, contents });
			}
		},
	});
}

function addConfigContents(options: {
	readonly sourceFile: SourceFile;
	readonly VariableDeclarationKind: TsMorphAccessor['VariableDeclarationKind'];
	readonly descriptor: { name: string };
	readonly resource: IRResource;
	readonly namespace: string;
	readonly dataViewConfigIdentifier: string;
}) {
	const {
		sourceFile,
		VariableDeclarationKind,
		descriptor,
		resource,
		namespace,
		dataViewConfigIdentifier,
	} = options;
	const pascalName = toPascalCase(descriptor.name);
	const entityType = `${pascalName}`;
	const queryType = `${pascalName}Query`;

	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/i18n',
		namedImports: ['__'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/ui/dataviews',
		namedImports: [{ name: 'ResourceDataViewConfig', isTypeOnly: true }],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: `@/types/${descriptor.name}`,
		namedImports: [
			{ name: entityType, isTypeOnly: true },
			{ name: queryType, isTypeOnly: true },
		],
	});

	sourceFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: dataViewConfigIdentifier,
				type: `ResourceDataViewConfig<${entityType}, ${queryType}>`,
				initializer: (writer: CodeBlockWriter) => {
					writer.writeLine('{');
					writer.indent(() => {
						writer.write('fields: [');
						writer.indent(() => {
							generateFields(writer, resource, namespace);
						});
						writer.writeLine('],');

						writer.write('defaultView: {');
						writer.indent(() => {
							writer.writeLine("type: 'table',");
							writer.write('fields: [');
							const visibleFields = getVisibleFields(resource);
							visibleFields.forEach((f) =>
								writer.write(`'${f}', `)
							);
							writer.writeLine('],');
						});
						writer.writeLine('},');

						writer.writeLine(`mapQuery: (view): ${queryType} => {`);
						writer.indent(() => {
							writer.writeLine(`const query: ${queryType} = {};`);
							writer.writeLine(
								'if (view.search) { query.search = view.search; }'
							);
							writer.writeLine('if (view.sort) {');
							writer.indent(() => {
								writer.writeLine(
									`query.orderby = view.sort.field as keyof ${entityType};`
								);
								writer.writeLine(
									'query.order = view.sort.direction;'
								);
							});
							writer.writeLine('}');
							writer.writeLine('return query;');
						});
						writer.writeLine('},');
					});
					writer.write('}');
				},
			},
		],
	});
}

function generateFields(
	writer: CodeBlockWriter,
	resource: IRResource,
	namespace: string
) {
	const storage = resource.storage;
	if (!storage) {
		return;
	}

	// ID
	if (resource.identity?.param === 'id' || storage.mode === 'wp-post') {
		writeField(writer, 'id', 'ID', 'integer', namespace, true, true);
	}

	if (storage.mode === 'wp-post') {
		if (storage.supports?.includes('title')) {
			writeField(
				writer,
				'title',
				'Title',
				'text',
				namespace,
				true,
				false,
				"({ item }) => item.title || ''"
			); // Accessor for title
		}
		writeField(writer, 'status', 'Status', 'text', namespace, true, false);
		writeField(writer, 'date', 'Date', 'datetime', namespace, true, true);

		writeMetaFields(writer, storage.meta, namespace);
		writeTaxonomyFields(writer, storage.taxonomies, namespace);
	}
}

function writeField(
	writer: CodeBlockWriter,
	id: string,
	label: string,
	type: string,
	namespace: string,
	sortable: boolean,
	hideable: boolean,
	getValue?: string
) {
	writer.writeLine('{');
	writer.indent(() => {
		writer.writeLine(`id: '${id}',`);
		writer.writeLine(`label: __('${label}', '${namespace}'),`);
		writer.writeLine(`type: '${type}',`);
		writer.writeLine(`enableSorting: ${sortable},`);
		writer.writeLine(`enableHiding: ${hideable},`);
		if (getValue) {
			writer.writeLine(`getValue: ${getValue},`);
		}
	});
	writer.writeLine('},');
}

function mapMetaTypeToFieldType(type: string): string {
	if (type === 'integer' || type === 'number') {
		return 'integer';
	}
	if (type === 'boolean') {
		return 'text';
	} // Dataviews boolean support?
	return 'text';
}

function writeMetaFields(
	writer: CodeBlockWriter,
	meta: Record<string, ResourcePostMetaDescriptor> | undefined,
	namespace: string
): void {
	if (!meta) {
		return;
	}

	for (const [key, descriptor] of Object.entries(meta)) {
		const metaDesc = descriptor as ResourcePostMetaDescriptor;
		const type = mapMetaTypeToFieldType(metaDesc.type);
		const label = toTitleCase(key);
		writeField(writer, key, label, type, namespace, true, true);
	}
}

function writeTaxonomyFields(
	writer: CodeBlockWriter,
	taxonomies: Record<string, { taxonomy?: string }> | undefined,
	namespace: string
): void {
	if (!taxonomies) {
		return;
	}

	for (const [key, config] of Object.entries(taxonomies)) {
		const taxonomy = config?.taxonomy ?? key;
		const label = toTitleCase(taxonomy.replace(/^(acme_|wpk_)/, ''));

		writer.writeLine('{');
		writer.indent(() => {
			writer.writeLine(`id: '${taxonomy}',`);
			writer.writeLine(`label: __('${label}', '${namespace}'),`);
			writer.writeLine(`type: 'text',`);
			writer.writeLine('enableSorting: false,');
			writer.writeLine('enableHiding: true,');
			writer.writeLine(
				`getValue: ({ item }: { item: Record<string, unknown> }) => Array.isArray(item['${taxonomy}']) ? item['${taxonomy}'].join(', ') : '',`
			);
		});
		writer.writeLine('},');
	}
}

function getVisibleFields(resource: IRResource): string[] {
	const fields: string[] = [];
	const storage = resource.storage;

	if (storage?.mode === 'wp-post') {
		if (storage.supports?.includes('title')) {
			fields.push('title');
		}
		fields.push('status');

		if (storage.meta) {
			// Add first few meta fields
			fields.push(...Object.keys(storage.meta).slice(0, 3));
		}

		if (storage.taxonomies) {
			// Add first few taxonomies
			const taxKeys = Object.values(storage.taxonomies)
				.map((t) => t?.taxonomy)
				.filter(Boolean) as string[];
			fields.push(...taxKeys.slice(0, 2));
		}

		fields.push('date');
	}

	return fields;
}

function toTitleCase(value: string): string {
	return value
		.split(/[-_:]/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

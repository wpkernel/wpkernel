import path from 'path';
import { createHelper } from '../../runtime';
import type { BuilderApplyOptions } from '../../runtime/types';
import { buildTsMorphAccessor } from './imports';
import { toCamelCase } from './metadata';
import { resolveListRoutePath } from './admin-shared';
import type { IRResource } from '../../ir/publicTypes';
import type { SourceFile, VariableDeclarationKind } from 'ts-morph';
import type { ResourceDescriptor } from '../types';

export function createDataViewRegistryBuilder() {
	return createHelper({
		key: 'builder.generate.ts.dataviewRegistry.core',
		kind: 'builder',
		dependsOn: [
			'ir.artifacts.plan',
			'ir.ui.resources',
			'ir.resources.core',
		],
		async apply({ input, context, output, reporter }: BuilderApplyOptions) {
			if (input.phase !== 'generate') {
				return;
			}
			if (!input.ir?.artifacts || !input.ir.layout) {
				reporter?.debug('registry builder: prerequisites missing', {
					phase: input.phase,
					hasIr: Boolean(input.ir),
					hasArtifacts: Boolean(input.ir?.artifacts),
					hasLayout: Boolean(input.ir?.layout),
				});
				return;
			}

			await generateRegistryEntries({
				ir: input.ir,
				uiResources: input.ir.ui?.resources ?? [],
				context,
				output,
				reporter,
			});
		},
	});
}

async function generateRegistryEntries(options: {
	readonly ir: NonNullable<BuilderApplyOptions['input']['ir']>;
	readonly uiResources: NonNullable<
		NonNullable<BuilderApplyOptions['input']['ir']>['ui']
	>['resources'];
	readonly context: BuilderApplyOptions['context'];
	readonly output: BuilderApplyOptions['output'];
	readonly reporter?: BuilderApplyOptions['reporter'];
}) {
	const { ir, uiResources, context, output, reporter } = options;
	const { createSourceFile, VariableDeclarationKind } =
		await buildTsMorphAccessor({ workspace: context.workspace });
	const resourceByName = new Map<string, IRResource>(
		ir.resources.map((resource) => [resource.name, resource])
	);
	const uiGenerated = ir.layout!.resolve('ui.generated');

	for (const uiResource of uiResources) {
		const resource = resourceByName.get(uiResource.resource);
		if (!resource) {
			reporter?.warn(
				'builder.generate.ts.dataviewRegistry.missing-resource',
				{ resource: uiResource.resource }
			);
			continue;
		}
		if (!uiResource.dataviews) {
			reporter?.debug('registry builder: missing dataviews', {
				resource: resource.name,
			});
			continue;
		}

		const registryPath = path.join(
			uiGenerated,
			'registry',
			'dataviews',
			`${uiResource.resource}.ts`
		);
		const descriptor: ResourceDescriptor = {
			key: uiResource.resource,
			name: resource.name,
			resource,
			adminView: 'dataviews',
			dataviews: uiResource.dataviews,
		};

		const listRoutePath = resolveListRoutePath(descriptor);
		const names = {
			identifier: `${toCamelCase(descriptor.name)}DataViewRegistryEntry`,
			preferencesKey: uiResource.preferencesKey,
		};

		const sourceFile = createSourceFile(registryPath);
		addRegistryImports(sourceFile, listRoutePath);
		addRegistryEntry({
			sourceFile,
			VariableDeclarationKind,
			descriptor,
			listRoutePath,
			identifier: names.identifier,
			preferencesKey: names.preferencesKey,
		});

		sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
		const contents = sourceFile.getFullText();
		await context.workspace.write(registryPath, contents, {
			ensureDir: true,
		});
		output.queueWrite({ file: registryPath, contents });
	}
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
	VariableDeclarationKind: typeof VariableDeclarationKind;
	descriptor: { name: string };
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

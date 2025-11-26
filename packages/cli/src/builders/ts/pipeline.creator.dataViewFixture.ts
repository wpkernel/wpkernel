import path from 'path';
import { type TsBuilderCreator } from '../types';
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
			const { descriptor } = context;
			if (!descriptor.dataviews) {
				return;
			}
			const fixturePath = path.join(
				context.paths.uiGenerated,
				'fixtures',
				'dataviews',
				`${descriptor.key}.ts`
			);
			const appliedFixturePath = path.join(
				context.paths.uiApplied,
				'fixtures',
				'dataviews',
				`${descriptor.key}.ts`
			);

			const configImport = buildModuleSpecifier({
				workspace: context.workspace,
				from: appliedFixturePath,
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
			sourceFile.addStatements([
				`const baseConfig = wpkConfigModule.wpkConfig.resources[${JSON.stringify(
					descriptor.key
				)}].ui!.admin!.dataviews;`,
				'',
				'const fieldIds = (baseConfig.fields ?? []).map((field, index) =>',
				'  (field as { id?: string }).id ?? (field as { key?: string }).key ?? `field-${index}`',
				');',
				'',
				`const fallbackViewType =`,
				'  (baseConfig.defaultView as { type?: string })?.type ??',
				'  (baseConfig.defaultView as { layout?: string })?.layout ??',
				"  'table';",
				'',
				`const baseLayout =`,
				"  typeof (baseConfig.defaultView as { layout?: unknown })?.layout === 'object'",
				'    ? ((baseConfig.defaultView as { layout?: Record<string, unknown> }).layout ?? {})',
				'    : {};',
				'',
				`const fallbackColumns =`,
				'  Array.isArray(baseLayout.columns) && baseLayout.columns.length',
				'    ? baseLayout.columns',
				'    : (Array.isArray((baseConfig.defaultView as { columns?: string[] }).columns)',
				'        ? (baseConfig.defaultView as { columns?: string[] }).columns ?? []',
				'        : fieldIds);',
				'',
				`const defaultLayouts = {`,
				'  [fallbackViewType]: {',
				'    ...baseLayout,',
				'    columns:',
				'      Array.isArray(baseLayout.columns) && baseLayout.columns.length',
				'        ? baseLayout.columns',
				'        : (fallbackColumns.length ? fallbackColumns : fieldIds),',
				'  },',
				'  ...(typeof baseConfig.defaultLayouts === "object" ? baseConfig.defaultLayouts ?? {} : {}),',
				'};',
				'',
				`export const ${identifier}: ResourceDataViewConfig<unknown, unknown> = {`,
				'  ...baseConfig,',
				'  fields: (baseConfig.fields ?? []).map((field, index) => ({',
				'    id: (field as { id?: string }).id ?? (field as { key?: string }).key ?? `field-${index}` ,',
				'    ...field,',
				'  })),',
				'  actions: (baseConfig.actions ?? []).map((action, index) => ({',
				'    ...action,',
				'    id: (action as { id?: string }).id ?? (action as { key?: string }).key ?? (action as { action?: string }).action ?? `action-${index}`,',
				'  })),',
				'  views: (baseConfig.views ?? []).map((view, index) => ({',
				'    ...view,',
				'    view: {',
				'      ...(view as { view?: Record<string, unknown> }).view,',
				'      fields:',
				'        (view as { view?: { fields?: string[] } }).view?.fields?.length',
				'          ? (view as { view?: { fields?: string[] } }).view?.fields',
				'          : (view as { view?: { layout?: { columns?: string[] } } }).view?.layout?.columns?.length',
				'            ? (view as { view?: { layout?: { columns?: string[] } } }).view?.layout?.columns',
				'            : (view as { view?: { columns?: string[] } }).view?.columns?.length',
				'              ? (view as { view?: { columns?: string[] } }).view?.columns',
				'              : fieldIds,',
				'      layout: {',
				'        ...(typeof (view as { view?: { layout?: unknown } }).view?.layout === "object"',
				'          ? (view as { view?: { layout?: Record<string, unknown> } }).view?.layout',
				'          : {}),',
				'        columns:',
				'          (view as { view?: { layout?: { columns?: string[] } } }).view?.layout?.columns?.length',
				'            ? (view as { view?: { layout?: { columns?: string[] } } }).view?.layout?.columns',
				'            : (view as { view?: { columns?: string[] } }).view?.columns?.length',
				'              ? (view as { view?: { columns?: string[] } }).view?.columns',
				'              : (fallbackColumns.length ? fallbackColumns : fieldIds),',
				'      },',
				'      type:',
				'        (view as { view?: { type?: string } }).view?.type ??',
				'        (view as { view?: { layout?: string } }).view?.layout ??',
				'        fallbackViewType ??',
				'        `table-${index}`,',
				'    },',
				'  })),',
				'  defaultView: {',
				'    ...baseConfig.defaultView,',
				'    fields:',
				'      (baseConfig.defaultView as { fields?: string[] })?.fields?.length',
				'        ? (baseConfig.defaultView as { fields?: string[] }).fields',
				'        : (fallbackColumns.length ? fallbackColumns : fieldIds),',
				'    layout: {',
				'      ...baseLayout,',
				'      columns:',
				'        Array.isArray(baseLayout.columns) && baseLayout.columns.length',
				'          ? baseLayout.columns',
				'          : (fallbackColumns.length ? fallbackColumns : fieldIds),',
				'    },',
				'    type:',
				'      (baseConfig.defaultView as { type?: string })?.type ??',
				'      (baseConfig.defaultView as { layout?: string })?.layout ??',
				'      fallbackViewType,',
				'  },',
				'  defaultLayouts: defaultLayouts,',
				'  mapQuery:',
				'    baseConfig.mapQuery ??',
				'    (({ page, perPage, search }) => ({',
				'      page,',
				'      per_page: perPage,',
				'      search,',
				'    })),',
				'};',
			]);

			await context.emit({ filePath: fixturePath, sourceFile });
		},
	};
}

import path from 'path';
import { createHelper } from '../../runtime';
import type { BuilderApplyOptions } from '../../runtime/types';
import { toPascalCase, toCamelCase } from './metadata';
import { resolveAdminPaths } from './admin-screen';
import { resolveAdminScreenComponentMetadata } from './admin-shared';
import type { CodeBlockWriter, SourceFile } from 'ts-morph';
import { buildTsMorphAccessor, type TsMorphAccessor } from './imports';
import type { ResourceDescriptor } from '../types';
import type { IRArtifactsPlan, IRResource, IRv1 } from '../../ir/publicTypes';

type AppFormDescriptor = ResourceDescriptor & {
	config?: {
		namespace?: string;
		routes?: {
			get?: { path?: string };
		};
	};
};

function hasAppFormContext({
	input,
	reporter,
	irArtifacts,
}: {
	input: BuilderApplyOptions['input'];
	reporter: BuilderApplyOptions['reporter'];
	irArtifacts?: NonNullable<BuilderApplyOptions['input']['ir']>['artifacts'];
}): boolean {
	if (input.phase !== 'generate' || !input.ir) {
		reporter.debug('AppFormBuilder: skipping (non-generate phase)');
		return false;
	}

	if (!irArtifacts?.uiResources) {
		reporter.debug('AppFormBuilder: missing artifact plan');
		return false;
	}

	return true;
}

async function runAppFormBuilder(options: BuilderApplyOptions): Promise<void> {
	const { input, context, output, reporter } = options;

	const irWithArtifacts = input.ir as
		| (IRv1 & { artifacts?: IRArtifactsPlan })
		| null;
	const irArtifacts = irWithArtifacts?.artifacts;

	if (
		!hasAppFormContext({
			input,
			reporter,
			irArtifacts,
		})
	) {
		return;
	}

	const ir = input.ir!;
	const artifacts = irArtifacts!;
	const { createSourceFile, VariableDeclarationKind } =
		await buildTsMorphAccessor({ workspace: context.workspace });

	for (const resource of ir.resources) {
		const descriptor = resource as unknown as AppFormDescriptor;
		reporter.info(`AppFormBuilder: processing ${descriptor.name}`);

		const uiPlan = artifacts.uiResources[resource.id];
		if (!uiPlan) {
			reporter.debug(
				`AppFormBuilder: missing ui plan for ${descriptor.name}`
			);
			continue;
		}
		if (!uiPlan.generatedAppDir) {
			reporter.debug(
				`AppFormBuilder: missing ui dir for ${descriptor.name}`
			);
			continue;
		}

		const componentMeta = resolveAdminScreenComponentMetadata(descriptor);
		const { generatedScreenPath } = resolveAdminPaths(
			uiPlan,
			descriptor,
			componentMeta
		);

		reporter.info(
			`AppFormBuilder: generatedScreenPath for ${descriptor.name} is ${generatedScreenPath}`
		);

		const formPath = path.join(
			path.dirname(generatedScreenPath),
			'form.tsx'
		);

		reporter.info(
			`AppFormBuilder: formPath for ${descriptor.name} is ${formPath}`
		);

		const sourceFile = createSourceFile(formPath);

		const pascalName = toPascalCase(descriptor.name);
		const formInputType = `${pascalName}FormInput`;
		const entityType = `${pascalName}Entity`;
		const quickFormName = `${pascalName}QuickForm`;
		const buildActionsName = `build${pascalName}Actions`;

		populateAppFormSourceFile({
			sourceFile,
			resource,
			descriptor,
			pascalName,
			formInputType,
			entityType,
			quickFormName,
			buildActionsName,
			variableDeclarationKind: VariableDeclarationKind,
		});

		const fileText = sourceFile.getFullText();

		await context.workspace.write(formPath, fileText, {
			ensureDir: true,
		});

		output.queueWrite({
			file: formPath,
			contents: fileText,
		});
	}
}

export function createAppFormBuilder() {
	return createHelper({
		key: 'builder.generate.ts.appForm.core',
		kind: 'builder',
		// We depend on the IR being present so we can look up the matching resource.
		dependsOn: [
			'ir.resources.core',
			'ir.ui.resources',
			'ir.artifacts.plan',
		],
		async apply(options: BuilderApplyOptions) {
			await runAppFormBuilder(options);
		},
	});
}

type PopulateAppFormParams = {
	sourceFile: SourceFile;
	resource: IRResource;
	descriptor: AppFormDescriptor;
	pascalName: string;
	formInputType: string;
	entityType: string;
	quickFormName: string;
	buildActionsName: string;
	variableDeclarationKind: TsMorphAccessor['VariableDeclarationKind'];
};

function populateAppFormSourceFile({
	sourceFile,
	resource,
	descriptor,
	pascalName,
	formInputType,
	entityType,
	quickFormName,
	buildActionsName,
	variableDeclarationKind,
}: PopulateAppFormParams): void {
	addAppFormImports(sourceFile);
	writeFormInputType(sourceFile, formInputType, resource);
	addEntityTypeAlias(sourceFile, entityType, formInputType);
	addDefaultForm(
		sourceFile,
		pascalName,
		formInputType,
		resource,
		variableDeclarationKind
	);
	addFormPropsType(sourceFile, pascalName, entityType);
	addPayloadBuilder(sourceFile, pascalName, formInputType, resource);
	addMutationActionBuilder(sourceFile, pascalName, formInputType, entityType);
	writeQuickFormComponent({
		sourceFile,
		quickFormName,
		pascalName,
		entityType,
		formInputType,
		resource,
		descriptor,
	});
	addActionsBuilder(sourceFile, buildActionsName, entityType);
}

function addAppFormImports(sourceFile: SourceFile): void {
	sourceFile.addImportDeclaration({
		moduleSpecifier: 'react',
		namedImports: ['useEffect', 'useMemo', 'useState'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/components',
		namedImports: ['Button', 'Modal', 'Notice', 'Spinner'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/http',
		namedImports: [{ name: 'fetch', alias: 'wpkFetch' }],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/resource',
		namedImports: [{ name: 'ResourceObject', isTypeOnly: true }],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/contracts',
		namedImports: ['WPKernelError'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/actions',
		namedImports: ['defineAction'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/ui/dataviews',
		namedImports: [
			'useDataFormHelper',
			'textField',
			'statusField',
			'selectField',
			'numberField',
			{ name: 'ResourceDataViewActionConfig', isTypeOnly: true },
			{ name: 'ResourceDataViewController', isTypeOnly: true },
			'buildFormConfigFromFields',
			'DataFormDebugPanel',
			{ name: 'DataViewsRuntimeContext', isTypeOnly: true },
		],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/ui',
		namedImports: ['useTaxonomyOptions'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/url',
		namedImports: ['addQueryArgs'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/dataviews/wp',
		namedImports: [{ name: 'Form', isTypeOnly: true }],
	});
}

function addEntityTypeAlias(
	sourceFile: SourceFile,
	entityType: string,
	formInputType: string
): void {
	sourceFile.addTypeAlias({
		name: entityType,
		isExported: true,
		type: `${formInputType} & { [key: string]: unknown; }`,
	});
}

function addDefaultForm(
	sourceFile: SourceFile,
	pascalName: string,
	formInputType: string,
	resource: IRResource,
	variableDeclarationKind: TsMorphAccessor['VariableDeclarationKind']
): void {
	sourceFile.addVariableStatement({
		declarationKind: variableDeclarationKind.Const,
		declarations: [
			{
				name: `default${pascalName}Form`,
				type: formInputType,
				initializer: (writer: CodeBlockWriter) => {
					writer.writeLine('{');
					writer.indent(() => {
						if (resource.storage?.mode === 'wp-post') {
							const storage = resource.storage;

							if (storage.supports?.includes('title')) {
								writer.writeLine("title: '',");
							}
							writer.writeLine("status: 'publish',");

							if (storage.meta) {
								for (const key of Object.keys(storage.meta)) {
									writer.writeLine(`${key}: undefined,`);
								}
							}

							if (storage.taxonomies) {
								for (const [key, config] of Object.entries(
									storage.taxonomies
								)) {
									const taxConfig = config as {
										taxonomy?: string;
									};
									const taxKey = taxConfig.taxonomy ?? key;
									writer.writeLine(`${taxKey}: undefined,`);
								}
							}
						}
					});
					writer.write('}');
				},
			},
		],
	});
}

function addFormPropsType(
	sourceFile: SourceFile,
	pascalName: string,
	entityType: string
): void {
	sourceFile.addTypeAlias({
		name: `${pascalName}FormProps`,
		isExported: true,
		type: (writer: CodeBlockWriter) => {
			writer.writeLine('{');
			writer.indent(() => {
				writer.writeLine(
					`resource: ResourceObject<${entityType}, Record<string, unknown>>;`
				);
				writer.writeLine('runtime: DataViewsRuntimeContext;');
				writer.writeLine('editId: string | number | null;');
				writer.writeLine('onClose: () => void;');
				writer.writeLine('onRefresh: () => void;');
			});
			writer.write('}');
		},
	});
}

function addPayloadBuilder(
	sourceFile: SourceFile,
	pascalName: string,
	formInputType: string,
	resource: IRResource
): void {
	sourceFile.addFunction({
		name: `build${pascalName}Payload`,
		parameters: [{ name: 'input', type: formInputType }],
		returnType: 'Record<string, unknown>',
		statements: (writer: CodeBlockWriter) => {
			writer.writeLine('const payload: Record<string, unknown> = {};');
			writer.writeLine('const meta: Record<string, unknown> = {};');

			if (resource.storage?.mode === 'wp-post') {
				const storage = resource.storage;

				if (storage.supports?.includes('title')) {
					writer.writeLine(
						'if (input.title) payload.title = input.title;'
					);
				}
				writer.writeLine(
					'if (input.status) payload.status = input.status;'
				);

				if (storage.meta) {
					for (const key of Object.keys(storage.meta)) {
						writer.writeLine(
							`if (input.${key} !== undefined) meta.${key} = input.${key};`
						);
					}
				}

				if (storage.taxonomies) {
					for (const [key, config] of Object.entries(
						storage.taxonomies
					)) {
						const taxConfig = config as { taxonomy?: string };
						const taxKey = taxConfig.taxonomy ?? key;
						writer.writeLine(
							`if (input.${taxKey}) payload.${taxKey} = [input.${taxKey}];`
						);
					}
				}
			}

			writer.writeLine(
				'if (Object.keys(meta).length > 0) { payload.meta = meta; }'
			);
			writer.writeLine('return payload;');
		},
	});
}

function addMutationActionBuilder(
	sourceFile: SourceFile,
	pascalName: string,
	formInputType: string,
	entityType: string
): void {
	sourceFile.addFunction({
		name: 'buildMutationAction',
		parameters: [
			{
				name: 'mutate',
				type: `ResourceObject<${entityType}, Record<string, unknown>>['mutate'] | undefined`,
			},
			{ name: 'mode', type: "'create' | 'update'" },
		],
		statements: (writer: CodeBlockWriter) => {
			writer.writeLine(
				`return defineAction<${formInputType}, ${entityType}>({`
			);
			writer.indent(() => {
				writer.writeLine(
					"name: mode === 'create' ? 'Create' : 'Update',"
				);
				writer.writeLine('handler: async (_ctx, input) => {');
				writer.indent(() => {
					writer.writeLine(
						"if (!mutate) throw new WPKernelError('DeveloperError', { message: `${mode} mutation not available.` });"
					);
					writer.writeLine(
						"if (mode === 'update' && !input.id) throw new WPKernelError('DeveloperError', { message: 'Missing id for update.' });"
					);
					writer.writeLine(
						`const payload = build${pascalName}Payload(input);`
					);
					writer.writeLine(
						"return mode === 'create' ? mutate.create?.(payload as never) : mutate.update?.(input.id as string | number, payload as never);"
					);
				});
				writer.writeLine('},');
			});
			writer.writeLine('});');
		},
	});
}

function addActionsBuilder(
	sourceFile: SourceFile,
	buildActionsName: string,
	entityType: string
): void {
	sourceFile.addFunction({
		name: buildActionsName,
		isExported: true,
		parameters: [
			{
				name: 'controller',
				type:
					`ResourceDataViewController<${entityType}, Record<string, unknown>> | ` +
					`{ resource?: ResourceObject<${entityType}, Record<string, unknown>> }`,
			},
			{
				name: 'openQuickEdit',
				type: '(id: string | number) => void',
			},
		],
		returnType: `Array<ResourceDataViewActionConfig<${entityType}, unknown, unknown>>`,
		statements: (writer: CodeBlockWriter) => {
			writer.writeLine('const { mutate } = controller.resource || {};');
			writer.writeLine('if (!mutate) return [];');

			writer.writeLine(
				'const deleteAction = defineAction<{ ids: Array<string | number> }, void>({'
			);
			writer.indent(() => {
				writer.writeLine("name: 'Delete',");
				writer.writeLine('handler: async (_ctx, { ids }) => {');
				writer.indent(() => {
					writer.writeLine('if (!ids?.length) return;');
					writer.writeLine(
						'await Promise.all(ids.map(id => mutate.remove?.(id).catch(() => undefined)));'
					);
				});
				writer.writeLine('},');
			});
			writer.writeLine('});');

			writer.writeLine('return [');
			writer.indent(() => {
				writer.writeLine(
					'{ id: "delete", label: "Delete", action: deleteAction, isDestructive: true, supportsBulk: true, getActionArgs: ({ selection }: any) => ({ ids: selection }) },'
				);
				writer.writeLine(
					'{ id: "quick-edit", label: "Quick Edit", action: defineAction<{id: string|number}, void>({ name: "Edit", handler: async (_c, {id}) => openQuickEdit(id), options: { scope: "tabLocal", bridged: false } }), getActionArgs: ({ selection }: any) => ({ id: selection[0] }) },'
				);
			});
			writer.writeLine('];');
		},
	});
}

function writeFormInputType(
	sourceFile: SourceFile,
	formInputType: string,
	resource: IRResource
): void {
	sourceFile.addTypeAlias({
		name: formInputType,
		isExported: false,
		type: (writer: CodeBlockWriter) => {
			writer.writeLine('{');
			writer.indent(() => {
				writer.writeLine('id?: string | number;');
				if (resource.storage?.mode !== 'wp-post') {
					return;
				}
				writePostFormInputFields(writer, resource.storage);
			});
			writer.write('}');
		},
	});
}

function writePostFormInputFields(
	writer: CodeBlockWriter,
	storage: NonNullable<IRResource['storage']> & { mode: 'wp-post' }
): void {
	if (storage.supports?.includes('title')) {
		writer.writeLine('title?: string;');
	}
	writer.writeLine('status?: string;');
	writeMetaFields(writer, storage.meta);
	writeTaxonomyInputs(writer, storage.taxonomies);
}

function writeMetaFields(
	writer: CodeBlockWriter,
	meta: Record<string, { type?: string }> | undefined
): void {
	if (!meta) {
		return;
	}
	for (const [key, desc] of Object.entries(meta)) {
		const metaType = mapMetaType(desc);
		writer.writeLine(`${key}?: ${metaType};`);
	}
}

function writeTaxonomyInputs(
	writer: CodeBlockWriter,
	taxonomies: Record<string, { taxonomy?: string }> | undefined
): void {
	if (!taxonomies) {
		return;
	}
	for (const [key, config] of Object.entries(taxonomies)) {
		const taxKey = config?.taxonomy ?? key;
		writer.writeLine(`${taxKey}?: number; // Single select for now`);
	}
}

function mapMetaType(desc: { type?: string }): 'number' | 'boolean' | 'string' {
	if (desc.type === 'number' || desc.type === 'integer') {
		return 'number';
	}
	if (desc.type === 'boolean') {
		return 'boolean';
	}
	return 'string';
}

type QuickFormParams = {
	sourceFile: SourceFile;
	quickFormName: string;
	pascalName: string;
	entityType: string;
	formInputType: string;
	resource: IRResource;
	descriptor: AppFormDescriptor;
};

function writeQuickFormComponent({
	sourceFile,
	quickFormName,
	pascalName,
	entityType,
	formInputType,
	resource,
	descriptor,
}: QuickFormParams): void {
	const fetchInfo = resolveFetchInfo(descriptor);

	sourceFile.addFunction({
		name: quickFormName,
		isExported: true,
		parameters: [{ name: 'props', type: `${pascalName}FormProps` }],
		statements: (writer: CodeBlockWriter) => {
			writer.writeLine(
				'const { resource, runtime, editId, onClose, onRefresh } = props;'
			);
			writeTaxonomyHooks(writer, resource);
			writeStateHooks(writer);
			writeFieldsConfig(
				writer,
				resource,
				formInputType,
				entityType,
				pascalName
			);
			writeLoadEffect(writer, pascalName, entityType, fetchInfo);
			writeQuickFormReturn(writer);
		},
	});
}

function writeTaxonomyHooks(
	writer: CodeBlockWriter,
	resource: IRResource
): void {
	if (resource.storage?.mode !== 'wp-post') {
		return;
	}
	const { taxonomies } = resource.storage;
	if (!taxonomies) {
		return;
	}
	for (const [key, config] of Object.entries(taxonomies)) {
		const taxKey = (config as { taxonomy?: string }).taxonomy ?? key;
		const action = `${taxKey.replace(/_/g, '-')}.list`;
		const hookName = `${toCamelCase(taxKey)}Options`;
		writer.writeLine(
			`const ${hookName} = useTaxonomyOptions('${action}');`
		);
	}
}

function writeStateHooks(writer: CodeBlockWriter): void {
	writer.writeLine('const [isLoading, setIsLoading] = useState(false);');
	writer.writeLine(
		'const [error, setError] = useState<string | null>(null);'
	);
	writer.writeLine('const isEdit = editId !== null && editId !== undefined;');
}

function writeFieldsConfig(
	writer: CodeBlockWriter,
	resource: IRResource,
	formInputType: string,
	entityType: string,
	pascalName: string
): void {
	writer.writeLine('const fields = useMemo(() => [');
	writer.indent(() => {
		if (resource.storage?.mode !== 'wp-post') {
			return;
		}
		writeBaseFieldDefinitions(writer, resource.storage, formInputType);
	});
	writer.writeLine('], [');
	writeFieldDependencies(writer, resource);
	writer.writeLine(']);');
	writer.writeLine(
		"const { fields: formFields, form: formConfig } = useMemo(() => buildFormConfigFromFields(fields, { type: 'regular' }), [fields]);"
	);
	writer.writeLine('const form = formConfig as unknown as Form;');
	writer.writeLine(
		"const createAction = useMemo(() => buildMutationAction(resource.mutate, 'create'), [resource.mutate]);"
	);
	writer.writeLine(
		"const updateAction = useMemo(() => buildMutationAction(resource.mutate, 'update'), [resource.mutate]);"
	);
	writer.writeLine(
		`const { Form, submit, reset, setData, state } = useDataFormHelper<${entityType}, ${formInputType}, Record<string, unknown>>({`
	);
	writer.indent(() => {
		writer.writeLine(
			'resource, runtime, resourceName: resource.name, fields: formFields, form,'
		);
		writer.writeLine('action: isEdit ? updateAction : createAction,');
		writer.writeLine(
			`buildInput: (data) => ({ ...default${pascalName}Form, ...data, id: editId ?? undefined }),`
		);
		writer.writeLine('onSuccess: () => { onClose(); onRefresh(); },');
	});
	writer.writeLine('});');
	writer.writeLine(
		`useEffect(() => { setData({ ...default${pascalName}Form }); }, []);`
	);
}

function writeBaseFieldDefinitions(
	writer: CodeBlockWriter,
	storage: NonNullable<IRResource['storage']> & { mode: 'wp-post' },
	formInputType: string
): void {
	if (storage.supports?.includes('title')) {
		writer.writeLine(
			`textField<${formInputType}>('title', { label: 'Title', form: { required: true } }),`
		);
	}
	writer.writeLine(
		`statusField<${formInputType}>('status', [{ label: 'Publish', value: 'publish' }, { label: 'Draft', value: 'draft' }], { label: 'Status', form: { required: true } }),`
	);
	addMetaFieldDefinitions(writer, storage.meta, formInputType);
	addTaxonomyFieldDefinitions(writer, storage.taxonomies, formInputType);
}

function addMetaFieldDefinitions(
	writer: CodeBlockWriter,
	meta: Record<string, { type?: string }> | undefined,
	formInputType: string
): void {
	if (!meta) {
		return;
	}
	for (const [key, desc] of Object.entries(meta)) {
		const metaDesc = desc as { type?: string };
		const label = toTitleCase(key);
		const isNumber =
			metaDesc.type === 'number' || metaDesc.type === 'integer';
		const fieldWriter = isNumber ? 'numberField' : 'textField';
		const edit = isNumber ? 'integer' : 'text';
		writer.writeLine(
			`${fieldWriter}<${formInputType}>('${key}', { label: '${label}', edit: '${edit}' }),`
		);
	}
}

function addTaxonomyFieldDefinitions(
	writer: CodeBlockWriter,
	taxonomies: Record<string, { taxonomy?: string }> | undefined,
	formInputType: string
): void {
	if (!taxonomies) {
		return;
	}
	for (const [key, config] of Object.entries(taxonomies)) {
		const taxKey = (config as { taxonomy?: string }).taxonomy ?? key;
		const label = toTitleCase(taxKey);
		const hookName = `${toCamelCase(taxKey)}Options`;
		writer.writeLine(
			`selectField<${formInputType}>('${taxKey}', ${hookName}.options, { label: '${label}', edit: 'select' }),`
		);
	}
}

function writeFieldDependencies(
	writer: CodeBlockWriter,
	resource: IRResource
): void {
	if (resource.storage?.mode !== 'wp-post') {
		return;
	}
	const { taxonomies } = resource.storage;
	if (!taxonomies) {
		return;
	}
	for (const [key, config] of Object.entries(taxonomies)) {
		const taxKey = (config as { taxonomy?: string }).taxonomy ?? key;
		writer.writeLine(`${toCamelCase(taxKey)}Options.options,`);
	}
}

type FetchInfo = {
	namespace: string;
	pathSegment: string;
};

function resolveFetchInfo(descriptor: AppFormDescriptor): FetchInfo {
	const namespace = (descriptor.config?.namespace ?? '').replace(/\\/g, '/');
	const getPath = descriptor.config?.routes?.get?.path ?? '';
	const pathSegment = getPath.split('/').pop()?.replace(':id', '') ?? '';
	return { namespace, pathSegment };
}

function writeLoadEffect(
	writer: CodeBlockWriter,
	pascalName: string,
	entityType: string,
	fetchInfo: FetchInfo
): void {
	writer.writeLine('useEffect(() => {');
	writer.indent(() => {
		writer.writeLine('let aborted = false;');
		writer.writeLine('async function load() {');
		writer.indent(() => {
			writer.writeLine(
				`if (!isEdit || !editId) { setData({ ...default${pascalName}Form }); return; }`
			);
			writer.writeLine('try {');
			writer.indent(() => {
				writer.writeLine('setIsLoading(true); setError(null);');
				writer.writeLine(
					`const fetchPath = \`/${fetchInfo.namespace}/v1/${fetchInfo.pathSegment}\${editId}\`;`
				);
				writer.writeLine(
					`const { data } = await wpkFetch({ path: fetchPath, method: 'GET' }) as { data: Partial<${entityType}> };`
				);
				writer.writeLine('if (aborted) return;');
				writer.writeLine('const response = data;');
				writer.writeLine(
					`setData({ ...default${pascalName}Form, ...response, id: editId ?? response?.id } as Partial<${entityType}>);`
				);
			});
			writer.writeLine(
				'} catch (err) { if (!aborted) setError("Unable to load details."); } ' +
					'finally { if (!aborted) setIsLoading(false); }'
			);
		});
		writer.writeLine('}');
		writer.writeLine('void load();');
		writer.writeLine('return () => { aborted = true; };');
	});
	writer.writeLine('}, [editId, isEdit, setData]);');
}

function writeQuickFormReturn(writer: CodeBlockWriter): void {
	writer.writeLine('return (');
	writer.indent(() => {
		writer.writeLine(
			'<Modal title={isEdit ? "Edit" : "Create"} onRequestClose={onClose}>'
		);
		writer.indent(() => {
			writer.writeLine('<div className="wpk-quickform">');
			writer.indent(() => {
				writer.writeLine('{isLoading && <Spinner />}');
				writer.writeLine(
					'{error && <Notice status="error">{error}</Notice>}'
				);
				writer.writeLine('{Form}');
				writer.writeLine(
					'<div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>'
				);
				writer.writeLine(
					'<Button variant="primary" onClick={() => void submit()} disabled={state.status === "running" || isLoading}>Save</Button>'
				);
				writer.writeLine(
					'<Button variant="secondary" onClick={onClose}>Cancel</Button>'
				);
				writer.writeLine('</div>');
			});
			writer.writeLine('</div>');
		});
		writer.writeLine('</Modal>');
	});
	writer.writeLine(');');
}

function toTitleCase(value: string): string {
	return value
		.split(/[-_:]/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

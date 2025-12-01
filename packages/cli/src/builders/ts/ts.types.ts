import { createHelper } from '../../runtime';
import type { BuilderApplyOptions } from '../../runtime/types';
import type { IRResource } from '../../ir/publicTypes';
import { toPascalCase } from './metadata';
import type { ResourcePostMetaDescriptor } from '@wpkernel/core/resource';
import { IndentationText, Project, type InterfaceDeclaration } from 'ts-morph';
import path from 'node:path';

/**
 * Creates a builder helper for generating TypeScript type definitions from resource storage configuration.
 *
 * @category Builders
 */
export function createTsTypesBuilder() {
	return createHelper({
		key: 'builder.generate.ts.types',
		kind: 'builder',
		dependsOn: ['ir.resources.core', 'ir.schemas.core'],
		async apply(options: BuilderApplyOptions) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				return;
			}

			if (input.ir.resources.length === 0) {
				options.reporter.debug(
					'createTsTypesBuilder: no resources to process.'
				);
				return;
			}

			await processResources(options);
		},
	});
}

async function processResources(options: BuilderApplyOptions): Promise<void> {
	const { input, context, output, reporter } = options;
	const ir = input.ir;
	if (!ir) {
		return;
	}

	for (const resource of ir.resources ?? []) {
		const schemaPlan = ir.artifacts.schemas[resource.schemaKey ?? ''];
		const resourcePlan = ir.artifacts.resources[resource.id];
		if (!resourcePlan) {
			reporter.debug(
				'createTsTypesBuilder: missing resource plan; skipping.',
				{ resource: resource.name }
			);
			continue;
		}

		if (!resourceHasSchema(resource, input.ir.schemas)) {
			continue;
		}

		try {
			const ts = generateResourceType(resource);
			const outputPath =
				schemaPlan?.typeDefPath ??
				path.posix.join(
					ir.layout.resolve('ui.generated'),
					'types',
					`${resource.name}.d.ts`
				);

			await context.workspace.write(outputPath, ts, {
				ensureDir: true,
			});

			output.queueWrite({
				file: outputPath,
				contents: ts,
			});

			reporter.debug(
				`createTsTypesBuilder: generated types for ${resource.name}`,
				{
					path: outputPath,
				}
			);
		} catch (error) {
			reporter.warn(
				`createTsTypesBuilder: failed to generate types for ${resource.name}`,
				{
					error,
				}
			);
		}
	}
}

function resourceHasSchema(
	resource: IRResource,
	schemas: Array<{ key: string }>
): boolean {
	const directMatch = schemas.find((s) => s.key === resource.schemaKey);
	if (directMatch) {
		return true;
	}

	if (!resource.name) {
		return false;
	}

	return Boolean(schemas.find((s) => s.key === resource.name));
}

function generateResourceType(resource: IRResource): string {
	const pascalName = toPascalCase(resource.name);
	const storage = resource.storage;

	// Preserve existing behaviour: no storage → minimal empty interface, no Query
	if (!storage) {
		return `export interface ${pascalName} {}\n`;
	}

	const sourceFile = createTypeSourceFile(pascalName);
	const iface = buildResourceInterface(sourceFile, pascalName);
	addIdentityField(iface, resource);
	addStorageFields(storage, iface);
	addQueryInterface(sourceFile, pascalName, storage);

	return sourceFile.getFullText();
}

function createTypeSourceFile(pascalName: string) {
	const project = new Project({
		useInMemoryFileSystem: true,
		manipulationSettings: {
			indentationText: IndentationText.Tab,
		},
	});

	return project.createSourceFile(`${pascalName}.d.ts`, '', {
		overwrite: true,
	});
}

function buildResourceInterface(
	sourceFile: ReturnType<Project['createSourceFile']>,
	pascalName: string
) {
	return sourceFile.addInterface({
		name: pascalName,
		isExported: true,
		docs: [`${pascalName} Resource Type Definition`],
	});
}

function addIdentityField(
	iface: InterfaceDeclaration,
	resource: IRResource
): void {
	if (!resource.identity) {
		return;
	}

	const type = resource.identity.type === 'number' ? 'number' : 'string';
	iface.addProperty({
		name: resource.identity.param as string,
		type,
	});
}

function addStorageFields(
	storage: NonNullable<IRResource['storage']>,
	iface: InterfaceDeclaration
): void {
	if (storage.mode === 'wp-post') {
		addWpPostFields(iface, storage);
	}
	if (storage.mode === 'wp-taxonomy') {
		addWpTaxonomyFields(iface, storage);
	}
}

function addQueryInterface(
	sourceFile: ReturnType<Project['createSourceFile']>,
	pascalName: string,
	storage: NonNullable<IRResource['storage']>
): void {
	const queryIface = sourceFile.addInterface({
		name: `${pascalName}Query`,
		isExported: true,
	});

	queryIface.addProperty({
		name: 'page',
		hasQuestionToken: true,
		type: 'number',
	});
	queryIface.addProperty({
		name: 'per_page',
		hasQuestionToken: true,
		type: 'number',
	});
	queryIface.addProperty({
		name: 'search',
		hasQuestionToken: true,
		type: 'string',
	});
	queryIface.addProperty({
		name: 'orderby',
		hasQuestionToken: true,
		type: `keyof ${pascalName} | 'relevance'`,
	});
	queryIface.addProperty({
		name: 'order',
		hasQuestionToken: true,
		type: `'asc' | 'desc'`,
	});
	queryIface.addProperty({
		name: '_fields',
		hasQuestionToken: true,
		type: 'string',
	});

	if (storage.mode === 'wp-post') {
		addQueryMetaFilters(queryIface, storage.meta);
		addQueryTaxonomyFilters(queryIface, storage.taxonomies);
	}
}

function addQueryMetaFilters(
	queryIface: InterfaceDeclaration,
	meta?: Record<string, ResourcePostMetaDescriptor>
): void {
	if (!meta) {
		return;
	}

	queryIface.addJsDoc('Custom filters derived from meta.');

	for (const [key, descriptor] of Object.entries(meta)) {
		const type = metaTypeToScalar(descriptor);
		queryIface.addProperty({
			name: key,
			hasQuestionToken: true,
			type,
		});
	}
}

function addQueryTaxonomyFilters(
	queryIface: InterfaceDeclaration,
	taxonomies?: Record<string, { taxonomy?: string }>
): void {
	if (!taxonomies) {
		return;
	}

	for (const [key, config] of Object.entries(taxonomies)) {
		queryIface.addProperty({
			name: config?.taxonomy ?? key,
			hasQuestionToken: true,
			type: 'number | number[]',
		});
	}
}

function addWpPostFields(
	iface: InterfaceDeclaration,
	storage: NonNullable<IRResource['storage']> & { mode: 'wp-post' }
): void {
	addSupportedPostFields(iface, storage);
	addPostDates(iface);
	addPostStatus(iface, storage);
	addCorePostFields(iface);
	addPostTaxonomies(iface, storage.taxonomies);
	addPostMeta(iface, storage.meta);
}

function addWpTaxonomyFields(
	iface: InterfaceDeclaration,
	storage: NonNullable<IRResource['storage']> & { mode: 'wp-taxonomy' }
): void {
	iface.addProperty({ name: 'name', type: 'string' });
	iface.addProperty({ name: 'slug', type: 'string' });
	iface.addProperty({ name: 'description', type: 'string' });
	iface.addProperty({ name: 'count', type: 'number' });

	if (storage.hierarchical) {
		iface.addProperty({ name: 'parent', type: 'number' });
	}
}

function addSupportedPostFields(
	iface: InterfaceDeclaration,
	storage: NonNullable<IRResource['storage']> & { mode: 'wp-post' }
): void {
	if (storage.supports?.includes('title')) {
		iface.addProperty({
			name: 'title',
			type: 'string',
		});
	}
	if (storage.supports?.includes('editor')) {
		iface.addProperty({
			name: 'content',
			type: 'string',
		});
	}
	if (storage.supports?.includes('excerpt')) {
		iface.addProperty({
			name: 'excerpt',
			type: 'string',
		});
	}
}

function addPostDates(iface: InterfaceDeclaration): void {
	iface.addProperty({ name: 'date', type: 'string' });
	iface.addProperty({ name: 'date_gmt', type: 'string' });
	iface.addProperty({ name: 'modified', type: 'string' });
	iface.addProperty({ name: 'modified_gmt', type: 'string' });
}

function addPostStatus(
	iface: InterfaceDeclaration,
	storage: NonNullable<IRResource['storage']> & { mode: 'wp-post' }
): void {
	if (storage.statuses && storage.statuses.length > 0) {
		const statusUnion =
			storage.statuses.map((s) => `'${s}'`).join(' | ') +
			" | 'trash' | 'auto-draft'";
		iface.addProperty({
			name: 'status',
			type: statusUnion,
		});
		return;
	}

	iface.addProperty({
		name: 'status',
		type: 'string',
	});
}

function addCorePostFields(iface: InterfaceDeclaration): void {
	iface.addProperty({ name: 'slug', type: 'string' });
	iface.addProperty({ name: 'link', type: 'string' });
	iface.addProperty({ name: 'author', type: 'number' });
	iface.addProperty({ name: 'featured_media', type: 'number' });
}

function addPostTaxonomies(
	iface: InterfaceDeclaration,
	taxonomies?: Record<string, { taxonomy?: string }>
): void {
	if (!taxonomies) {
		return;
	}

	for (const [key, config] of Object.entries(taxonomies)) {
		iface.addProperty({
			name: config?.taxonomy ?? key,
			hasQuestionToken: true,
			type: 'number[]',
		});
	}
}

function addPostMeta(
	iface: InterfaceDeclaration,
	meta?: Record<string, ResourcePostMetaDescriptor>
): void {
	if (!meta) {
		return;
	}

	for (const [key, descriptor] of Object.entries(meta)) {
		const metaDesc = descriptor as ResourcePostMetaDescriptor;
		const baseType = metaTypeToScalar(metaDesc);
		const isSingle = metaDesc.single !== false;
		const propertyType = isSingle ? baseType : `${baseType}[]`;

		iface.addProperty({
			name: key,
			hasQuestionToken: true,
			type: propertyType,
		});
	}
}

function metaTypeToScalar(
	metaDesc: ResourcePostMetaDescriptor
): 'number' | 'boolean' | 'string' {
	if (metaDesc.type === 'number' || metaDesc.type === 'integer') {
		return 'number';
	}
	if (metaDesc.type === 'boolean') {
		return 'boolean';
	}
	return 'string';
}

import path from 'node:path';

import type { IRBlock, IRResource, IRSchema, IRv1 } from '../ir/publicTypes';
import { createBlockHash, createBlockId } from '../ir/shared/identity';

type DerivedBlockKind = 'js' | 'ssr';

/**
 * A generated resource block together with the JSON manifest produced for it.
 *
 * This represents a block that the builder will emit for a resource when the
 * resource is eligible for a JS-only block (for example resources with a GET
 * route or an admin dataview). The `block` contains IR metadata used to
 * materialise files and the `manifest` is the contents for the block.json file
 * that should be written into the block directory.
 *
 * @category AST Builders
 */
export interface DerivedResourceBlock {
	readonly block: IRBlock;
	readonly manifest: Record<string, unknown>;
	readonly kind: DerivedBlockKind;
}

/**
 * Derive block definitions and their manifests from the IR.
 *
 * Scans the IR's resources and returns an array of `DerivedResourceBlock` for
 * each resource that should have a generated JS-only block. Existing blocks
 * are skipped (so this is safe to run against a workspace that already has
 * some blocks). The returned manifest is a ready-to-write `block.json` shape
 * tailored to the resource (attributes, title, icon, etc.).
 *
 * @param    options                Builder input containing the IR and any pre-existing blocks
 * @param    options.ir
 * @param    options.existingBlocks
 * @returns An array of derived block descriptors and their block.json manifest
 * @category AST Builders
 */
export function deriveResourceBlocks(options: {
	readonly ir: IRv1;
	readonly existingBlocks: ReadonlyMap<string, IRBlock>;
}): readonly DerivedResourceBlock[] {
	const { ir, existingBlocks } = options;
	const generatedRoot = path.dirname(ir.php.outputDir);
	const derived: DerivedResourceBlock[] = [];

	for (const resource of ir.resources) {
		const desiredMode = resolveDeclaredBlockMode(resource);
		if (!shouldGenerateBlock(resource, desiredMode)) {
			continue;
		}

		const blockKind = determineBlockType(resource, desiredMode);

		const slug = toBlockSlug(resource.name).replace(/-/gu, '');
		const blockKey = `${ir.meta.namespace}/${slug}`;
		if (existingBlocks.has(blockKey)) {
			continue;
		}

		const directory = toPosixPath(path.join(generatedRoot, 'blocks', slug));
		const manifestSource = toPosixPath(path.join(directory, 'block.json'));
		const block: IRBlock = {
			id: createBlockId({
				key: blockKey,
				directory,
				manifestSource,
			}),
			key: blockKey,
			directory,
			hasRender: blockKind === 'ssr',
			manifestSource,
			hash: createBlockHash({
				key: blockKey,
				directory,
				hasRender: blockKind === 'ssr',
				manifestSource,
			}),
		};
		const manifest = createBlockManifest({
			ir,
			blockKey,
			schemaKey: resource.schemaKey,
			title: toTitleCase(resource.name),
			kind: blockKind,
		});

		derived.push({ block, manifest, kind: blockKind });
	}

	return derived;
}

function resolveDeclaredBlockMode(
	resource: IRResource
): DerivedBlockKind | undefined {
	const mode = resource.blocks?.mode;
	if (mode === 'ssr' || mode === 'js') {
		return mode;
	}

	return undefined;
}

function shouldGenerateBlock(
	_declaredResource: IRResource,
	declaredMode?: DerivedBlockKind
): boolean {
	return Boolean(declaredMode);
}

function determineBlockType(
	_declaredResource: IRResource,
	declaredMode?: DerivedBlockKind
): DerivedBlockKind {
	return declaredMode ?? 'js';
}

function createBlockManifest(options: {
	readonly ir: IRv1;
	readonly blockKey: string;
	readonly schemaKey?: string;
	readonly title?: string;
	readonly kind: DerivedBlockKind;
}): Record<string, unknown> {
	const { ir, blockKey, kind, schemaKey, title: providedTitle } = options;
	const schema = schemaKey ? findSchema(ir.schemas, schemaKey) : undefined;
	const attributes = deriveAttributes(schema);
	const title =
		providedTitle ?? toTitleCase(blockKey.split('/').at(-1) ?? '');

	const manifest: Record<string, unknown> = {
		$schema: 'https://schemas.wp.org/trunk/block.json',
		apiVersion: 3,
		name: blockKey,
		title,
		description: `${title} block generated from project config`,
		category: 'widgets',
		icon: 'database',
		textdomain: ir.meta.namespace,
		keywords: [title],
		supports: {
			align: ['wide', 'full'],
			color: {
				background: true,
				text: true,
			},
			spacing: {
				margin: true,
				padding: true,
			},
			typography: {
				fontSize: true,
				lineHeight: true,
			},
		},
		editorScriptModule: 'file:./index.tsx',
		viewScriptModule: 'file:./view.ts',
	};

	if (attributes) {
		manifest.attributes = attributes;
	}

	if (kind === 'ssr') {
		manifest.render = 'file:./render.php';
	}

	return manifest;
}

function findSchema(
	schemas: readonly IRSchema[],
	key: string
): IRSchema | undefined {
	return schemas.find((candidate) => candidate.key === key);
}

function deriveAttributes(
	schema: IRSchema | undefined
): Record<string, unknown> | undefined {
	const properties = getSchemaProperties(schema);
	if (!properties) {
		return undefined;
	}

	const entries = Object.entries(properties)
		.map(([name, descriptor]) => deriveAttributeEntry(name, descriptor))
		.filter((entry): entry is [string, Record<string, unknown>] =>
			Boolean(entry)
		);

	return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function deriveAttribute(
	descriptor: Record<string, unknown>
): Record<string, unknown> | undefined {
	const attribute: Record<string, unknown> = {};

	applySchemaType(attribute, descriptor.type);
	applySchemaEnum(attribute, descriptor.enum);

	assignIfDefined(attribute, 'default', descriptor.default);
	assignIfString(attribute, 'description', descriptor.description);

	return Object.keys(attribute).length > 0 ? attribute : undefined;
}

function deriveAttributeEntry(
	name: string,
	descriptor: unknown
): [string, Record<string, unknown>] | undefined {
	if (!isRecord(descriptor)) {
		return undefined;
	}

	const attribute = deriveAttribute(descriptor);
	return attribute ? [name, attribute] : undefined;
}

function inferTypeFromEnum(values: unknown[]): string | undefined {
	const types = new Set(values.map((value) => typeof value));
	if (types.size !== 1) {
		return undefined;
	}

	const [type] = Array.from(types);
	switch (type) {
		case 'string':
			return 'string';
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		default:
			return undefined;
	}
}

function mapSchemaType(type: string): string | undefined {
	switch (type) {
		case 'string':
		case 'boolean':
		case 'object':
		case 'array':
		case 'number':
		case 'integer':
		case 'null':
			return type;
		default:
			return undefined;
	}
}

function getSchemaProperties(
	schema: IRSchema | undefined
): Record<string, unknown> | undefined {
	if (!schema) {
		return undefined;
	}

	const definition = schema.schema;
	if (!isRecord(definition)) {
		return undefined;
	}

	if ((definition as Record<string, unknown>).type !== 'object') {
		return undefined;
	}

	const properties = (definition as Record<string, unknown>).properties;
	return isRecord(properties) ? properties : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function applySchemaType(
	attribute: Record<string, unknown>,
	typeValue: unknown
): void {
	if (typeof typeValue === 'string') {
		const mapped = mapSchemaType(typeValue);
		if (mapped) {
			attribute.type = mapped;
		}
		return;
	}

	if (!Array.isArray(typeValue)) {
		return;
	}

	const mapped = typeValue
		.map((value) =>
			typeof value === 'string' ? mapSchemaType(value) : undefined
		)
		.filter(Boolean);

	if (mapped.length > 0) {
		attribute.type = mapped;
	}
}

function applySchemaEnum(
	attribute: Record<string, unknown>,
	enumValue: unknown
): void {
	if (!Array.isArray(enumValue) || enumValue.length === 0) {
		return;
	}

	attribute.enum = enumValue;
	if (!attribute.type) {
		const inferred = inferTypeFromEnum(enumValue);
		if (inferred) {
			attribute.type = inferred;
		}
	}
}

function assignIfDefined(
	target: Record<string, unknown>,
	key: string,
	value: unknown
): void {
	if (typeof value !== 'undefined') {
		target[key] = value;
	}
}

function assignIfString(
	target: Record<string, unknown>,
	key: string,
	value: unknown
): void {
	if (typeof value === 'string') {
		target[key] = value;
	}
}

function toBlockSlug(name: string): string {
	return name
		.split(/[^A-Za-z0-9]+/u)
		.filter(Boolean)
		.map((segment) => segment.toLowerCase())
		.join('-');
}

function toTitleCase(value: string): string {
	const segments = value
		.split(/[^A-Za-z0-9]+/u)
		.filter(Boolean)
		.map((segment) => segment.toLowerCase());

	if (segments.length === 0) {
		return 'Resource';
	}

	return segments
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function toPosixPath(candidate: string): string {
	return candidate.split(path.sep).join('/');
}

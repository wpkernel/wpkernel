import { sanitizeJson } from '../../utils';
import type { IRResource, IRSchema } from '../../ir/publicTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Builds WordPress REST API argument definitions from resource schema.
 *
 * Transforms JSON Schema property definitions into WordPress REST API argument
 * format, including validation rules, required flags, and identity metadata.
 * Handles query parameters and merges them with schema-defined properties.
 *
 * @param    schemas  - Array of IR schemas containing JSON Schema definitions
 * @param    resource - IR resource definition with schema key and query params
 * @returns WordPress REST API argument object with schema, required, and identity metadata
 * @category AST Builders
 */
export function buildRestArgs(
	schemas: readonly IRSchema[],
	resource: IRResource
): Record<string, unknown> {
	const schema = schemas.find((entry) => entry.key === resource.schemaKey);
	if (!schema) {
		return {};
	}

	const schemaValue = schema.schema;
	if (!isRecord(schemaValue)) {
		return {};
	}

	const required = new Set(
		Array.isArray(schemaValue.required)
			? (schemaValue.required as string[])
			: []
	);

	const properties = isRecord(schemaValue.properties)
		? (schemaValue.properties as Record<string, unknown>)
		: {};

	const restArgs: Record<string, unknown> = {};
	for (const [key, descriptor] of Object.entries(properties)) {
		const payload: Record<string, unknown> = {
			schema: sanitizeJson(descriptor),
		};

		if (required.has(key)) {
			payload.required = true;
		}

		if (resource.identity?.param === key) {
			payload.identity = resource.identity;
		}

		restArgs[key] = payload;
	}

	if (resource.queryParams) {
		applyQueryParams(restArgs, resource.queryParams);
	}

	return restArgs;
}

function applyQueryParams(
	restArgs: Record<string, unknown>,
	queryParams: NonNullable<IRResource['queryParams']>
): void {
	const entries = Object.entries(queryParams) as Array<
		[string, NonNullable<IRResource['queryParams']>[string]]
	>;

	for (const [param, descriptor] of entries) {
		const existing = isRecord(restArgs[param])
			? { ...(restArgs[param] as Record<string, unknown>) }
			: {};

		const schemaPayload = isRecord(existing.schema)
			? { ...(existing.schema as Record<string, unknown>) }
			: {};

		if (descriptor.type === 'enum') {
			schemaPayload.type = 'string';
			if (descriptor.enum) {
				schemaPayload.enum = Array.from(descriptor.enum);
			}
		} else {
			schemaPayload.type = descriptor.type;
		}

		if (descriptor.description) {
			existing.description = descriptor.description;
		}

		if (descriptor.optional === false) {
			existing.required = true;
		}

		existing.schema = sanitizeJson(schemaPayload);
		restArgs[param] = sanitizeJson(existing);
	}
}

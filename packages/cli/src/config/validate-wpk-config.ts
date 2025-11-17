/**
 * Kernel Config Validator
 *
 * Validates `wpk.config.ts` structure and enforces framework contracts
 * before code generation. This is the first line of defense against invalid
 * configurations, catching issues at load time rather than runtime.
 *
 * **Validation Layers:**
 * 1. **Type Structure** - Typanion validators ensure config matches WPKernelConfigV1 shape
 * 2. **Namespace Sanitization** - Ensures namespace is valid and WordPress-safe
 * 3. **Resource Integrity** - Validates routes, identity params, storage modes
 * 4. **Security Checks** - Warns about missing capabilities on write operations
 *
 * **Framework Contracts Enforced:**
 * - Each resource must have at least one route operation
 * - Identity parameters must appear in route paths
 * - Routes must have unique method+path combinations
 * - wp-post storage should specify postType
 * - Write methods (POST/PUT/PATCH/DELETE) should have capabilities
 *
 * @module config/validate-kernel-config
 * @see {@link https://github.com/wpkernel/wpkernel/blob/main/docs/internal/cli-migration-phases.md#runtime}
 */

import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceConfig } from '@wpkernel/core/resource';
import { sanitizeNamespace } from '@wpkernel/core/namespace';
import { WPKernelError } from '@wpkernel/core/error';
import * as t from 'typanion';
import type { WPKernelConfigV1, WPKernelConfigVersion } from './types';

interface ValidateWPKernelConfigOptions {
	reporter: Reporter;
	sourcePath: string;
	origin: string;
}

interface ValidateWPKernelConfigResult {
	config: WPKernelConfigV1;
	namespace: string;
}

type WPKernelConfigCandidate = Omit<
	WPKernelConfigV1,
	'version' | 'namespace'
> & {
	version?: WPKernelConfigVersion;
	namespace: string;
};

const httpMethodValidator = t.isEnum([
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
] as const);

const functionValidator = t.makeValidator<
	unknown,
	(...args: unknown[]) => unknown
>({
	test: (value): value is (...args: unknown[]) => unknown =>
		typeof value === 'function',
});

const nonEmptyStringValidator = t.makeValidator<unknown, string>({
	test: (value): value is string =>
		typeof value === 'string' && value.trim().length > 0,
});

const resourceRouteValidator = t.isObject(
	{
		path: t.isString(),
		method: httpMethodValidator,
		capability: t.isOptional(t.isString()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

/**
 * Typanion validator for resource routes.
 *
 * Ensures that a resource defines at least one route operation (list, get, create, update, or remove).
 *
 * @category Config
 */
export const resourceRoutesValidator = t.cascade(
	t.isObject(
		{
			list: t.isOptional(resourceRouteValidator),
			get: t.isOptional(resourceRouteValidator),
			create: t.isOptional(resourceRouteValidator),
			update: t.isOptional(resourceRouteValidator),
			remove: t.isOptional(resourceRouteValidator),
		},
		{ extra: t.isRecord(t.isUnknown()) }
	),
	(value, state) => {
		const hasRoute = Object.values(value).some(
			(route) => typeof route !== 'undefined'
		);
		if (!hasRoute) {
			state?.errors?.push(
				'resources[].routes must define at least one operation.'
			);
			return false;
		}
		return true;
	}
);

const identityNumberValidator = t.isObject(
	{
		type: t.isLiteral('number'),
		param: t.isOptional(t.isLiteral('id')),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const identityStringValidator = t.isObject(
	{
		type: t.isLiteral('string'),
		param: t.isOptional(t.isEnum(['id', 'slug', 'uuid'] as const)),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceIdentityValidator = t.isOptional(
	t.isOneOf([identityNumberValidator, identityStringValidator])
);

const storageTransientValidator = t.isObject(
	{
		mode: t.isLiteral('transient'),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storagePostMetaValidator = t.isObject(
	{
		type: t.isEnum([
			'string',
			'integer',
			'number',
			'boolean',
			'array',
			'object',
		] as const),
		single: t.isOptional(t.isBoolean()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storagePostTaxonomyValidator = t.isObject(
	{
		taxonomy: t.isString(),
		hierarchical: t.isOptional(t.isBoolean()),
		register: t.isOptional(t.isBoolean()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storagePostValidator = t.isObject(
	{
		mode: t.isLiteral('wp-post'),
		postType: t.isOptional(t.isString()),
		statuses: t.isOptional(t.isArray(t.isString())),
		supports: t.isOptional(
			t.isArray(
				t.isEnum([
					'title',
					'editor',
					'excerpt',
					'custom-fields',
				] as const)
			)
		),
		meta: t.isOptional(t.isRecord(storagePostMetaValidator)),
		taxonomies: t.isOptional(t.isRecord(storagePostTaxonomyValidator)),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storageTaxonomyValidator = t.isObject(
	{
		mode: t.isLiteral('wp-taxonomy'),
		taxonomy: t.isString(),
		hierarchical: t.isOptional(t.isBoolean()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storageOptionValidator = t.isObject(
	{
		mode: t.isLiteral('wp-option'),
		option: t.isString(),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceStorageValidator = t.isOptional(
	t.isOneOf([
		storageTransientValidator,
		storagePostValidator,
		storageTaxonomyValidator,
		storageOptionValidator,
	])
);

const schemaConfigValidator = t.isObject(
	{
		path: t.isString(),
		generated: t.isObject(
			{
				types: t.isString(),
			},
			{ extra: t.isRecord(t.isUnknown()) }
		),
		description: t.isOptional(t.isString()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const adaptersValidator = t.isObject(
	{
		php: t.isOptional(
			t.makeValidator<unknown, (...args: unknown[]) => unknown>({
				test: (value): value is (...args: unknown[]) => unknown =>
					typeof value === 'function',
			})
		),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const readinessConfigValidator = t.isObject(
	{
		helpers: t.isOptional(t.isArray(functionValidator)),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceDataViewsMenuValidator = t.isObject(
	{
		slug: t.isString(),
		title: t.isString(),
		capability: t.isOptional(t.isString()),
		parent: t.isOptional(t.isString()),
		position: t.isOptional(t.isNumber()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceDataViewsScreenValidator = t.isObject(
	{
		component: t.isOptional(t.isString()),
		route: t.isOptional(t.isString()),
		resourceImport: t.isOptional(t.isString()),
		resourceSymbol: t.isOptional(t.isString()),
		wpkernelImport: t.isOptional(t.isString()),
		wpkernelSymbol: t.isOptional(t.isString()),
		menu: t.isOptional(resourceDataViewsMenuValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceDataViewsSavedViewValidator = t.isObject(
	{
		id: nonEmptyStringValidator,
		label: nonEmptyStringValidator,
		view: t.isRecord(t.isUnknown()),
		description: t.isOptional(nonEmptyStringValidator),
		isDefault: t.isOptional(t.isBoolean()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceDataViewsConfigValidator = t.isObject(
	{
		fields: t.isOptional(t.isArray(t.isRecord(t.isUnknown()))),
		defaultView: t.isOptional(t.isRecord(t.isUnknown())),
		actions: t.isOptional(t.isArray(t.isRecord(t.isUnknown()))),
		search: t.isOptional(t.isBoolean()),
		searchLabel: t.isOptional(t.isString()),
		empty: t.isOptional(t.isUnknown()),
		perPageSizes: t.isOptional(t.isArray(t.isNumber())),
		defaultLayouts: t.isOptional(t.isRecord(t.isUnknown())),
		views: t.isOptional(t.isArray(resourceDataViewsSavedViewValidator)),
		preferencesKey: t.isOptional(nonEmptyStringValidator),
		screen: t.isOptional(resourceDataViewsScreenValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceAdminUIValidator = t.isObject(
	{
		view: t.isOptional(t.isString()),
		dataviews: t.isOptional(resourceDataViewsConfigValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceUIValidator = t.isObject(
	{
		admin: t.isOptional(resourceAdminUIValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceBlocksConfigValidator = t.isObject(
	{
		mode: t.isOptional(t.isOneOf([t.isLiteral('js'), t.isLiteral('ssr')])),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceConfigValidator = t.isObject(
	{
		name: t.isString(),
		routes: resourceRoutesValidator,
		identity: resourceIdentityValidator,
		storage: resourceStorageValidator,
		queryParams: t.isOptional(t.isRecord(t.isUnknown())),
		namespace: t.isOptional(t.isString()),
		schema: t.isOptional(
			t.isOneOf([t.isString(), t.isRecord(t.isUnknown())])
		),
		ui: t.isOptional(resourceUIValidator),
		blocks: t.isOptional(resourceBlocksConfigValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const wpkConfigValidator = t.isObject(
	{
		version: t.isOptional(t.isLiteral(1)),
		namespace: t.isString(),
		directories: t.isOptional(
			t.isRecord(t.isString(), { keys: t.isString() })
		),
		schemas: t.isRecord(schemaConfigValidator),
		resources: t.isRecord(resourceConfigValidator),
		adapters: t.isOptional(adaptersValidator),
		readiness: t.isOptional(readinessConfigValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

/**
 * Validate a wpk configuration object against the framework's contracts.
 *
 * This is the primary validation entry point called by the config loader.
 * It performs multi-layered validation to catch configuration errors before
 * they reach code generation or runtime.
 *
 * Validation Steps:
 * 1. Type structure validation (Typanion schemas)
 * 2. Namespace sanitization and validation
 * 3. Version normalization (defaults to 1 if missing)
 * 4. Per-resource integrity checks (routes, identity, storage, capabilities)
 *
 * Error Handling:
 * - Structural errors throw immediately with formatted error messages
 * - Invalid namespaces throw (must be lowercase kebab-case)
 * - Resource contract violations throw with context
 * - Missing capabilities warn (security hint, not blocking)
 * - Missing postType warns (will be auto-generated)
 *
 * @param rawConfig - Unvalidated config object from loader
 * @param options   - Validation context (reporter, paths, origin)
 * @return Validated config with sanitized namespace
 * @throws When validation fails or namespace is invalid
 * @example
 * ```ts
 * const { config, namespace } = validateWPKernelConfig(rawConfig, {
 *   reporter: createReporter({ namespace: 'cli' }),
 *   sourcePath: '/app/wpk.config.ts',
 *   origin: 'wpk.config.ts'
 * });
 * ```
 */
export function validateWPKernelConfig(
	rawConfig: unknown,
	options: ValidateWPKernelConfigOptions
): ValidateWPKernelConfigResult {
	const validationReporter = options.reporter.child('validation');

	const validation = t.as(rawConfig, wpkConfigValidator, { errors: true });
	if (validation.errors) {
		const validationErrorList = Array.isArray(validation.errors)
			? validation.errors
			: undefined;
		const message = formatValidationErrors(
			validationErrorList ?? [],
			options.sourcePath,
			options.origin
		);
		validationReporter.error(message, {
			errors: validationErrorList,
			sourcePath: options.sourcePath,
			origin: options.origin,
		});
		throw new WPKernelError('ValidationError', {
			message,
			context: {
				sourcePath: options.sourcePath,
				origin: options.origin,
			},
		});
	}

	const candidate = validation.value as WPKernelConfigCandidate;
	const version = normalizeVersion(
		candidate.version,
		validationReporter,
		options.sourcePath
	);

	const sanitizedNamespace = sanitizeNamespace(candidate.namespace);
	if (!sanitizedNamespace) {
		const message = `Invalid namespace "${candidate.namespace}" in ${options.sourcePath}. Namespaces must be lowercase kebab-case and avoid reserved words.`;
		validationReporter.error(message, {
			namespace: candidate.namespace,
			sourcePath: options.sourcePath,
		});
		throw new WPKernelError('ValidationError', {
			message,
			context: {
				sourcePath: options.sourcePath,
				origin: options.origin,
			},
		});
	}

	if (sanitizedNamespace !== candidate.namespace) {
		validationReporter.warn(
			`Namespace "${candidate.namespace}" sanitised to "${sanitizedNamespace}" for CLI usage.`,
			{
				original: candidate.namespace,
				sanitized: sanitizedNamespace,
			}
		);
	}

	for (const [resourceName, resource] of Object.entries(
		candidate.resources
	)) {
		runResourceChecks(
			resourceName,
			resource as ResourceConfig,
			validationReporter
		);
	}

	const config: WPKernelConfigV1 = {
		...candidate,
		version,
		namespace: sanitizedNamespace,
	} as WPKernelConfigV1;

	return {
		config,
		namespace: sanitizedNamespace,
	};
}

/**
 * Normalizes and validates the configuration version.
 *
 * If the version is undefined, it defaults to 1 and issues a warning.
 * If the version is not 1, it throws a `WPKernelError`.
 *
 * @category Config
 * @param    version    - The version specified in the configuration, or `undefined`.
 * @param    reporter   - A reporter instance for logging messages.
 * @param    sourcePath - The path to the configuration file.
 * @returns The normalized and validated configuration version (always 1).
 * @throws `WPKernelError` if an unsupported version is encountered.
 */
export function normalizeVersion(
	version: WPKernelConfigVersion | undefined,
	reporter: Reporter,
	sourcePath: string
): WPKernelConfigVersion {
	if (typeof version === 'undefined') {
		reporter.warn(
			`Kernel config at ${sourcePath} is missing "version". Defaulting to 1. Add \`version: 1\` to opt into CLI tooling guarantees.`,
			{ sourcePath }
		);
		return 1;
	}

	if (version !== 1) {
		const message = `Unsupported wpk config version ${String(version)} in ${sourcePath}. Only version 1 is supported.`;
		reporter.error(message, { sourcePath, version });
		throw new WPKernelError('ValidationError', {
			message,
			context: {
				sourcePath,
				version,
			},
		});
	}

	return version;
}

/**
 * Run resource-level validation checks.
 *
 * Enforces framework contracts on individual resources:
 * - Identity parameters must appear in route paths
 * - Routes must have unique method+path combinations
 * - Write routes should have capabilities (warns if missing)
 * - wp-post storage should specify postType (warns if missing)
 *
 * @param resourceName - Resource identifier for error messages
 * @param resource     - Resource configuration to validate
 * @param reporter     - Reporter for errors and warnings
 * @throws When identity params are missing from routes or routes are duplicated
 */
/**
 * Run resource-level validation checks.
 *
 * Enforces framework contracts on individual resources:
 * - Identity parameters must appear in route paths
 * - Routes must have unique method+path combinations
 * - Write routes should have capabilities (warns if missing)
 * - wp-post storage should specify postType (warns if missing)
 *
 * @category Config
 * @param    resourceName - Resource identifier for error messages
 * @param    resource     - Resource configuration to validate
 * @param    reporter     - Reporter for errors and warnings
 * @throws When identity params are missing from routes or routes are duplicated
 */
export function runResourceChecks(
	resourceName: string,
	resource: ResourceConfig,
	reporter: Reporter
): void {
	assertNoExecutableFields(resourceName, resource, reporter);

	const routes = Object.entries(resource.routes)
		.filter(([, route]) => typeof route !== 'undefined')
		.map(([key, route]) => ({ key, ...route! }));

	validateIdentityParameter(
		resourceName,
		resource.identity,
		routes,
		reporter
	);
	validateUniqueRoutes(resourceName, routes, reporter);
	validateWriteCapabilities(resourceName, routes, reporter);
	validateStorageMode(resourceName, resource.storage, reporter);
}

function validateIdentityParameter(
	resourceName: string,
	identity: ResourceConfig['identity'],
	routes: Array<{
		key: string;
		path: string;
		method: string;
		capability?: string;
	}>,
	reporter: Reporter
): void {
	if (!identity) {
		return;
	}

	if (routes.length === 0) {
		reporter.warn(
			`Resource "${resourceName}" defines identity metadata but no routes. Identity inference will be skipped.`,
			{ resourceName }
		);
		return;
	}

	const expectedParam = identity.param ?? 'id';
	const hasMatchingParam = routes.some((route) =>
		route.path.includes(`:${expectedParam}`)
	);

	if (!hasMatchingParam) {
		const message = `Identity param ":${expectedParam}" for resource "${resourceName}" is not present in any configured route.`;
		reporter.error(message, {
			resourceName,
			identity,
			routes,
		});
		throw new WPKernelError('ValidationError', {
			message,
			context: {
				resourceName,
				param: expectedParam,
			},
		});
	}
}

function validateUniqueRoutes(
	resourceName: string,
	routes: Array<{
		key: string;
		path: string;
		method: string;
		capability?: string;
	}>,
	reporter: Reporter
): void {
	const routeSignatures = new Map<string, string>();

	for (const route of routes) {
		const signature = `${route.method.toUpperCase()} ${route.path}`;
		const existing = routeSignatures.get(signature);

		if (existing) {
			const message = `Resource "${resourceName}" has duplicate route: ${signature}. Routes must have unique method+path combinations.`;
			reporter.error(message, {
				resourceName,
				method: route.method,
				path: route.path,
			});
			throw new WPKernelError('ValidationError', {
				message,
				context: {
					resourceName,
					route: signature,
				},
			});
		}

		routeSignatures.set(signature, route.key);
	}
}

function validateWriteCapabilities(
	resourceName: string,
	routes: Array<{
		key: string;
		path: string;
		method: string;
		capability?: string;
	}>,
	reporter: Reporter
): void {
	const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

	for (const route of routes) {
		if (
			WRITE_METHODS.includes(route.method.toUpperCase()) &&
			!route.capability
		) {
			reporter.warn(
				`Resource "${resourceName}" route ${route.key} (${route.method} ${route.path}) uses a write method but has no capability defined. This endpoint will be publicly accessible.`,
				{
					resourceName,
					routeKey: route.key,
					method: route.method,
					path: route.path,
				}
			);
		}
	}
}

function validateStorageMode(
	resourceName: string,
	storage: ResourceConfig['storage'],
	reporter: Reporter
): void {
	if (storage?.mode === 'wp-post' && !storage.postType) {
		reporter.warn(
			`Resource "${resourceName}" uses wp-post storage without specifying "postType". Generators will derive a default from the namespace.`,
			{ resourceName }
		);
	}
}

function assertNoExecutableFields(
	resourceName: string,
	resource: ResourceConfig,
	reporter: Reporter
): void {
	const store = resource.store;
	const dataviews = resource.ui?.admin?.dataviews;
	const executableChecks: Array<{
		condition: boolean;
		field: string;
		message: string;
	}> = [
		{
			condition: typeof resource.cacheKeys !== 'undefined',
			field: 'cacheKeys',
			message:
				'Resource cache keys are fully derived by the CLI. Remove custom cacheKeys declarations to keep wpk.config.ts declarative.',
		},
		{
			condition: typeof store?.getId !== 'undefined',
			field: 'store.getId',
			message:
				'Resource stores no longer accept executable getId overrides. Provide declarative metadata instead.',
		},
		{
			condition: typeof store?.getQueryKey !== 'undefined',
			field: 'store.getQueryKey',
			message:
				'Resource stores no longer accept executable getQueryKey overrides.',
		},
		{
			condition: typeof resource.reporter !== 'undefined',
			field: 'reporter',
			message:
				'Custom reporters cannot be declared in wpk.config.ts. Define runtime reporters alongside your resource code.',
		},
		{
			condition: typeof resource.schema === 'function',
			field: 'schema',
			message:
				'Resource schemas must reference a shared key or inline JSON object. Functions and dynamic imports are not supported.',
		},
		{
			condition: typeof dataviews?.mapQuery !== 'undefined',
			field: 'ui.admin.dataviews.mapQuery',
			message:
				'DataViews config must be declarative. Remove mapQuery functions from wpk.config.ts.',
		},
		{
			condition: typeof dataviews?.getItemId !== 'undefined',
			field: 'ui.admin.dataviews.getItemId',
			message:
				'DataViews config must be declarative. Remove getItemId functions from wpk.config.ts.',
		},
	];

	for (const check of executableChecks) {
		if (check.condition) {
			throwExecutableFieldError(
				resourceName,
				check.field,
				check.message,
				reporter
			);
		}
	}
}

function throwExecutableFieldError(
	resourceName: string,
	field: string,
	message: string,
	reporter: Reporter
): never {
	reporter.error(message, { resourceName, field });
	throw new WPKernelError('ValidationError', {
		message,
		context: {
			resourceName,
			field,
		},
	});
}

/**
 * Formats a list of validation errors into a human-readable string.
 *
 * @category Config
 * @param    errors     - An array of error messages from the validation process.
 * @param    sourcePath - The path to the configuration file where the errors occurred.
 * @param    origin     - The origin of the configuration (e.g., 'wpk.config.ts').
 * @returns A formatted string detailing the validation errors.
 */
export function formatValidationErrors(
	errors: string[] | undefined,
	sourcePath: string,
	origin: string
): string {
	if (!errors || errors.length === 0) {
		return `Invalid wpk config discovered in ${sourcePath} (${origin}).`;
	}

	const formatted = errors.map((error) => ` - ${error}`).join('\n');
	return `Invalid wpk config discovered in ${sourcePath} (${origin}):\n${formatted}`;
}

import { isPromiseLike } from './async-utils.js';
import type {
	MaybePromise,
	PipelineExtension,
	PipelineExtensionHook,
	PipelineExtensionHookRegistration,
	PipelineExtensionLifecycle,
} from './types.js';

interface CreatePipelineExtensionBaseOptions {
	readonly key?: string;
}

/**
 * Options for creating a pipeline extension using the dynamic register pattern.
 *
 * @category Pipeline
 * @public
 */
export interface CreatePipelineExtensionWithRegister<
	TPipeline,
	TContext,
	TOptions,
	TArtifact,
> extends CreatePipelineExtensionBaseOptions {
	readonly register: (
		pipeline: TPipeline
	) => MaybePromise<
		| void
		| PipelineExtensionHook<TContext, TOptions, TArtifact>
		| PipelineExtensionHookRegistration<TContext, TOptions, TArtifact>
	>;
}

interface CreatePipelineExtensionWithSetup<
	TPipeline,
	TContext,
	TOptions,
	TArtifact,
> extends CreatePipelineExtensionBaseOptions {
	readonly setup?: (pipeline: TPipeline) => MaybePromise<void>;
	readonly hook?:
		| PipelineExtensionHook<TContext, TOptions, TArtifact>
		| PipelineExtensionHookRegistration<TContext, TOptions, TArtifact>;
	readonly lifecycle?: PipelineExtensionLifecycle;
}

export type CreatePipelineExtensionOptions<
	TPipeline,
	TContext,
	TOptions,
	TArtifact,
> =
	| CreatePipelineExtensionWithRegister<
			TPipeline,
			TContext,
			TOptions,
			TArtifact
	  >
	| CreatePipelineExtensionWithSetup<
			TPipeline,
			TContext,
			TOptions,
			TArtifact
	  >;

/**
 * Creates a pipeline extension with optional setup and hook registration helpers.
 *
 * Extensions enable pluggable behavior at key pipeline lifecycle points: pre-run validation,
 * post-fragment AST inspection, post-builder artifact transformation, and pre-commit verification.
 * They support both synchronous and asynchronous workflows with automatic commit/rollback.
 *
 * ## Use Cases
 *
 * - **Validation**: Pre-run checks for environment requirements, configuration consistency
 * - **Artifact transformation**: Post-build minification, formatting, type checking
 * - **Integration**: Third-party tool orchestration (ESLint, Prettier, bundlers)
 * - **Conditional execution**: Feature flags, environment-specific logic
 * - **Audit trails**: Logging, telemetry, compliance tracking
 *
 * ## Patterns
 *
 * ### Register Pattern (Dynamic Hook Resolution)
 * Use when hook logic depends on pipeline state discovered during registration:
 * ```ts
 * createPipelineExtension({
 *   key: 'acme.conditional-minify',
 *   register(pipeline) {
 *     const shouldMinify = pipeline.context.env === 'production';
 *     if (!shouldMinify) return; // No hook registered
 *
 *     return ({ artifact }) => ({
 *       artifact: minify(artifact),
 *     });
 *   },
 * });
 * ```
 *
 * ### Setup + Hook Pattern (Static Configuration)
 * Use for upfront helper registration with decoupled hook logic:
 * ```ts
 * createPipelineExtension({
 *   key: 'acme.audit-logger',
 *   setup(pipeline) {
 *     // Register audit builder that collects metadata
 *     pipeline.builders.use(createAuditBuilder());
 *   },
 *   hook({ artifact }) {
 *     // Transform artifact with audit annotations
 *     return {
 *       artifact: {
 *         ...artifact,
 *         meta: { ...artifact.meta, audited: true, timestamp: Date.now() },
 *       },
 *     };
 *   },
 * });
 * ```
 *
 * ### Async Setup with Rollback
 * ```ts
 * createPipelineExtension({
 *   key: 'acme.remote-validator',
 *   async register(pipeline) {
 *     // Async setup (e.g., fetch remote schema)
 *     const schema = await fetchValidationSchema();
 *
 *     return ({ artifact }) => {
 *       const valid = validateAgainstSchema(artifact, schema);
 *       if (!valid) {
 *         throw new Error('Artifact validation failed');
 *       }
 *       return { artifact };
 *     };
 *   },
 * });
 * ```
 *
 * ## Commit/Rollback Protocol
 *
 * Extensions can return a `commit` function to perform side effects (file writes, API calls)
 * and a `rollback` function to undo those effects on pipeline failure:
 * ```ts
 * createPipelineExtension({
 *   key: 'acme.file-writer',
 *   hook({ artifact }) {
 *     return {
 *       artifact,
 *       commit: async () => {
 *         await fs.writeFile('/tmp/output.json', JSON.stringify(artifact));
 *       },
 *       rollback: async () => {
 *         await fs.unlink('/tmp/output.json');
 *       },
 *     };
 *   },
 * });
 * ```
 *
 * @param    options - Extension configuration with either `register` (dynamic) or `setup`/`hook` (static)
 * @category Pipeline
 * @example
 * Basic audit extension that annotates artifacts:
 * ```ts
 * const auditExtension = createPipelineExtension({
 *   key: 'acme.audit',
 *   setup(pipeline) {
 *     pipeline.builders.use(createAuditBuilder());
 *   },
 *   hook({ artifact }) {
 *     return {
 *       artifact: {
 *         ...artifact,
 *         meta: { ...artifact.meta, audited: true },
 *       },
 *     };
 *   },
 * });
 * ```
 * @example
 * Conditional minification based on pipeline context:
 * ```ts
 * const minifyExtension = createPipelineExtension({
 *   key: 'acme.minify',
 *   register(pipeline) {
 *     if (pipeline.context.env !== 'production') {
 *       return; // Skip minification in dev
 *     }
 *     return ({ artifact }) => ({
 *       artifact: minify(artifact),
 *     });
 *   },
 * });
 * ```
 * @example
 * File writer with atomic commit/rollback:
 * ```ts
 * const fileWriterExtension = createPipelineExtension({
 *   key: 'acme.file-writer',
 *   hook({ artifact }) {
 *     const tempPath = `/tmp/${Date.now()}.json`;
 *     return {
 *       artifact,
 *       commit: async () => {
 *         await fs.writeFile(tempPath, JSON.stringify(artifact));
 *       },
 *       rollback: async () => {
 *         await fs.unlink(tempPath).catch(() => {});
 *       },
 *     };
 *   },
 * });
 * ```
 */
export function createPipelineExtension<
	TPipeline,
	TContext,
	TOptions,
	TArtifact,
>(
	options: CreatePipelineExtensionOptions<
		TPipeline,
		TContext,
		TOptions,
		TArtifact
	>
): PipelineExtension<TPipeline, TContext, TOptions, TArtifact> {
	if ('register' in options) {
		return {
			key: options.key,
			register: options.register,
		} satisfies PipelineExtension<TPipeline, TContext, TOptions, TArtifact>;
	}

	const { key, setup, hook, lifecycle } = options;

	return {
		key,
		register(pipeline) {
			const resolveHook = () => {
				if (!hook) {
					return undefined;
				}

				if (typeof hook === 'function') {
					if (!lifecycle) {
						return hook;
					}

					return {
						lifecycle,
						hook,
					} satisfies PipelineExtensionHookRegistration<
						TContext,
						TOptions,
						TArtifact
					>;
				}

				return {
					lifecycle: hook.lifecycle ?? lifecycle,
					hook: hook.hook,
				} satisfies PipelineExtensionHookRegistration<
					TContext,
					TOptions,
					TArtifact
				>;
			};

			const setupResult = setup?.(pipeline);

			if (setupResult && isPromiseLike(setupResult)) {
				return setupResult.then(resolveHook);
			}

			return resolveHook();
		},
	} satisfies PipelineExtension<TPipeline, TContext, TOptions, TArtifact>;
}

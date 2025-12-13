[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / createPipelineExtension

# Function: createPipelineExtension()

```ts
function createPipelineExtension<TPipeline, TContext, TOptions, TArtifact>(
	options
): PipelineExtension<TPipeline, TContext, TOptions, TArtifact>;
```

Creates a pipeline extension with optional setup and hook registration helpers.

Extensions enable pluggable behavior at key pipeline lifecycle points: pre-run validation,
post-fragment AST inspection, post-builder artifact transformation, and pre-commit verification.
They support both synchronous and asynchronous workflows with automatic commit/rollback.

## Use Cases

- **Validation**: Pre-run checks for environment requirements, configuration consistency
- **Artifact transformation**: Post-build minification, formatting, type checking
- **Integration**: Third-party tool orchestration (ESLint, Prettier, bundlers)
- **Conditional execution**: Feature flags, environment-specific logic
- **Audit trails**: Logging, telemetry, compliance tracking

## Patterns

### Register Pattern (Dynamic Hook Resolution)

Use when hook logic depends on pipeline state discovered during registration:

```ts
createPipelineExtension({
	key: 'acme.conditional-minify',
	register(pipeline) {
		const shouldMinify = pipeline.context.env === 'production';
		if (!shouldMinify) return; // No hook registered

		return ({ artifact }) => ({
			artifact: minify(artifact),
		});
	},
});
```

### Setup + Hook Pattern (Static Configuration)

Use for upfront helper registration with decoupled hook logic:

```ts
createPipelineExtension({
	key: 'acme.audit-logger',
	setup(pipeline) {
		// Register audit builder that collects metadata
		pipeline.builders.use(createAuditBuilder());
	},
	hook({ artifact }) {
		// Transform artifact with audit annotations
		return {
			artifact: {
				...artifact,
				meta: {
					...artifact.meta,
					audited: true,
					timestamp: Date.now(),
				},
			},
		};
	},
});
```

### Async Setup with Rollback

```ts
createPipelineExtension({
	key: 'acme.remote-validator',
	async register(pipeline) {
		// Async setup (e.g., fetch remote schema)
		const schema = await fetchValidationSchema();

		return ({ artifact }) => {
			const valid = validateAgainstSchema(artifact, schema);
			if (!valid) {
				throw new Error('Artifact validation failed');
			}
			return { artifact };
		};
	},
});
```

## Commit/Rollback Protocol

Extensions can return a `commit` function to perform side effects (file writes, API calls)
and a `rollback` function to undo those effects on pipeline failure:

```ts
createPipelineExtension({
	key: 'acme.file-writer',
	hook({ artifact }) {
		return {
			artifact,
			commit: async () => {
				await fs.writeFile(
					'/tmp/output.json',
					JSON.stringify(artifact)
				);
			},
			rollback: async () => {
				await fs.unlink('/tmp/output.json');
			},
		};
	},
});
```

## Type Parameters

### TPipeline

`TPipeline`

### TContext

`TContext`

### TOptions

`TOptions`

### TArtifact

`TArtifact`

## Parameters

### options

[`CreatePipelineExtensionOptions`](../type-aliases/CreatePipelineExtensionOptions.md)<`TPipeline`, `TContext`, `TOptions`, `TArtifact`>

Extension configuration with either `register` (dynamic) or `setup`/`hook` (static)

## Returns

[`PipelineExtension`](../interfaces/PipelineExtension.md)<`TPipeline`, `TContext`, `TOptions`, `TArtifact`>

## Examples

Basic audit extension that annotates artifacts:

```ts
const auditExtension = createPipelineExtension({
	key: 'acme.audit',
	setup(pipeline) {
		pipeline.builders.use(createAuditBuilder());
	},
	hook({ artifact }) {
		return {
			artifact: {
				...artifact,
				meta: { ...artifact.meta, audited: true },
			},
		};
	},
});
```

Conditional minification based on pipeline context:

```ts
const minifyExtension = createPipelineExtension({
	key: 'acme.minify',
	register(pipeline) {
		if (pipeline.context.env !== 'production') {
			return; // Skip minification in dev
		}
		return ({ artifact }) => ({
			artifact: minify(artifact),
		});
	},
});
```

File writer with atomic commit/rollback:

```ts
const fileWriterExtension = createPipelineExtension({
	key: 'acme.file-writer',
	hook({ artifact }) {
		const tempPath = `/tmp/${Date.now()}.json`;
		return {
			artifact,
			commit: async () => {
				await fs.writeFile(tempPath, JSON.stringify(artifact));
			},
			rollback: async () => {
				await fs.unlink(tempPath).catch(() => {});
			},
		};
	},
});
```

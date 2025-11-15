# Extensions

WPKernel lets you run custom logic during `wpk generate` / `wpk apply` via **adapter extensions**.

You register these under `adapters.extensions` in `wpk.config.ts`. Each entry is a small factory that returns `{ name, apply }`.

## What is an adapter extension?

An adapter extension is a function that:

- receives a high-level context (config, IR, helpers),
- returns `{ name, apply }`,
- and runs as part of the CLI’s normal generate/apply flow.

You use it to:

- queue extra files,
- derive docs or clients from the IR,
- add light integration hooks.

You **do not** need to work with the low-level pipeline API for this.

## Basic shape

```ts
import type {
	AdapterExtension,
	AdapterExtensionFactory,
} from '@wpkernel/cli/config';

export const myExtension: AdapterExtensionFactory = (
	ctx
): AdapterExtension => ({
	name: 'my-extension',
	async apply(runCtx) {
		// ctx = high-level adapter context (config, IR, workspace, reporter, etc.)
		// runCtx = per-run helpers (queueFile, formatTs/Php, outputDir, ...)
		// your logic here
	},
});
```

Register it in `wpk.config.ts`:

```ts
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';
import { myExtension } from './my-extension';

export const wpkConfig: WPKernelConfigV1 = {
	version: 1,
	namespace: 'acme-demo',
	schemas: {},
	resources: {},
	adapters: {
		extensions: [myExtension],
	},
};
```

## “Hello world” extension

```ts
// my-hello-world-extension.ts
import type { AdapterExtensionFactory } from '@wpkernel/cli/config';

export const myHelloWorldExtension: AdapterExtensionFactory = (ctx) => ({
	name: 'hello-world',
	async apply({ reporter }) {
		reporter.info(`Hello from ${ctx.namespace} adapter extension`);
	},
});
```

```ts
// wpk.config.ts
import { myHelloWorldExtension } from './my-hello-world-extension';

export const wpkConfig = {
	// ...
	adapters: {
		extensions: [myHelloWorldExtension],
	},
};
```

Run `wpk generate` or `wpk apply` and you’ll see the log line in the CLI output.

## Adding Your Own Files

Adapter extensions use `queueFile` to write files transactionally.
You ask for a file, the CLI adds it to the apply plan; if something fails, nothing is half-written.

### Example: Add a small TypeScript helper

```ts
// adapters/docs-extension.ts
import path from 'node:path';
import type { AdapterExtensionFactory } from '@wpkernel/cli/config';

export const docsExtension: AdapterExtensionFactory = (ctx) => ({
	name: 'docs',
	async apply({ queueFile, formatTs, outputDir }) {
		const file = path.join(outputDir, 'resource-docs.ts');

		const source = `
			export const docs = {
				namespace: ${JSON.stringify(ctx.namespace)},
				resourceKeys: ${JSON.stringify(Object.keys(ctx.ir.resources ?? {}))},
			};
		`;

		const formatted = await formatTs(file, source);
		await queueFile(file, formatted);
	},
});
```

And in `wpk.config.ts`:

```ts
import { docsExtension } from './adapters/docs-extension';

export const wpkConfig = {
	// ...
	adapters: {
		extensions: [docsExtension],
	},
};
```

On `wpk apply`, this will add `resource-docs.ts` under the adapter’s `outputDir` without you touching the core builders.

## What you get in `apply({ … })`

Inside `apply`, you typically use:

- `queueFile(filePath, contents)` – enqueue a file into the apply plan.
- `formatTs(filePath, source)` – format TypeScript using the project’s config.
- `formatPhp(filePath, source)` – format PHP via the bundled driver (when available).
- `outputDir` – base directory for your adapter’s output.
- `reporter` – log helper scoped to your extension.

The exact shape may grow over time, but the idea stays simple: you ask for files, the CLI writes them as part of its normal plan.

## When you’d write an adapter extension

Typical use cases:

- Generate additional docs/clients from the IR.
- Emit integration stubs (e.g. telemetry, webhooks, SDK shims).
- Produce project-specific scaffolding that should stay in sync with `wpk.config.ts`.

If you ever need lower-level hooks into the pipeline itself (framework work, not app work), see the `createPipelineExtension` API in `@wpkernel/pipeline`. That’s intentionally separate from `adapters.extensions`.

# Pipeline Extensions

Extensions are first-class units that sit _outside_ of the pipeline core. They compose
through [`createPipelineExtension`](../createExtension.ts) and may register lifecycle
hooks without mutating the internal helper contract. This directory collects authoring
guidance, living design notes, and the blueprints for official extensions that will be
published alongside the pipeline once hardened.

## Authoring principles

- **Keep the pipeline pure** – extensions own their contracts, state machines, and
  presentation layers. They communicate with the pipeline exclusively via the public
  extension hook APIs.
- **Determinism first** – every extension must respect the dependency ordering guaranteed
  by the executor. Side-effects belong in `commit`/`rollback` pairs to preserve
  reproducibility.
- **Typed surfaces** – expose narrow option objects and payloads so helpers and callers
  can opt-in safely without leaking internal types.
- **Documented lifecycle** – capture setup, run, commit, and rollback behaviour inside the
  extension package. Treat the README as a changelog-quality contract.

## Directory layout

```
extensions/
├── README.md                  # You are here
├── official.ts                # Blueprint catalogue for built-in extensions
└── <extension-name>/          # (Optional) workspace for a concrete extension
```

When incubating an extension inside this repository, create a dedicated sub-directory and
export its entry points from `official.ts`. Once the API stabilises, the code can move to a
standalone package without changing downstream imports.

## Creating an extension

1. **Model the contract** – define a typed options object and any helper annotations the
   extension needs. Prefer additive metadata (e.g., `helper.meta.retryPolicy`) over
   mutations to existing helper descriptors.
2. **Implement the lifecycle** – use `createPipelineExtension` to wire setup/teardown and
   hook logic. Keep orchestration logic local; do not reach into `createPipeline` internals.
3. **Surface diagnostics** – emit structured reporter events and rethrow `WPKernelError`
   subclasses when aborting a run. Rollback paths should translate thrown values into
   `PipelineExtensionRollbackErrorMetadata`.
4. **Document usage** – update this README (or the extension’s own README) with supported
   options, helper annotations, and reporter integration notes. Include migration guidance
   when borrowing behaviour from third-party libraries.

## Official extensions (incubating)

See [`official.ts`](./official.ts) for the canonical list of internal extensions we plan to
ship. Each blueprint records:

- the extension slug (appended to the canonical pipeline namespace) and status;
- supported behaviours and helper annotations;
- reporter or renderer requirements;
- downstream integrations the team plans to support.

Downstream consumers should import from `@wpkernel/pipeline/extensions` to experiment with
these blueprints. Production implementations will live in dedicated packages that honour
this contract.

## Using an extension inside a pipeline

```ts
import { createPipeline } from '@wpkernel/pipeline';
import { OFFICIAL_EXTENSION_BLUEPRINTS } from '@wpkernel/pipeline/extensions';

const pipeline = createPipeline(/* ... */);
const liveRunner = OFFICIAL_EXTENSION_BLUEPRINTS.find(
	(entry) => entry.id === 'live-runner'
);

// Later, once the concrete factory ships:
// pipeline.extensions.use(createLivePipelineRunExtension({ renderer, retries: { default: 2 } }));
```

Helpers will opt into extension-specific behaviour by adding metadata to their descriptors.
The precise shape is defined by the blueprint:

```ts
const fragment = createHelper({
	key: 'demo.fragment',
	appliesTo: 'fragment',
	mode: 'serial',
	apply({ next }) {
		next({
			retryPolicy: { attempts: 3, backoff: 'exponential' },
			prompt: { when: 'onAbort', message: 'Retry build?' },
		});
	},
});
```

Treat the snippet above as illustrative guidance; each extension in `official.ts` owns the
definitive option names it understands. Keep helper annotations narrowly scoped to the
extensions that consume them.

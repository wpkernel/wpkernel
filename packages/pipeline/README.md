# @wpkernel/pipeline

> Framework-agnostic orchestration primitives for building dependency-aware execution pipelines with atomic rollback.

## Overview

`@wpkernel/pipeline` powers every generation flow inside WPKernel. It was extracted from
`@wpkernel/core` so CLI builders, PHP bridges, and external projects can compose helpers,
validate dependencies, and execute deterministic plans. The runtime enforces a three-phase
model (fragments → builders → extensions) and provides rich diagnostics when helpers clash or
dependencies are missing.

## Quick links

- [Package guide](../../docs/packages/pipeline.md)
- [API reference](../../docs/api/@wpkernel/pipeline/README.md)
- [PHP codemod roadmap](../../docs/internal/php-json-ast-codemod-plan.md)

## Installation

```bash
pnpm add @wpkernel/pipeline
```

The package ships pure TypeScript and has no runtime dependencies.

```ts
import { makePipeline } from '@wpkernel/pipeline';

// 1. Create a pipeline with your specific runtime behavior
const pipeline = makePipeline({
    // Adapters to bridge the generic runner with your domain
    createContext: (options) => ({ ... }),
    createFragmentState: () => ({ items: [] }),
    // ... complete wiring (see Advanced Usage)
});

// 2. Register helpers (fragments or builders)
pipeline.use({
    kind: 'fragment', // Phase 1: Accumulate
    key: 'source',
    apply: ({ output }) => output.items.push('data')
});

pipeline.use({
    kind: 'builder',  // Phase 2: Persist
    key: 'sink',
    apply: ({ input }) => console.log(input.items)
});

// 3. Execute
await pipeline.run({});
```

## Advanced usage

### Anatomy of `makePipeline`

The runner is fully generic. To make it useful, you provide adapters that define your "World" (Context, Artifacts, Drafts).

```ts
const pipeline = makePipeline({
	// [Required] Define your execution context
	createContext: (ops) => ({ reporter: ops.reporter }),

	// [Required] Define the "Draft" state for Phase 1 (Fragments)
	createFragmentState: () => ({ items: [] }),
	createFragmentArgs: ({ context, draft }) => ({
		context,
		output: draft, // Fragments write to the draft
	}),
	finalizeFragmentState: ({ draft }) => draft, // Turn draft into artifact

	// [Required] Define the "Artifact" for Phase 2 (Builders)
	createBuilderArgs: ({ context, artifact }) => ({
		context,
		input: artifact, // Builders read the artifact
	}),

	// [Optional] Custom error factories, build options, etc.
	createBuildOptions: (opts) => opts,
});
```

## Core concepts

- **Three-phase execution** – fragment helpers assemble intermediate representations, builder
  helpers produce artefacts, and extension hooks commit or roll back side-effects.
- **Deterministic ordering** – helpers declare `dependsOn` relationships; the runtime performs
  topological sorting, cycle detection, and unused-helper diagnostics.
- **Extension system** – register hooks via `createPipelineExtension()` to manage commits,
  rollbacks, and shared setup/teardown logic.
- **Typed contracts** – helper descriptors, execution metadata, and diagnostics surfaces are
  fully typed for TypeScript consumers.

## Official extension incubator

The package owns an `src/extensions/` workspace where internal extensions are designed before
being promoted to standalone packages. The directory ships a README that documents authoring
guidelines and an [`official.ts`](./src/extensions/official.ts) catalogue describing the
blueprints for:

- a live runner extension that streams reporter events to interactive renderers;
- a deterministic concurrency scheduler;
- additional integration blueprints for telemetry and runtime adapters.

Consumers can import the catalogue through `@wpkernel/pipeline/extensions` to understand the
contracts and helper annotations each extension expects while we finalise their
implementations.

## Consumers

- `@wpkernel/cli` (code generation pipeline, codemod entry points)
- `@wpkernel/core` (resource/action orchestration)
- `@wpkernel/php-json-ast` (codemod and builder stacks)
- External tooling that requires deterministic job orchestration

## Diagnostics & error handling

Use the built-in factories (`createDefaultError`, `PipelineDiagnostic`) to capture conflicts,
missing dependencies, and rollback metadata. Execution snapshots describe which helpers ran,
which were skipped, and what extensions committed.

## Contributing

Keep helpers exported through `src/index.ts` and accompany new primitives with examples in the
API reference. When expanding the extension system or diagnostics, update the codemod roadmap to
reflect new capabilities that PHP bridges or the CLI can adopt.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)

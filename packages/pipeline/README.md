# @wpkernel/pipeline

> A type-safe, dependency-aware workflow engine for orchestrating complex generation tasks.

## Overview

`@wpkernel/pipeline` is a generic orchestration engine that turns sets of decoupled "helpers" into deterministic, topologically sorted execution plans.

While it powers WPKernel's code generation (assembling fragments into artifacts), the core is completely agnostic. You can use it to build:

- **ETL Pipelines**: Extract, Transform, and Load stages with shared state.
- **Build Systems**: Compile, Bundle, and Minify steps with precise ordering.
- **Code Generators**: The standard "Fragment → Builder" pattern.

It guarantees:

- **Deterministic Ordering**: Topologically sorts helpers based on `dependsOn`.
- **Cycle Detection**: Fails fast (halts execution) if dependencies form a loop.
- **Robust Rollbacks**: Extensions and helpers provide best-effort rollback hooks run LIFO, attempting all cleanup steps and reporting any rollback failures.
- **Type Safety**: Full TypeScript support for custom contexts, options, and artifacts.

### Architecture Note

The package exports a single entry point `@wpkernel/pipeline`. While the internal structure distinguishes between the "Core" (runner/graph) and the "Standard Pipeline" (implementation), you should import everything from the main package.

Subpath imports (e.g., `@wpkernel/pipeline/core`) are available for advanced usage but not required for standard consumers.

## Installation

```bash
pnpm add @wpkernel/pipeline
```

The package ships pure TypeScript and has no runtime dependencies.

### Usage

#### Standard Pipeline (Recommended)

Use `createPipeline` for the standard Fragment → Builder workflow used by WPKernel.

```ts
import { createPipeline } from '@wpkernel/pipeline';

const pipeline = createPipeline({
	// Configuration
	createContext: (ops) => ({ db: ops.db }),
	createBuildOptions: () => ({}),
	createFragmentState: () => ({}),

	// Argument resolvers
	createFragmentArgs: ({ context }) => ({ db: context.db }),
	createBuilderArgs: ({ artifact }) => ({ artifact }),
});
```

#### Custom Pipeline (Advanced)

For completely custom architectures (ETL, migrations, etc.), use `makePipeline` to define your own stages.

```ts
import { makePipeline } from '@wpkernel/pipeline';

const pipeline = makePipeline({
	// Define the "Stages" of your pipeline
	stages: (deps) => [
		deps.makeLifecycleStage('extract'),
		deps.makeLifecycleStage('transform'),
		deps.makeLifecycleStage('load'),
		deps.commitStage,
		deps.finalizeResult,
	],
	createContext: (ops) => ({ db: ops.db }),
	// ... logic for resolving args for your helpers ...
});
```

### 2. Register Helpers

Helpers are the atomic units of work. They can be anything - functions, objects, or complex services.

```ts
// "Extract" helper
pipeline.use({
	kind: 'extract',
	key: 'users',
	apply: async ({ context }) => {
		return context.db.query('SELECT * FROM users');
	},
});

// "Transform" helper (depends on generic extract logic)
pipeline.use({
	kind: 'transform',
	key: 'clean-users',
	dependsOn: ['users'],
	apply: ({ input }) => {
		return input.map((u) => ({ ...u, name: u.name.trim() }));
	},
});
```

### 3. Run It

The pipeline resolves the graph, executes the content, and manages the lifecycle.

```ts
const result = await pipeline.run({ db: myDatabase });
```

## Concepts

### Agnostic Helper Kinds

You are not limited to fixed roles. Define any `kind` of helper (e.g., `'validator'`, `'compiler'`, `'notifier'`) and map them to execution stages.

### Dependency Graph

Pipeline creates a dependency graph for _each_ kind of helper. If `Helper B` depends on `Helper A`, the runner ensures `A` executes before `B` (and passes `A`'s output to `B` if configured).

### Extensions & Lifecycles

Extensions wrap execution with hooks at specific lifecycle stages: `prepare`, `before-fragments`, `after-fragments`, `before-builders`, `after-builders`, and `finalize`.

**Validation**: The pipeline validates extension registrations. If an extension attempts to hook into an unscheduled lifecycle, the pipeline will log a warning instead of silently ignoring it.

**Async Registration**: You can register extensions asynchronously (returned as a Promise). `pipeline.run()` will automatically wait for all pending extensions to settle before starting execution. If a registration fails, the run will reject.

### Rollbacks

The pipeline supports robust rollback for both helper application and extension lifecycle commit phases:

- **Extensions**: Can provide transactional overhead via the `commit` phase. If extensive failure occurs, `rollback` hooks are triggered.
- **Helpers**: Can return a `rollback` function in their result. These are executed LIFO if a later failure occurs.
- **Robustness**: The rollback stack continues execution even if individual rollback actions fail (errors are collected and reported).

### Re-run Semantics

Diagnostics are per-run. Calling `pipeline.run()` automatically clears any previous runtime diagnostics to ensure a fresh state. Static diagnostics (e.g., registration conflicts) are preserved and re-emitted for each run.

## Documentation

- [Architecture Guide](../../docs/packages/pipeline/architecture.md): Deep dive into the runner's internals and DAG resolution.
- [API Reference](../../docs/api/@wpkernel/pipeline/README.md): Generated TSDoc for all interfaces.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)

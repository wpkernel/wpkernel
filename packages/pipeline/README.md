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
- **Cycle Detection**: Fails fast if dependencies form a loop.
- **Atomic Rollbacks**: Extensions provide transactional `commit` and `rollback` hooks.
- **Type Safety**: Full TypeScript support for custom contexts, options, and artifacts.

## Installation

```bash
pnpm add @wpkernel/pipeline
```

The package ships pure TypeScript and has no runtime dependencies.

## Usage

### 1. Define Your World

The pipeline is generic. You define the "Stages" and "State" relevant to your domain.

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
	// Define how to create your context and state
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

Extensions wrap the execution with hooks like `prepare`, `onSuccess`, and `rollback`. They are crucial for ensuring atomic operations - if any stage fails, the pipeline automatically triggers the rollback chain for all executed extensions.

## Documentation

- [Architecture Guide](../../docs/packages/pipeline/architecture.md): Deep dive into the runner's internals and DAG resolution.
- [API Reference](../../docs/api/@wpkernel/pipeline/README.md): Generated TSDoc for all interfaces.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)

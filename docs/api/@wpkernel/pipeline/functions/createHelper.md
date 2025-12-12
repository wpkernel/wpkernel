[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / createHelper

# Function: createHelper()

```ts
function createHelper<TContext, TInput, TOutput, TReporter, TKind>(options): Helper<TContext, TInput, TOutput, TReporter, TKind>;
```

Creates a pipeline helper-the fundamental building block of WPKernel's code generation system.

## Overview

Helpers are composable, dependency-aware transformation units that power the entire framework:

- **CLI package**: Generates PHP resources, actions, blocks, and bindings via helper chains
- **PHP Driver**: Transforms PHP AST nodes through fragment helpers
- **Core**: Orchestrates resource definitions and action middleware

Each helper is a pure, immutable descriptor that declares:

- **What it does**: Fragment transformations or artifact building
- **When it runs**: Priority ordering and dependency relationships
- **How it integrates**: Mode (extend/replace/before/after) and rollback behavior

## Key Concepts

### Helper Kinds

- `fragment`: Modifies AST nodes in-place (e.g., add PHP opening tag, inject imports)
- `builder`: Produces final artifacts from fragments (e.g., write files, format code)

### Execution Modes

- `extend` (default): Add to existing transformations; multiple helpers with same key can coexist
- `override`: Only one override helper per key is allowed; prevents duplicate override registrations

Note: Mode primarily affects registration validation. For execution ordering, use `priority` and `dependsOn`.

### Dependency Resolution

The pipeline automatically:

- Topologically sorts helpers based on `dependsOn` declarations
- Validates dependency chains and reports missing/circular dependencies
- Ensures helpers run in correct order regardless of registration sequence

### Apply results & rollback

Helpers typically perform their work by mutating the provided `fragment` or `output` in place and optionally calling `next()` to continue the chain.
For more advanced scenarios, a helper can **also return** a result object:

- `output` — an updated output value to feed into subsequent helpers
- `rollback` — a rollback operation created via `createPipelineRollback`, which will be executed if the pipeline fails after this helper completes

Returning a result object is opt-in; existing helpers that return `void` remain valid and continue to behave as before.

## Architecture

Helpers form directed acyclic graphs (DAGs) where each node represents a transformation
and edges represent dependencies. The pipeline executes helpers in topological order,
ensuring all dependencies complete before dependent helpers run.

This design enables:

- **Composability**: Combine helpers from different packages without conflicts
- **Extensibility**: Third-party helpers integrate seamlessly via dependency declarations
- **Reliability**: Helper-level rollback (via `createPipelineRollback`) ensures atomic behaviour across helper chains
- **Observability**: Built-in diagnostics and reporter integration for debugging

## Type Parameters

### TContext

`TContext`

### TInput

`TInput`

### TOutput

`TOutput`

### TReporter

`TReporter` _extends_ [`PipelineReporter`](../interfaces/PipelineReporter.md) = [`PipelineReporter`](../interfaces/PipelineReporter.md)

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Parameters

### options

[`CreateHelperOptions`](../interfaces/CreateHelperOptions.md)<`TContext`, `TInput`, `TOutput`, `TReporter`, `TKind`>

## Returns

[`Helper`](../interfaces/Helper.md)<`TContext`, `TInput`, `TOutput`, `TReporter`, `TKind`>

## Examples

```typescript
import { createHelper } from '@wpkernel/pipeline';

// Add PHP opening tag to generated files
const addPHPTag = createHelper({
  key: 'add-php-opening-tag',
  kind: 'fragment',
  mode: 'extend',
  priority: 100, // Run early in pipeline
  origin: 'wp-kernel-core',
  apply: ({ fragment }) => {
    fragment.children.unshift({
      kind: 'text',
      text: '<?php\n',
    });
  },
});
```

```typescript
// This helper depends on namespace detection running first
const addNamespaceDeclaration = createHelper({
  key: 'add-namespace',
  kind: 'fragment',
  dependsOn: ['detect-namespace'], // Won't run until this completes
  apply: ({ fragment, context }) => {
    const ns = context.detectedNamespace;
    fragment.children.push({
      kind: 'namespace',
      name: ns,
    });
  },
});
```

```typescript
import { createHelper, createPipelineRollback } from '@wpkernel/pipeline';

const writeFileHelper = createHelper({
  key: 'write-file',
  kind: 'builder',
  apply: ({ output, context }) => {
    const path = context.outputPath;
    const before = [...output]; // Capture current in-memory state

    output.push(context.fileContent);

    return {
      rollback: createPipelineRollback(
        () => {
          output.length = 0;
          output.push(...before);
        },
        {
          key: 'write-file',
          label: 'Restore file output state',
        }
      ),
    };
  },
});
```

```typescript
const formatCodeHelper = createHelper({
  key: 'format-code',
  kind: 'builder',
  dependsOn: ['write-file'],
  apply: async ({ output, context }) => {
    try {
      const formatted = await prettier.format(output.join(''), {
        parser: 'php',
      });
      return { output: formatted.split('') }; // Optionally return a new output value
    } catch (error) {
      context.reporter.warn?.('Formatting failed', { error });
      throw error;
    }
  },
});
```

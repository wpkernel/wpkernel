---
id: p2-017
title: Expose authority-free configured graph inspection
stage: source
status: proposed
priority: normal
forward_to: []
depends_on:
    - p2-009
    - p2-011
    - p2-014
decision_dependencies:
    - ADR-001
    - ADR-002
conflicts_with: []
write_scope:
    - packages/pipeline/src/v2/pipeline/**
    - packages/pipeline/src/v2/graph/**
    - packages/pipeline/src/v2/index.ts
    - packages/pipeline/src/v2/__tests__/**
    - packages/pipeline/scripts/qualify-packed-api.mjs
    - packages/pipeline/README.md
    - docs/packages/pipeline/**
    - docs/api/@wpkernel/pipeline/**
    - docs/internal/pipeline/contracts/**
required_reading:
    - path: docs/REPOSITORY-GUIDE.md
      reason: Regenerate and verify public API documentation through repository-owned workflows.
    - path: docs/internal/pipeline/contracts/v2-public-contract.md
      reason: Preserve the evaluator authority and configuration-failure algebra.
    - path: docs/internal/pipeline/contracts/v2-vocabulary.md
      reason: Reuse settled public terms rather than introducing a parallel graph vocabulary.
    - path: docs/internal/pipeline/decisions/ADR-001-explicit-dataflow-dag.md
      reason: Preserve canonical topology and edge semantics.
    - path: docs/internal/pipeline/decisions/ADR-002-process-local-host-boundary.md
      reason: Keep inspection distinct from durable plans and execution authority.
read_scope:
    - docs/REPOSITORY-GUIDE.md
    - packages/pipeline/src/v2/**
    - packages/pipeline/README.md
    - packages/pipeline/scripts/qualify-packed-api.mjs
    - scripts/docs/**
    - docs/packages/pipeline/**
    - docs/api/@wpkernel/pipeline/**
    - docs/internal/pipeline/**
review_owner: coordinator
updated_at: 2026-08-22
---

# P2-017: Expose authority-free configured graph inspection

## Objective

Expose an immutable inspection of the final configured Pipeline graph without
evaluating nodes or creating a second compiler or scheduler authority.

The operation should accept the live nominal `Pipeline` token so it observes
the same captured base declaration, settled extension generation and static
role validation as `runPipeline`. It must reuse the existing validated
compilation seam rather than compiling a caller-supplied declaration through a
parallel lifecycle.

## Boundary

`inspectPipeline({ pipeline })` returns static evidence about one configured,
process-local Pipeline generation. It does not return the internal compiled
`Graph`, executor or participant tables, scheduler state, a continuation,
durable plan, checkpoint, claim or any operation that can start, admit, skip or
resume work.

The public result algebra is exact:

```ts
interface PipelineInspectionFailure {
	readonly kind: 'inspection-failed';
	readonly field: 'options' | 'pipeline';
	readonly error: GraphSchedulerError;
}

interface PipelineInspectionNode {
	readonly key: NodeKey;
	readonly ordinal: number;
	readonly rank: number;
	readonly priority: number;
	readonly externalInputs: readonly string[];
	readonly effectKeys: readonly EffectKey[];
	readonly predecessors: readonly NodeKey[];
	readonly dependants: readonly NodeKey[];
}

interface PipelineGraphInspection {
	readonly kind: 'graph-inspection';
	readonly schemaVersion: 1;
	readonly inputKeys: readonly string[];
	readonly effectKeys: readonly EffectKey[];
	readonly nodes: readonly PipelineInspectionNode[];
	readonly edges: readonly Edge[];
	readonly outputs: Readonly<Record<string, NodeKey>>;
	readonly anchors: Readonly<Record<string, NodeKey>>;
	readonly policy: Readonly<ExecutionPolicy>;
}

interface PipelineInspectionSuccess {
	readonly kind: 'inspected';
	readonly graph: PipelineGraphInspection;
}

type InspectPipelineResult = MaybePromise<
	| PipelineInspectionFailure
	| PipelineConfigurationFailure
	| PipelineInspectionSuccess
>;
```

`PipelineInspectionFailure` is the algebraic rejection of invalid options or a
token that is not the exact live `Pipeline` authority captured by
`createPipeline`. `PipelineConfigurationFailure` is the existing complete
extension, graph and static-role failure algebra. No branch throws for
caller-owned admission or configuration failure.

The interfaces above are the complete public result and projection shapes. The
successful `graph` projection is newly owned, deeply frozen, null-prototype and
structured-clone-safe. It includes only:

- declared input and effect keys;
- nodes in canonical ordinal order with key, ordinal, rank, priority, external
  inputs, effect keys, predecessors and dependants;
- canonical edges, named output projection, anchors and concurrency policy.

Registration order, callbacks, middleware, observers, effect participants,
capabilities, private brands and authoring provenance remain internal.

## Acceptance criteria

- Configuration whose captured extension settlements are synchronous or have
  already drained returns synchronously and invokes no node executor,
  middleware, observer or effect participant. Inspection returns a promise only
  while a captured settlement remains pending.
- Pending thenables are adopted through the same generation seam and normal
  promise-resolution semantics as `runPipeline`. Contribution callbacks retain
  their existing capture and reuse semantics across repeated inspection and
  later execution.
- Inspection observes the final contributed graph and uses the same extension,
  graph and static-role failure ordering as `runPipeline`. Invalid
  configuration never produces partial inspection success.
- Canonical node order, predecessors, dependants, edges, inputs, effects,
  outputs, anchors and policy match the graph that a later run evaluates.
- An `A -> B` edge remains visible when A may output `undefined` and B may ignore
  it. Neither executor runs during inspection.
- The complete projection is owned, deeply frozen, authority-free and
  structured-clone-safe. Mutation, reconstruction, proxies and cross-process
  values cannot affect or impersonate the nominal Pipeline.
- Repeated and concurrent inspection is deterministic across extension
  settlement timing and does not consume or mutate the captured generation.
- Packed Bundler and strict NodeNext consumers can import only the curated
  inspection operation and data types. Internal graph compilation,
  serialisation, executor tables and scheduling remain unreachable.
- The authored Pipeline guide under `docs/packages/pipeline` explains the seam
  for the public `wpkernel.dev` documentation in the established v2 voice and
  register. Generated API Markdown remains a generated projection of TSDoc,
  not a second authored documentation surface.
- Property tests permuting declaration record order and edge order, plus
  settlement timing for one fixed extension-registration tuple, prove canonical
  inspection does not drift for semantically equivalent inputs. They do not
  treat extension registration order as irrelevant where tuple position is
  semantic.

## Verification

Use focused synchronous and asynchronous settlement tests, hostile nominal
boundary tests, graph/configuration parity tests, structured-clone and mutation
tests, deterministic property tests, public-surface reachability checks and the
packed Bundler/NodeNext qualifier.

Review the authored `docs/packages/pipeline` diff for voice and semantic
accuracy. Regenerate the public API projection with `pnpm docs:api`, inspect the
generated diff for only the intended Pipeline surface, then run
`pnpm docs:site` and verify
`docs/.vitepress/dist/api/@wpkernel/pipeline/index.html` exists. The generated
Markdown is never hand-edited. Publication to `wpkernel.dev` remains governed
by the repository's upstream documentation workflow.

Suggested execution tier: frontier FP/API implementation followed by an
independent authority and algebra review.

This post-release task depends on P2-009. It does not block P2-007, Task Graph
beta.4, current v2 qualification or the 2.0.0 release chain. It becomes a
TaskGraph adoption dependency only if TaskGraph chooses to inspect canonical
topology without evaluating genuine planning nodes.

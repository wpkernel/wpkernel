---
id: p2-007
title: Integrate v2, the v1 adapter and consumers
stage: integration
status: done
priority: critical
evidence_milestone: 'V2 root, serial v1 adapter and WPKernel consumers qualified and independently reviewed clean'
forward_to: []
depends_on:
    - p2-005
    - p2-006
    - p2-013
    - p2-015
decision_dependencies:
    - ADR-001
    - ADR-002
    - ADR-003
conflicts_with:
    - p2-003
    - p2-004
    - p2-005
    - p2-006
    - p2-013
    - p2-015
write_scope:
    - packages/pipeline/package.json
    - packages/pipeline/README.md
    - packages/pipeline/scripts/qualify-packed-api.mjs
    - packages/pipeline/vite.config.ts
    - packages/pipeline/src/index.ts
    - packages/pipeline/src/v1.ts
    - packages/pipeline/src/v2/diagnostics/types.ts
    - packages/pipeline/src/v2/graph/types.ts
    - packages/pipeline/src/v2/pipeline/runtime.ts
    - packages/pipeline/src/core/**
    - packages/pipeline/src/standard-pipeline/**
    - packages/core/src/pipeline/**
    - packages/core/src/resource/define.ts
    - packages/core/tests/**
    - packages/cli/src/runtime/**
    - packages/cli/src/adapters/extensions.ts
    - packages/cli/src/commands/generate.ts
    - packages/cli/src/commands/init/pipeline.ts
    - packages/cli/src/config/types.ts
    - packages/cli/src/index.ts
    - packages/cli/src/ir/**
    - packages/cli/tests/runtime/**
    - packages/cli/README.md
    - packages/php-json-ast/src/installer.ts
    - packages/php-json-ast/src/programBuilder.ts
    - packages/php-json-ast/src/programWriter.ts
    - package.json
    - pnpm-lock.yaml
    - docs/internal/pipeline/ROADMAP.md
    - docs/internal/pipeline/EXTERNAL-LANES.md
    - docs/internal/pipeline/tasks/P2-016-workspace-installed-resolution-boundary.md
    - docs/packages/pipeline/migrating-to-v2.md
    - vite.config.base.ts
    - scripts/check-dts-imports.mjs
    - scripts/declaration-imports.mjs
    - scripts/declaration-imports.d.mts
    - tests/__tests__/scripts/declaration-imports.test.ts
required_reading:
    - path: docs/internal/pipeline/contracts/v2-public-contract.md
      reason: Integrate only the admitted root contract.
    - path: docs/internal/pipeline/contracts/v2-vocabulary.md
      reason: Keep migration names consistent.
    - path: docs/internal/pipeline/ROADMAP.md
      reason: Preserve WPKernel integration and release sequencing.
read_scope:
    - docs/internal/pipeline/**
    - packages/pipeline/src/**
    - packages/core/**
    - packages/cli/**
    - packages/php-json-ast/**
    - packages/test-utils/src/core/**
review_owner: coordinator
updated_at: 2026-08-22
---

# P2-007: Integrate v2, the v1 adapter and consumers

## Objective

Expose one coherent v2 root contract, retain v1 only through an explicitly
serial compatibility boundary, and migrate real WPKernel consumers.

## Acceptance criteria

- The reviewed P2-013 v2 surface is exposed from the package root without
  private runner types.
- Standard fragment and builder semantics are either explicit graph nodes or a
  named serial adapter. Mutable compatibility never enters the v2 scheduler.
- `next(output?)` exists only behind the v1 adapter, if retained at all.
- Current Core, CLI, php-json-ast and test-utils consumers use the explicit
  compatibility boundary where they retain v1 semantics, then compile and pass.
- V2-safe shared types such as `MaybePromise` remain native-root imports rather
  than being mislabeled as serial compatibility dependencies.
- Public v1 TSDoc and package prose name the compatibility subpath accurately.
- Compatibility and consumer composition preserve synchronous settlement until
  real asynchronous work appears; no unconditional `async` wrapper is admitted.
- Pipeline v2 and serial-adapter runtime implementation files remain class-free
  and are split at roughly 500 lines where a coherent seam exists.
- Focused and repository coverage do not regress, and each migration lane is
  independently reviewed before integration.

## Verification

Root-only consumer type tests, WPKernel dependent suites, v1 migration fixtures
and recorded external consumer evidence.

Suggested execution tier: balanced migration lanes with frontier integration
review.

## Work log

Execution mode: shared-checkout
Execution rationale: P2-007 owns the integration boundary across Pipeline and
its in-repository consumers; independent workers used disjoint review lanes
without separate worktrees.
Concurrency evaluation: declaration, adapter, consumer and authored-document
reviews used distinct ownership while the coordinator retained task authority.
Concurrent task scopes: none outside P2-007; the php-json-ast FP extraction is
proposed and depends on P2-007 releasing `programBuilder.ts`.
Swarm delegation: adapter implementation, declaration qualification, authored
public documentation, Pipeline semantic review and consumer compatibility review.

### Current evidence

- The exact base SHA was reconstructed from a Git archive using the same
  installed toolchain. Its coverage tuples, in statements/branches/functions/
  lines order, are Pipeline 99.93/99.91/99.86/99.96, Core
  95.14/87.84/97.02/95.24, CLI 93.13/81.34/94.49/93.11 and php-json-ast
  89.15/78.54/89.78/89.24. The final Pipeline tree improves every axis to
  99.97/100/99.88/100 across 82 suites and 557 tests.
- CLI currently improves every base axis at 93.16/81.54/94.52/93.17 across
  163 suites and 873 tests. Its coverage command still exits non-zero because
  the package's inherited 85.5% branch threshold is above both the base and
  current results; the threshold was not weakened.
- Core improves every base axis to 95.94/88.83/97.91/96.12 across 76 suites,
  913 passing tests and 2 skipped tests. Its coverage command still exits
  non-zero because the package's inherited 90% branch threshold is above both
  the 87.84% base and 88.83% current result; the threshold was not weakened.
- php-json-ast retains its exact base tuple at 89.15/78.54/89.78/89.24 across
  25 suites and 177 tests. Its inherited 90% statements, 82% branches, 90%
  functions and 90% lines thresholds remain above both the identical base and
  current results; no threshold was weakened.
- The rebuilt `wpkernel-pipeline-1.4.1.tgz` passes packed Bundler and strict
  NodeNext consumers for both the native root and `/v1`. The qualifier walks
  the reachable declaration graph, rejects private authority and unsupported
  imports, and retains representative inferred native and serial declarations.
- Pipeline build, source/test typechecks, lint, packed qualification and full
  coverage pass. Core build and source/test typechecks, CLI build and
  source/test typechecks, php-json-ast source typecheck, focused consumer
  suites, declaration tests, formatting and diff checks also pass.
- The declaration lane publishes an exact `.d.mts` contract for its five runtime
  exports and passes a clean strict NodeNext compile fixture.
- Authored public documentation completed independent behavioural and voice
  review. A later Task Graph integration audit found one overstrong edge claim:
  dependants may ignore a delivered predecessor output, including `undefined`,
  when source success is the causal prerequisite. The public architecture,
  migration guide, governing contract, vocabulary, ADR and package README were
  corrected, backed by a focused scheduler regression and independently
  re-reviewed clean. Generated API remains the responsibility of P2-008.

### Intentional observer delta

The observer-delivery finding is valid but safely deferable as an implementation
difference, provided the public compatibility note remains explicit. Historical
v1 suppressed repeat delivery of the same diagnostic object across runs sharing
one reporter identity. `/v1` deliberately delivers diagnostics once per
invocation while preserving stored diagnostics, failure values and settlement
behaviour.

Cross-run suppression is not reproduced because it would require mutable
reporter-scoped state outside the captured serial run. That would introduce
hidden cross-run authority and make delivery depend on prior invocations rather
than the current run.

Regression coverage is
`packages/pipeline/src/standard-pipeline/__tests__/serial-matrix.test.ts`,
`delivers reused diagnostic objects once per invocation` (lines 409-449). It
reuses the same diagnostic objects and reporter across two invocations, asserts
both runs fail, and asserts the delivery sequence is
`missing, unused, missing, unused`.

The rollback-observer parity finding is also valid but safely deferable as a
diagnostic improvement. Historical v1 invoked the consumer observer and
`reporter.warn` in one callback, so a throwing observer suppressed that
rollback's warning. `/v1` contains them independently: the warning and later
compensation still run, while settlement and the primary failure remain
unchanged. Source TSDoc states this contract and
`serial-boundary.test.ts` proves both extension and helper warnings survive
throwing observers.

### Workspace tooling follow-up

The original beta.2 raw TypeScript CLI exposed WPKernel's global Pipeline source
mapping collision. P2-016 separated first-party source development from
installed-package resolution. The repository now pins compiled Task Graph
beta.4, which plans from the WPKernel working directory while its own exact
Pipeline 1.4.1 dependency remains installed-package authority. This tooling
update was not a P2-007 acceptance condition.

## Handoff

### Result

Implementation, Pipeline package qualification and in-repository consumer
functional/type acceptance are independently reviewed clean. Core, CLI and
php-json-ast inherited coverage gates remain red as recorded above. Every
P2-007 coverage axis is level with or above the reconstructed base.

### Remaining risks and explicit deferments

- `packages/php-json-ast/src/programBuilder.ts` remains an 843-line module with
  a runtime `LocationTracker` class. The valid FP/complexity finding remains
  deferred because changing source-location state during the import migration
  would create avoidable compatibility risk. Any follow-up belongs in the
  existing PHP JSON AST roadmap rather than Pipeline's task authority.
- Declaration directory resolution assumes one complete declaration outDir per
  build. Every current WPKernel package satisfies that constraint. Multi-outDir
  support is deferred until a consumer introduces it.
- Task schema v1 rejects the programme's established upper-case `P2-*` task
  identifiers even though the current runtime accepts them. The exact base SHA
  is corrected here; identifier reconciliation requires a central Task Graph
  schema or compatibility decision and must not be attempted by renaming one
  task. `ADR-*` decision identifiers already match the decision schema.
- CLI's inherited 85.5% branch threshold predates P2-007 and remains red despite
  every coverage axis improving over the exact base. That threshold debt is
  deferred without lowering it; P2-007 owns non-regression, not unrelated
  package-wide branch creation.
- Core's inherited 90% branch threshold and php-json-ast's inherited global
  thresholds predate P2-007. Core improves every axis and php-json-ast remains
  exactly level with the reconstructed base, so those threshold debts are
  deferred without lowering them.

### Recommended next task

Claim P2-008. Native Pipeline v2 adoption remains a later Task Graph migration.
Admit any program-builder FP work independently through the existing PHP JSON
AST roadmap after P2-007 releases its write scope.

---
id: p2-010
title: Instrument Pipeline delivery latency
stage: qualification
status: proposed
priority: high
forward_to: []
depends_on: []
decision_dependencies: []
conflicts_with: []
write_scope:
    - docs/internal/pipeline/evidence/delivery-latency/**
    - scripts/benchmark-delivery-gates.mjs
    - .taskgraph/project.json
required_reading:
    - path: docs/internal/pipeline/COORDINATION.md
      reason: Measure the intended ownership and review sequence against actual execution.
    - path: docs/REPOSITORY-GUIDE.md
      reason: Preserve the repository's required qualification and publication boundaries.
read_scope:
    - docs/internal/pipeline/**
    - docs/REPOSITORY-GUIDE.md
    - package.json
    - turbo.json
    - packages/*/package.json
    - scripts/**
review_owner: coordinator
updated_at: 2026-10-20
---

# P2-010: Instrument Pipeline delivery latency

## Objective

Explain the elapsed-time gap between an early working implementation and final
delivery using phase and process evidence, then remove avoidable orchestration
and repository-gate delay without weakening qualification.

This task is operational and does not block the Pipeline v2 release chain.

## Known evidence to preserve

- Independent semantic and documentation review began after implementation
  rather than alongside it.
- Broad formatting and Task Graph schema repair occurred after the code patch.
- The P2-013 commit hook spent roughly one minute in staged linting because
  `normalize-punctuation.js` ignored the filenames supplied by `lint-staged`,
  scanned all repository Markdown and rewrote 472 generated API files across
  4,170 changed lines.
- CPU-heavy lint and test gates were run concurrently, creating invalid timeout
  failures and requiring a serial rerun.
- On 2026-08-18, the root lint gate took 13 minutes 10 seconds with three of
  nine package tasks cached. Active ESLint workers included `core`, `cli`, `ui`
  and `wp-json-ast`; the final `cli` worker alone remained active for more than
  12 minutes.
- Root source and test typechecks took approximately 2 minutes 20 seconds and
  2 minutes 46 seconds respectively with no diagnostics.
- Parallel root test runs produced load-sensitive CLI fixture timeouts in both
  sandbox and host contexts. A host `--runInBand` run passed 419 suites and
  2,814 tests in 11 minutes 26 seconds.

## Acceptance criteria

- Record wall-clock timestamps for discovery, implementation, independent
  review, reconciliation, focused qualification, repository qualification,
  commit and push.
- Record each gate's wall time, cache state, host or sandbox context, process
  fan-out and peak concurrency.
- Establish uncontended baselines for formatting, documentation build, lint,
  source typecheck, test typecheck and tests.
- Separate repository execution cost from agent sequencing, approval waits,
  tool polling and repeated work.
- Identify which gates are required before review, before commit and before
  push, and which can safely run concurrently.
- Produce a concrete reduction plan with before-and-after timings while
  preserving the packed NodeNext consumer and release contract.
- Register a non-mutating `pipeline.delivery-latency` Task Graph command with
  the measured serial and safe-concurrent gate schedules once the benchmark
  script exists.

## Verification

Commit the raw timing ledger, process samples, command outcomes and the proposed
gate schedule. Re-run one representative Pipeline change through the revised
schedule and compare total elapsed time and failure quality.

Suggested execution tier: fast instrumentation with balanced review.

## Bounded context and agent-economics comparison

Use the same scoped change, source/dependency revisions and acceptance checks
for the current schedule and one candidate change. Evaluate a bounded initial
context packet, grouped independent reads or stable tool/prompt prefix only
where the actual host exposes that control. Keep model and reasoning effort
fixed for this first comparison; record a later model change as a separate
variant. Do not remove required review or concurrently overload CPU-heavy
gates to manufacture a faster result.

Alongside the existing timing ledger, retain available model-call and cache
usage, preparation, tools/tests, review/repair, cancellation and approval/queue
waits. Distinguish provider observations from host timings; count overlapping
intervals once for elapsed time and allocate shared preparation once. Preserve
raw observations even where tokens or billing are unavailable.

[Cloudflare's optimisation report](https://blog.cloudflare.com/obsessive-inference-optimization/)
is observational comparison evidence, not a promised percentage saving.
[Modal's Vera benchmark](https://modal.com/blog/nvidia-vera-sandboxes) isolates
CPU/verifier work with warmed containers and removed LLM/network time; it does
not establish full-agent speed or justify a cloud migration. Existing local
instrumentation is the first comparison. No paid infrastructure, new scheduler
or hardware qualification becomes a dependency of this operational task.

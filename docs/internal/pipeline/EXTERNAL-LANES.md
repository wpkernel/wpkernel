# Pipeline external evidence lanes

Architecture version: 1
Role: non-blocking ecosystem evidence outside the Pipeline v2 task authority

## Historical Task Graph compatibility baseline

Status: package and workspace tooling boundaries qualified

- `@wpkernel/pipeline@1.4.1` was published from the trusted upstream workflow.
- `@geekist/task-graph@0.1.0-beta.4` is qualified against that exact version.
- The published Task Graph manifest declares Pipeline 1.4.1 directly.
- The original compatibility lane pinned Task Graph 0.1.0-beta.4 without an override.
- Current root tooling pins Task Graph 0.1.0-beta.6; the root manifest and lock own that installed version.

This baseline proves the published dependency boundary: Task Graph beta.4 asks
for and receives exact Pipeline 1.4.1 under normal package resolution. P2-016
is the WPKernel workspace bridge. It keeps first-party library and documentation
builds on intentional local source aliases while leaving the root runtime
context on normal package resolution, so installed and transitive consumers
receive the package versions selected by their own dependency graphs.

The compiled Task Graph beta.4 line retains exact Pipeline 1.4.1 and resolves
that dependency from its installed package boundary. It plans this repository's
real Pipeline authority without resolving the local v2 root. This tooling pin
requires Node 22 for governance commands; that does not change Pipeline's
separate Node 20 runtime qualification. It is not a P2-007 dependency or a
Pipeline 2.0.0 release gate.

## llm-core specification compiler

Status: proposed in the llm-core repository

The specification compiler should replace its non-semantic Pipeline wrapper
with direct `MaybePromise` composition after P2-001 freezes the semantic
contract. That migration must preserve synchronous settlement and the
asynchronous authority recheck.

The work belongs to llm-core and carries its own repository evidence. It is not
an acceptance criterion for P2-007 or Pipeline 2.0.0 publication.

## Current version and host boundaries

Pipeline 2.0.0 publication is recorded in P2-009. Native TaskGraph adoption is
separately owned and qualified by TaskGraph; publication here does not prove
every downstream consumer migrated. llm-core/AIFSD currently pin 1.4.1.
Their compiler changes require their own synchronous-settlement and
authority-recheck evidence.

ADR-002 already assigns durable admission and idempotency keys, durable
journals, retries, process supervision, external-effect authority and
exactly-once claims, and checkpoints to the host. Observers report
run-local transitions. They do not provide durable audit storage or provider
billing. Declared effects commit after graph success and compensate on failure;
eager host mutation is outside that guarantee. A durable restart is a fresh
graph invocation, not a serialised private frontier.


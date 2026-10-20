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

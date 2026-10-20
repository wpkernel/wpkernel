# Pipeline v2 roadmap

Architecture version: 1
Role: dependency and execution guidance; task front matter owns status

## Release and tooling lanes

The package is now 2.0.0; P2-009 records its completed release evidence.
The following 1.4.1/beta.4 chain is historical compatibility evidence, not
current package status. Root tooling now pins TaskGraph beta.6:

```text
Pipeline 1.4.1 published from wpkernel/wpkernel
  -> Task Graph qualified against exact 1.4.1
  -> Task Graph 0.1.0-beta.4 published
  -> WPKernel pins exact Task Graph 0.1.0-beta.4
```

The published Task Graph manifest now owns the exact Pipeline 1.4.1 dependency.
WPKernel does not override it. Release evidence is recorded in [`EXTERNAL-LANES.md`](EXTERNAL-LANES.md).

P2-016 separates WPKernel's intentional first-party source aliases from the
root runtime context. Task Graph beta.4 retains exact Pipeline 1.4.1 and its
compiled planner resolves that installed dependency without being redirected
to the local v2 root:

```text
Task Graph compiled-package base
  -> qualified 0.1.0-beta.4 archive using Pipeline 1.4.1
  -> WPKernel exact dependency and lock update
  -> successful task-graph:plan against the Pipeline v2 checkout
```

Neither beta.4 nor native Task Graph v2 adoption is a Pipeline runtime or
release dependency. P2-016 owns and qualifies the WPKernel resolution boundary.

## V2 programme

```text
P2-001 semantic contract and vocabulary
  -> P2-002 graph IR and compiler
       -> P2-003 immutable concurrent scheduler
  -> P2-004 middleware and extension compilation

P2-003 + P2-004
  -> P2-005 unified effect journal
  -> P2-006 graph-frontier suspension and concurrent diagnostics

P2-005 + P2-006
  -> P2-012 class-free FP authority cleanup
       -> P2-014 functional public evaluator surface
            -> P2-013 source TSDoc and authored public docs
                 -> P2-015 bounded staged Markdown normalisation
                      -> P2-007 v1 adapter and consumer integration
                           -> P2-018 public MaybePromise composition
                                -> P2-008 generated API and site projection
                                     -> P2-009 packed qualification and 2.0.0 release
```

P2-002 and P2-004 may run concurrently after P2-001. P2-005 and P2-006 may
run concurrently after their shared runtime contracts settle. P2-013 finishes
source TSDoc and authored prose before P2-015 closes the commit-hook write-set
leak. P2-007 then exposes the shared root. P2-018 makes its complete
MaybePromise composition algebra public before P2-008 regenerates the API
projection from that integrated surface.

P2-017 is a separate future integration seam. It may expose an authority-free
inspection of the final configured graph for consumers that need canonical
topology without evaluating nodes. It does not join or delay the 2.0.0 release
chain unless a later native consumer explicitly adopts that contract.

## Release meaning

Implementation, packed qualification, downstream adoption and publication are
separate evidence states. V2 is not shipped because its source tests pass. The
release task must pack once, qualify that exact archive, bind tag and version,
and publish that same archive through the trusted upstream workflow. Contributors
push branches to `origin` and merge them through an upstream pull request. The
approved upstream release authority creates `pipeline-v<version>` at the merged
commit; neither the helper nor a contributor bypasses the direct-push guard.

# WPKernel repository guide

Verify the checkout root, remote and dirty state before editing. The canonical
repository is `wpkernel/wpkernel`; retain its WordPress framework identity.
Read the selected package README and its engineering authority before work.
Use [DEVELOPMENT.md](../DEVELOPMENT.md) for framework setup and commands.

## Pipeline work

Start from [the package README](../packages/pipeline/README.md), then
[Pipeline engineering authority](internal/pipeline/README.md), its
[coordination rules](internal/pipeline/COORDINATION.md), the selected
task and named decisions. Task front matter owns status and dependencies.
Run the configured task planner before claiming an implementation task.

Pipeline v2 is a process-local immutable DAG evaluator. Domain policy and persistence remain host-owned. Do not add a second
scheduler, application schema or durable storage engine here.

Host audit records may be captured incrementally during node execution and
must survive failure and compensation. Pipeline's declared effect journal
commits only after graph success; it does not supply durable host audit history,
provider billing, external idempotency or serialisable restart checkpoints.

Preserve synchronous MaybePromise settlement and exact native contracts.
Consumers choose and qualify exact package versions independently. Existing
Pipeline 1.4.1 consumers are not silently migrated by v2 publication.

Keep changes scoped and reviewable. Use focused checks, retain command output
and source revisions, and obtain independent review before merging. No
release or direct-main push is implied by a documentation reconciliation.
Publication follows [the release task](internal/pipeline/tasks/P2-009-packed-qualification-and-release.md)
and the trusted upstream release workflow. Never bypass required checks.

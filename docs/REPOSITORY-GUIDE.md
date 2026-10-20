# WPKernel repository guide

Verify the checkout root, remote and dirty state before editing. WPKernel is a
WordPress framework; Pipeline is also available as a standalone package.
Use [DEVELOPMENT.md](https://github.com/wpkernel/wpkernel/blob/main/DEVELOPMENT.md) for setup, commands and contributor requirements.

## Documentation promotion

1. Open a feature-branch PR into `theGeekist/wpkernel-1:main`; obtain independent
   review and passing CI, then squash merge under repository policy.
2. Wait for successful push CI on that authoring-main commit.
3. Promote authoring `main` into `wpkernel/wpkernel:main` with an identical source
   tree and the real merged authoring receipt. Reconcile changes in authoring.
4. Obtain required upstream review and checks, squash merge, then verify the
   upstream **Deploy Documentation** run. CI alone does not prove deployment.

## Pipeline work

Read the [package README](https://github.com/wpkernel/wpkernel/blob/main/packages/pipeline/README.md),
[engineering authority](https://github.com/wpkernel/wpkernel/blob/main/docs/internal/pipeline/README.md),
[coordination rules](https://github.com/wpkernel/wpkernel/blob/main/docs/internal/pipeline/COORDINATION.md), selected task and named decisions.
Run `pnpm task-graph:plan` before claiming an implementation task; task front
matter owns status and dependencies. Preserve the native contracts and synchronous
`MaybePromise` settlement. Package publication follows
[P2-009](https://github.com/wpkernel/wpkernel/blob/main/docs/internal/pipeline/tasks/P2-009-packed-qualification-and-release.md)
and the trusted upstream release workflow.

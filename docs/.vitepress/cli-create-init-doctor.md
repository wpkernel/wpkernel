# Phase 9 – DX Pipeline Integration

**THIS PHASE IS CREATED TO SOLVE THE ISSUES DISCOVERED IN `docs/.vitepress/critical-create-generate-failure.md`. IF THE ISSUES ARE NOT RESOLVED BYT THE END OF THIS PHASE, WE HAVE FAILED**

> IF YOU HAVE NOT READ THE CIRITICAL PROBLEMS, PLEASE READ THAT FIRST

> Internal work log for the CLI DX readiness layer. This page tracks discovery notes, helper ownership, and integration progress as the DX orchestration layer comes together under `packages/cli/src/dx/*`.

## Cadence

Phase 9 runs in the 0.12.x band and keeps the `@wpkernel/pipeline` contract untouched. All orchestration work happens inside the CLI package by extending the runtime configured in [`packages/cli/src/runtime/createPipeline.ts`](../packages/cli/src/runtime/createPipeline.ts).

## Task ledger

| Task | Scope               | Status      | Notes                                                                                               |
| ---- | ------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| 53   | Discovery & mapping | ✅ Complete | Consolidated command/runtime surfaces and readiness unit inventory.                                 |
| 54   | DXIRv1 foundation   | ✅ Complete | DX context + readiness registry landed with helpers for git, composer, PHP, tsx, and hygiene.       |
| 55   | Command integration | ✅ Complete | Route create/init/doctor/generate/apply through DXIRv1 without regressing workflows.                |
| 56   | Reporter & logging  | ⬜ Planned  | Align DX events with existing LogLayer transports and error surfaces.                               |
| 57   | ReleasePack Chain   | ⬜ Planned  | Launch the publish-order build probe; follow-on validation tasks live in the worklog (Tasks 57–70). |

## Discovery baseline (Task 53)

_This section documents the confirmed surfaces that DXIRv1 will reuse. Updates reflect hands-on inspection rather than assumptions._

### Command entry points

- `wpk create` composes workspace setup, git detection, dependency installers, and init workflow orchestration inside [`packages/cli/src/commands/create.ts`](../packages/cli/src/commands/create.ts). The command already threads dependency hooks for git, npm, and composer installers, which DXIRv1 can wrap instead of rewriting.
- `wpk init` shares its runtime builder with create via [`packages/cli/src/commands/init/command-runtime.ts`](../packages/cli/src/commands/init/command-runtime.ts), exposing a single seam (`createInitCommandRuntime`) that resolves reporters, workspace roots, and workflow options before invoking the init pipeline.
- `wpk doctor` currently executes configuration, composer, workspace hygiene, and PHP environment checks inline inside [`packages/cli/src/commands/doctor.ts`](../packages/cli/src/commands/doctor.ts). Each check produces a `DoctorCheckResult`, which DXIRv1 should emit through the same reporter hierarchy for consistent summaries.
- Config resolution (`loadWPKernelConfig`) already returns both the config payload and source path, enabling DXIRv1 detect phases to derive workspace context without re-parsing configuration files.

### Workspace & installer utilities

- Workspace hygiene helpers (`ensureCleanDirectory`, `ensureGeneratedPhpClean`) encapsulate git status probes and error formatting in [`packages/cli/src/workspace/utilities.ts`](../packages/cli/src/workspace/utilities.ts). They should become readiness units rather than remaining ad-hoc calls.
- Git status and initialisation logic (`isGitRepository`, `initialiseGitRepository`) live in [`packages/cli/src/commands/init/git.ts`](../packages/cli/src/commands/init/git.ts); they depend on `execFile` and surface `WPKernelError` metadata, making them safe to wrap in detect/prepare steps.
- Installer wrappers for npm and composer shell out via `execFile` in [`packages/cli/src/commands/init/installers.ts`](../packages/cli/src/commands/init/installers.ts). DXIRv1 needs to provide detection (lockfile/package-manager choice) ahead of these installers and capture stderr when retries are required.
- PHP environment checks in `doctor` call `execFile` directly to inspect binaries. This behaviour must be lifted into a helper so `generate` and `apply` can reuse the confirm step before launching PHP-based printers.

### Reporter stack

- CLI commands standardise on `createReporterCLI`, which binds LogLayer transports (pretty terminal + hooks) in [`packages/cli/src/utils/reporter.ts`](../packages/cli/src/utils/reporter.ts). DXIRv1 should build child reporters from this helper so detect/prepare/execute/confirm messages inherit the same namespace and metadata expectations.
- Existing reporter children (`reporter.child('composer')`, etc.) in `doctor` provide precedents for nested DX sections. Mirroring that shape will keep console summaries and hook payloads compatible with current consumers.

### Pipeline contract reuse

- The CLI runtime wraps `@wpkernel/pipeline` through [`packages/cli/src/runtime/createPipeline.ts`](../packages/cli/src/runtime/createPipeline.ts). DXIRv1 should follow the same pattern: extend context at the call site and let helpers participate through extension hooks instead of changing shared pipeline types.
- Helpers can piggyback on the existing extension commit/rollback semantics surfaced by the runtime. No new transaction layer is required—only well-scoped readiness helpers that register their side effects.

## Package manager and lockfile behaviour (Task 53)

Existing installers always run `npm install` and `composer install` directly; there is no package-manager detection, lockfile preference, or lazy dependency planner today. DXIRv1 must add a detect phase that:

1. Identifies the active Node package manager and lockfile strategy.
2. Skips redundant installs when lockfiles already reflect the requested dependencies.
3. Records how readiness execution installs lazy assets (for example, `tsx`) so replays remain idempotent.

Any additional hooks (e.g., pnpm support) should be noted here as they are discovered.

## Readiness unit inventory (Task 53)

| Readiness unit      | Current location                    | Behaviour today                                                                        | Gaps / brittleness                                                        | Proposed DXIRv1 owner                                                                                                               |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `php-runtime`       | Doctor command (PHP checks inline)  | Invokes PHP binaries via `execFile` and reports pass/warn/fail directly.               | Hard-coded command wiring; no reuse by create/init/generate.              | Dedicated helper under `dx/readiness/phpRuntime`.                                                                                   |
| `composer`          | Doctor + init installers            | Composer install only runs during create/init; doctor just confirms autoload presence. | No detection/skip logic; failing installs throw generic `DeveloperError`. | Helper that validates plugin autoload metadata, installs dependencies when missing, and falls back to the CLI-bundled vendor cache. |
| `tsx-runtime`       | Implicit expectation in CLI runtime | No installer; commands assume `tsx` is in devDependencies.                             | Scaffolded projects fail immediately because tsx is absent.               | Helper that installs or prompts for tsx during prepare/execute.                                                                     |
| `git`               | Workspace utilities                 | `ensureCleanDirectory` and `isGitRepository` throw WPKernel errors on failure.         | Checks run in different places, no central reporting or confirm step.     | Helper that consolidates git detection and repository initialisation.                                                               |
| `workspace-hygiene` | Workspace utilities + doctor        | Cleanliness checks exist but are triggered ad-hoc.                                     | Duplicate logging formats and inconsistent skip flags (`--yes`).          | Helper that standardises detection and confirm messaging.                                                                           |

## Published artifact validation

All downstream integration and validation tasks must exercise the packed CLI (`pnpm pack` + local install) inside a fresh temp workspace. This prevents the source-tree bias that hid missing PHP driver assets in earlier integration runs.

## Task 54 – DXIRv1 foundation (complete)

- Added a dedicated DX context (`packages/cli/src/dx/context.ts`) that threads cwd, workspace roots, and `WPK_CLI_FORCE_SOURCE` into readiness helpers.
- Introduced the readiness helper factory and registry (`packages/cli/src/dx/readiness/*`), enabling detect → prepare → execute → confirm orchestration with rollback/cleanup handling.
- Wrapped existing git, composer, PHP runtime/driver, tsx runtime, and workspace hygiene logic into deterministic helpers under `packages/cli/src/dx/readiness/helpers/`.
- Landed Jest coverage for the registry planner and each helper to lock in dependency injection seams ahead of command integration.

## Task 55 – Command integration

### Subtask ledger

| Subtask | Scope                                                                                                                                                                                                                                                                                                           | Status      | Notes                                                                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 55a     | Extend `createInitCommandRuntime` to build a DX context and readiness registry before invoking the init workflow. Touches `packages/cli/src/commands/init/command-runtime.ts` and `packages/cli/src/dx/readiness/*` to expose a `runReadiness` seam for commands.                                               | ✅ Complete | Registry builder + DX context now surface `readiness.run`/`plan` with default helper order for downstream commands.                                                                                                          |
| 55b     | Route `create`/`init` through the readiness plan, mapping flags such as `--skip-install`/`--yes` onto helper configuration. Update command orchestration in `packages/cli/src/commands/create.ts` and `packages/cli/src/commands/init.ts`, adding regression tests under `packages/cli/src/commands/__tests__`. | ✅ Complete | Commands now execute readiness plans after scaffolding, honouring skip/install flags and surfacing hygiene overrides while keeping existing summaries and exit codes intact.                                                 |
| 55c     | Wrap `doctor` health checks with readiness helpers so reporter output stays consistent while leveraging the shared registry. Work centers on `packages/cli/src/commands/doctor.ts` with coverage in `packages/cli/src/commands/__tests__/doctor*.test.ts`.                                                      | ✅ Complete | Doctor now funnels composer, workspace, and PHP diagnostics through the readiness registry while preserving config/composer mapping summaries.                                                                               |
| 55d     | Add targeted readiness entry points for `generate`/`apply` flows, triggering php-printer and tsx helpers on demand. Update command modules in `packages/cli/src/commands/generate.ts` and `packages/cli/src/commands/apply.ts`, plus integration fixtures in `packages/cli/tests`.                              | ✅ Complete | Commands now invoke readiness plans to ensure Composer autoload metadata (falling back to the CLI vendor cache), PHP driver assets, and tsx are available before execution, with integration suites covering the new checks. |
| 55e     | Restore readiness extensibility by wiring helper metadata and config factories into the registry, covering `packages/cli/src/dx/readiness/*`, command surfaces, and config loaders.                                                                                                                             | ✅ Complete | Registry `describe()` now returns helper metadata for scope-aware filtering while `readiness.helpers` factories join the default order automatically, removing manual allowlists in commands and doctor.                     |

### Readiness metadata and registry extensions

An audit of DXIRv1 highlighted that helper allowlists and labels were hard-coded across commands. The registry now stores helper descriptors with labels, tags, scopes, and ordering so doctor and command readiness can render metadata directly from helpers.

`buildDefaultReadinessRegistry` accepts extension factories via config (`readiness.helpers`), mirroring the pipeline extension flow. Projects can register custom helpers without touching CLI sources, and the registry sorts them alongside core helpers.

Commands consume the new `describe()` output to filter by scope instead of maintaining bespoke key arrays. Any helper that declares a matching scope automatically participates in readiness plans, logs, and status summaries.

## Task 56 – Reporter & logging alignment

- Emit detect/prepare/execute/confirm phases through `createReporterCLI` child reporters, ensuring LogLayer transports and hook payloads match existing consumers.
- Provide concise status updates (start, success, warning, failure) per readiness unit without dumping raw diagnostic objects. Reuse existing formatting helpers where available.
- Document the new reporter channels/events in this file so future tasks can reference the canonical surface.

Readiness orchestration now scopes every helper beneath the command reporter’s `readiness` child. Each helper receives its own namespace (`readiness.<helper-key>`), and phase reporters cascade from there (`detect`, `prepare`, `execute`, `confirm`).

The registry emits a consistent sequence: phase start messages at `info`, phase outcomes mapped to `info`/`warn`/`error` based on readiness status, and a final helper summary log once confirmation completes. Blocked helpers short‑circuit after detection and surface an error log alongside the aggregated outcome, while failures annotate the phase channel before cleanup/rollback begins. Commands should continue to pass `reporter.child('readiness')` into DX helpers so transports and hooks inherit this structure.

## Task 57 – ReleasePack Chain (planned)

- Follow the worklog guidance under [Task 57 — ReleasePack Chain](./critical-create-generate-failure.md#task-57--releasepack-chain) to bootstrap the publish-order probe and update the completion log after each run.
- Tasks 58–70 in the worklog expand this validation track to cover the bootstrapper, quickstart scaffolds, runtime shims, packaging integrity, matrix sweeps, peer ranges, and docs parity—treat each completion log as the canonical status ledger for Phase 9.

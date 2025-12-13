# @wpkernel/pipeline for Framework Contributors (Standard Pipeline)

## Overview

> **Note**: This guide focuses on the **Standard Pipeline** implementation (Fragments & Builders) used by WPKernel CLI. For custom architectures using the Core Runner, see the [Architecture Guide](./architecture.md).

Framework contributors extend the pipeline along the **standard WPK model**:

- Fragment helpers assemble intermediate IR and drafts
- Builder helpers turn those drafts into real artifacts (files, AST rewrites, etc.)
- Extensions wrap the run with transactional `prepare → commit/rollback` hooks

The goal is that CLI, UI, and PHP codemod packages all share **the same helpers, the same extensions, and the same diagnostics**, while targeting different surfaces.

## Workflow

Use `makePipeline()` to describe execution stages (fragments, builders, analysis passes, etc.), then register helpers that declare dependencies. When advanced behaviour is required, compose extensions that:

- Attach to one or more **lifecycles** (e.g. `fragment`, `builder`, `plan-validate`)
- Run transactional work inside the hook (`prepare`, `commit`, `rollback`)
- Optionally register additional helpers as part of their setup

Each lifecycle run creates its own extension coordinator and state; commits run **once per lifecycle** in the order they were executed, while rollbacks run in **reverse order (LIFO)** when anything fails. Within a lifecycle, extension commit order follows hook sequencing rules (priority/registration order — whatever your coordinator guarantees). Extension authors should assume:

- your `commit` can be called alongside commits from other lifecycles
- Each lifecycle may transform the artifact; later lifecycles see the updated artifact
- your `rollback` might run even if other rollbacks fail – treat it as best-effort cleanup, not a guarantee

## Examples

```ts
import * as fs from 'fs/promises';

const fileWriterExtension = createPipelineExtension({
	key: 'acme.file-writer',
	lifecycle: 'builder', // make the intent explicit in docs, even if optional
	hook({ artifact, reporter }) {
		const tempPath = `/tmp/${Date.now()}.json`;
		let committed = false;

		return {
			artifact,
			async commit() {
				await fs.writeFile(tempPath, JSON.stringify(artifact, null, 2));
				committed = true;
				reporter.info?.(`[file-writer] wrote artifact → ${tempPath}`);
			},
			async rollback() {
				if (!committed) return;
				await fs.unlink(tempPath).catch(() => {
					reporter.warn?.(
						`[file-writer] rollback could not remove ${tempPath} (already gone?)`
					);
				});
			},
		};
	},
});
```

## Patterns

Prefer `createPipelineExtension()` over manual registration so setup and hook phases stay isolated from the helpers themselves.

Typical framework patterns:

- **FS transaction wrappers** for builder lifecycles (`builder:prepare/commit/rollback`)
- **Live-runner / watcher extensions** that inject helpers into a dedicated `live-runner` lifecycle
- **Analysis / validation passes** that attach to early lifecycles (`plan-validate`) and never touch the artifact

Always keep `commit` and `rollback` **idempotent**, and route logs through the shared reporter so diagnostics can be surfaced consistently in:

- CLI output
- docs snapshots
- UI consoles

## Extension Points

Expose new helper families through dedicated registration functions that wrap `registerHelper()` with shared defaults. Common examples:

- `registerFragmentHelper()` – annotates fragment helpers with IR metadata and default priorities (wraps core `registerHelper`)
- `registerBuilderHelper()` – locks helpers into the builder lifecycle with correct diagnostics wiring (wraps core `registerHelper`)
- `registerCodemodHelper()` – targets PHP AST visitors for `php-json-ast` and codemod plans

These functions internally use the agnostic `registerHelper` from `@wpkernel/pipeline/core` but strictly type the `kind` field.

When widening extension payloads (`PipelineExtensionHookOptions`), update:

- the CLI runtime mirror
- the PHP driver / codemod plan
- any UI live-runner that projects the same metadata

so downstream packages inherit the new shape without ad-hoc adapters.

## Official extension catalog

The `@wpkernel/pipeline/extensions` entry point publishes `OFFICIAL_EXTENSION_BLUEPRINTS`, a typed manifest of incubating extensions (live runner, concurrency scheduler, etc.). Framework contributors can use the blueprint metadata to align helper annotations and reporter expectations before the factory lands.

```ts
import { OFFICIAL_EXTENSION_BLUEPRINTS } from '@wpkernel/pipeline/extensions';

for (const blueprint of OFFICIAL_EXTENSION_BLUEPRINTS) {
	if (blueprint.id === 'live-runner') {
		console.log(blueprint.pipelineTouchPoints);
	}
}
```

When you add a new official extension, update the blueprint with helper annotations, lifecycle slots, and rollout notes so downstream packages can stage migrations against a stable contract.

## Testing

Cover helper and extension wiring inside `packages/pipeline/src/__tests__`. Pair happy-path tests with simulated rollback failures to confirm commits are skipped and diagnostics bubble up. Integration suites should snapshot the execution metadata so helper ordering regressions surface quickly.

## Cross-links

Coordinate with the CLI framework guide before changing hook payloads, and update the php-json-ast codemod plan whenever new extension hooks support visitor orchestration. Pipeline changes often cascade into `@wpkernel/test-utils` harness expectations, so review that cookbook for knock-on effects.

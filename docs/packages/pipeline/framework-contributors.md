# @wpkernel/pipeline for Framework Contributors

## Overview

Framework contributors extend the pipeline to serve new surfaces. Helpers, extensions, and diagnostics should stay reusable so CLI, UI, and PHP codemod packages continue sharing the same transactional guarantees.

## Workflow

Use `makePipeline()` to describe fragment and builder phases, then register helpers that declare dependencies. When advanced behaviour is required, compose extensions that register additional helpers during setup or run transactional work inside the hook.

## Examples

```ts
const fileWriterExtension = createPipelineExtension({
	key: 'acme.file-writer',
	hook({ artifact }) {
		const tempPath = `/tmp/${Date.now()}.json`;
		return {
			artifact,
			commit: async () => {
				await fs.writeFile(tempPath, JSON.stringify(artifact));
			},
			rollback: async () => {
				await fs.unlink(tempPath).catch(() => {});
			},
		};
	},
});
```

## Patterns

Prefer `createPipelineExtension()` over manual registration so setup and hook phases stay isolated. Ensure commit and rollback callbacks are idempotent and log through the reporter so diagnostics feed the CLI and documentation snapshots.

## Extension Points

Expose new helper families through dedicated registration functions that wrap `registerHelper()` with shared defaults. When widening extension payloads, update `PipelineExtensionHookOptions` and the CLI runtime mirror so downstream packages inherit the same shape without hand-written adapters.

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

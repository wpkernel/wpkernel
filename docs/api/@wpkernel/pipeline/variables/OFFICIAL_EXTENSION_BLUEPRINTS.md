[**@wpkernel/pipeline v0.12.6-beta.3**](../README.md)

---

[@wpkernel/pipeline](../README.md) / OFFICIAL_EXTENSION_BLUEPRINTS

# Variable: OFFICIAL_EXTENSION_BLUEPRINTS

```ts
const OFFICIAL_EXTENSION_BLUEPRINTS: readonly OfficialExtensionBlueprint[];
```

Blueprint catalogue for official extensions that the pipeline team will own.

## Example

```ts
import { OFFICIAL_EXTENSION_BLUEPRINTS } from '@wpkernel/pipeline/extensions';

const liveRunner = OFFICIAL_EXTENSION_BLUEPRINTS.find(
	(entry) => entry.id === 'live-runner'
);

if (liveRunner?.factory) {
	console.log(`Factory slug: ${liveRunner.factory.slug}`);
}
```

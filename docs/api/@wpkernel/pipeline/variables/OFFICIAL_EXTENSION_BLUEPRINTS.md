[**@wpkernel/pipeline v0.12.3-beta.1**](../README.md)

***

[@wpkernel/pipeline](../README.md) / OFFICIAL\_EXTENSION\_BLUEPRINTS

# Variable: OFFICIAL\_EXTENSION\_BLUEPRINTS

```ts
const OFFICIAL_EXTENSION_BLUEPRINTS: readonly OfficialExtensionBlueprint[];
```

Blueprint catalogue for official extensions that the pipeline team will own.

## Example

```ts
import { OFFICIAL_EXTENSION_BLUEPRINTS } from '@wpkernel/pipeline/extensions';

const liveRunner = OFFICIAL_EXTENSION_BLUEPRINTS.find(
	(entry) =&gt; entry.id === 'live-runner'
);

if (liveRunner?.factory) {
	console.log(`Factory slug: ${liveRunner.factory.slug}`);
}
```

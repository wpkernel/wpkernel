[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / compareManifestStates

# Function: compareManifestStates()

```ts
function compareManifestStates(
	workspace,
	definition
): Promise<{
	after: FileManifest;
	before: FileManifest;
	diff: FileManifestDiff;
}>;
```

Apply mutations and collect before/after manifests for comparison.

## Parameters

### workspace

[`IsolatedWorkspace`](../interfaces/IsolatedWorkspace.md)

### definition

[`ManifestComparisonDefinition`](../interfaces/ManifestComparisonDefinition.md)

## Returns

`Promise`<\{
`after`: [`FileManifest`](../interfaces/FileManifest.md);
`before`: [`FileManifest`](../interfaces/FileManifest.md);
`diff`: [`FileManifestDiff`](../interfaces/FileManifestDiff.md);
\}>

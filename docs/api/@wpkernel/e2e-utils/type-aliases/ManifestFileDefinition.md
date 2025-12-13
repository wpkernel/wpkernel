[**@wpkernel/e2e-utils v0.12.5-beta.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / ManifestFileDefinition

# Type Alias: ManifestFileDefinition

```ts
type ManifestFileDefinition =
	| string
	| {
			contents: string;
			mode?: number;
	  };
```

Definition for seeding files before collecting a manifest snapshot.

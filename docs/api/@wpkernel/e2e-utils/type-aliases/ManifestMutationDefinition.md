[**@wpkernel/e2e-utils v0.12.6-beta.3**](../README.md)

***

[@wpkernel/e2e-utils](../README.md) / ManifestMutationDefinition

# Type Alias: ManifestMutationDefinition

```ts
type ManifestMutationDefinition = 
  | string
  | {
  contents?: string;
  delete?: boolean;
  mode?: number;
};
```

Definition for mutating files between manifest comparisons.

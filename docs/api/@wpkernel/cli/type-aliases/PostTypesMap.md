[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / PostTypesMap

# Type Alias: PostTypesMap

```ts
type PostTypesMap = Map<
	string,
	{
		labels: Record<string, string>;
		showInMenu: boolean;
		showUi: boolean;
		taxonomies: Set<string>;
		supports?: readonly string[];
	}
>;
```

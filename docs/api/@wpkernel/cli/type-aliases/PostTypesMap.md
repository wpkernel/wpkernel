[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

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

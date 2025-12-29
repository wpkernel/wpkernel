[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / TaxonomiesMap

# Type Alias: TaxonomiesMap

```ts
type TaxonomiesMap = Map<
	string,
	{
		labels: Record<string, string>;
		objectTypes: Set<string>;
		showAdminColumn: boolean;
		showUi: boolean;
		hierarchical?: boolean;
	}
>;
```

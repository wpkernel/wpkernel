[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

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

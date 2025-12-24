[**@wpkernel/wp-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / CapabilityModuleWarning

# Type Alias: CapabilityModuleWarning

```ts
type CapabilityModuleWarning = 
  | {
  kind: "capability-map-warning";
  warning: CapabilityMapWarning;
}
  | {
  capability: string;
  fallbackCapability: string;
  fallbackScope: CapabilityScope;
  kind: "capability-definition-missing";
}
  | {
  capability: string;
  kind: "capability-definition-unused";
  scope?: CapabilityScope;
};
```

[**@wpkernel/wp-json-ast v0.12.6-beta.2**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / ModuleNamespaceConfig

# Interface: ModuleNamespaceConfig

Configuration for deriving a module namespace.

## Properties

### pluginNamespace

```ts
readonly pluginNamespace: string;
```

The root namespace of the plugin.

***

### sanitizedPluginNamespace?

```ts
readonly optional sanitizedPluginNamespace: string | null;
```

An optional sanitized version of the plugin namespace.

***

### segments?

```ts
readonly optional segments: readonly ModuleNamespaceSegment[];
```

Optional namespace segments to append to the root namespace.

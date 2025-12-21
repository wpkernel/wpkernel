[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / WPKernelConfigV1

# Interface: WPKernelConfigV1

Shape of a v1 wpk configuration object.

## Properties

### namespace

```ts
namespace: string;
```

Short, slug-style identifier for this plugin or feature.
Used as a prefix for generated PHP namespaces, JS store keys,
and WordPress capability names.

***

### resources

```ts
resources: ResourceRegistry;
```

Registry of resource descriptors keyed by identifier.
Required and drives routes, storage, capabilities, UI, and builders.

***

### schemas

```ts
schemas: SchemaRegistry;
```

Registry of shared schema descriptors keyed by identifier.
Required but may be empty.

***

### version

```ts
version: 1;
```

***

### $schema?

```ts
optional $schema: string;
```

Optional JSON Schema URI used by editors and tooling.
Ignored by WPKernel at runtime.

***

### adapters?

```ts
optional adapters: AdaptersConfig&lt;unknown, unknown&gt;;
```

***

### directories?

```ts
optional directories: Record&lt;string, string&gt;;
```

Optional mapping of applied artifact identifiers to workspace-relative
directories (omit the ".applied" suffix). Supported keys:
blocks, blocks.applied, controllers, controllers.applied, plugin,
plugin.loader.

***

### meta?

```ts
optional meta: PluginMetaConfig;
```

Optional plugin metadata used for generated plugin headers. When omitted,
sane defaults are derived from the namespace.

***

### readiness?

```ts
optional readiness: ReadinessConfig;
```

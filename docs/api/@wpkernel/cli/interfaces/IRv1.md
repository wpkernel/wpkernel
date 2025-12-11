[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / IRv1

# Interface: IRv1

The top-level Intermediate Representation (IR) for version 1.

## Properties

### artifacts

```ts
artifacts: IRArtifactsPlan;
```

Planned artifact paths for builders.

***

### blocks

```ts
blocks: IRBlock[];
```

An array of block IRs.

***

### capabilities

```ts
capabilities: IRCapabilityHint[];
```

An array of capability hints.

***

### capabilityMap

```ts
capabilityMap: IRCapabilityMap;
```

The capability map IR.

***

### layout

```ts
layout: IRLayout;
```

Resolved layout map for internal/applied artifacts.

***

### meta

```ts
meta: object;
```

Metadata about the IR, including version, namespace, and source information.

#### features

```ts
features: string[];
```

#### ids

```ts
ids: object;
```

##### ids.algorithm

```ts
algorithm: "sha256";
```

##### ids.blockPrefix

```ts
blockPrefix: "blk:";
```

##### ids.capabilityPrefix

```ts
capabilityPrefix: "cap:";
```

##### ids.resourcePrefix

```ts
resourcePrefix: "res:";
```

##### ids.schemaPrefix

```ts
schemaPrefix: "sch:";
```

#### limits

```ts
limits: object;
```

##### limits.maxConfigKB

```ts
maxConfigKB: number;
```

##### limits.maxSchemaKB

```ts
maxSchemaKB: number;
```

##### limits.policy

```ts
policy: "truncate" | "error";
```

#### namespace

```ts
namespace: string;
```

#### origin

```ts
origin: string;
```

#### plugin

```ts
plugin: IRPluginMeta;
```

WordPress plugin metadata derived from config.

#### redactions

```ts
redactions: string[];
```

#### sanitizedNamespace

```ts
sanitizedNamespace: string;
```

#### sourcePath

```ts
sourcePath: string;
```

#### version

```ts
version: 1;
```

***

### php

```ts
php: IRPhpProject;
```

The PHP project IR.

***

### resources

```ts
resources: IRResource[];
```

An array of resource IRs.

***

### schemas

```ts
schemas: IRSchema[];
```

An array of schema IRs.

***

### adapterAudit?

```ts
optional adapterAudit: IRAdapterAudit;
```

Optional: Adapter change audit trail.

***

### bundler?

```ts
optional bundler: IRBundler;
```

Bundler surface paths for UI assets.

***

### diagnostics?

```ts
optional diagnostics: IRDiagnostic[];
```

Optional: An array of diagnostic messages.

***

### references?

```ts
optional references: IRReferenceSummary;
```

Optional: Cross-reference summary for CI inspection.

***

### ui?

```ts
optional ui: IRUiSurface;
```

Optional: UI metadata derived from resources.

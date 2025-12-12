[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / MutableIr

# Interface: MutableIr

## Properties

### artifacts

```ts
artifacts: IRArtifactsPlan | null;
```

***

### blocks

```ts
blocks: IRBlock[];
```

***

### bundler

```ts
bundler: IRBundler | null;
```

***

### capabilities

```ts
capabilities: IRCapabilityHint[];
```

***

### capabilityMap

```ts
capabilityMap: IRCapabilityMap | null;
```

***

### config

```ts
readonly config: WPKernelConfigV1;
```

***

### diagnostics

```ts
diagnostics: IRDiagnostic[];
```

***

### extensions

```ts
extensions: Record&lt;string, unknown&gt;;
```

***

### layout

```ts
layout: IRLayout | null;
```

***

### meta

```ts
meta: 
  | {
  features: string[];
  ids: {
     algorithm: "sha256";
     blockPrefix: "blk:";
     capabilityPrefix: "cap:";
     resourcePrefix: "res:";
     schemaPrefix: "sch:";
  };
  limits: {
     maxConfigKB: number;
     maxSchemaKB: number;
     policy: "truncate" | "error";
  };
  namespace: string;
  origin: string;
  plugin: IRPluginMeta;
  redactions: string[];
  sanitizedNamespace: string;
  sourcePath: string;
  version: 1;
}
  | null;
```

#### Type Declaration

```ts
{
  features: string[];
  ids: {
     algorithm: "sha256";
     blockPrefix: "blk:";
     capabilityPrefix: "cap:";
     resourcePrefix: "res:";
     schemaPrefix: "sch:";
  };
  limits: {
     maxConfigKB: number;
     maxSchemaKB: number;
     policy: "truncate" | "error";
  };
  namespace: string;
  origin: string;
  plugin: IRPluginMeta;
  redactions: string[];
  sanitizedNamespace: string;
  sourcePath: string;
  version: 1;
}
```

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

`null`

***

### php

```ts
php: IRPhpProject | null;
```

***

### references

```ts
references: IRReferenceSummary | null;
```

***

### resources

```ts
resources: IRResource[];
```

***

### schemas

```ts
schemas: IRSchema[];
```

***

### ui

```ts
ui: IRUiSurface | null;
```

[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / TsBuilderCreatorContext

# Interface: TsBuilderCreatorContext

Context provided to a `TsBuilderCreator` function.

## Properties

### descriptor

```ts
readonly descriptor: ResourceDescriptor;
```

The resource descriptor for which artifacts are being created.

***

### emit()

```ts
readonly emit: (options) =&gt; Promise&lt;TsBuilderEmitResult&gt;;
```

A function to emit a generated TypeScript file.

#### Parameters

##### options

[`TsBuilderEmitOptions`](TsBuilderEmitOptions.md)

#### Returns

`Promise`&lt;`TsBuilderEmitResult`&gt;

***

### ir

```ts
readonly ir: IRv1;
```

The Intermediate Representation (IR) of the project.

***

### paths

```ts
readonly paths: object;
```

Resolved layout paths required for TS generation.

#### blocksApplied

```ts
readonly blocksApplied: string;
```

#### blocksGenerated

```ts
readonly blocksGenerated: string;
```

#### runtimeApplied

```ts
readonly runtimeApplied: string;
```

#### runtimeGenerated

```ts
readonly runtimeGenerated: string;
```

#### surfacesApplied

```ts
readonly surfacesApplied: string;
```

***

### project

```ts
readonly project: Project;
```

The `ts-morph` project instance for managing source files.

***

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance for logging.

***

### sourcePath

```ts
readonly sourcePath: string;
```

The source path of the configuration file.

***

### workspace

```ts
readonly workspace: Workspace;
```

The workspace instance.

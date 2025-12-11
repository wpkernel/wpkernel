[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / persistProgramArtifacts

# Function: persistProgramArtifacts()

```ts
function persistProgramArtifacts(
   context, 
   output, 
   filePath, 
   code, 
   ast, 
options): Promise&lt;void&gt;;
```

## Parameters

### context

[`PipelineContext`](../interfaces/PipelineContext.md)

### output

[`BuilderOutput`](../interfaces/BuilderOutput.md)

### filePath

`string`

### code

`string`

### ast

[`PhpProgram`](../type-aliases/PhpProgram.md)

### options

[`PersistProgramArtifactsOptions`](../interfaces/PersistProgramArtifactsOptions.md) = `{}`

## Returns

`Promise`&lt;`void`&gt;

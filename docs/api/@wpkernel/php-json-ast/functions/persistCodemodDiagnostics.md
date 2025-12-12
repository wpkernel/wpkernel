[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / persistCodemodDiagnostics

# Function: persistCodemodDiagnostics()

```ts
function persistCodemodDiagnostics(
	context,
	output,
	filePath,
	codemod,
	options
): Promise<void>;
```

## Parameters

### context

[`PipelineContext`](../interfaces/PipelineContext.md)

### output

[`BuilderOutput`](../interfaces/BuilderOutput.md)

### filePath

`string`

### codemod

[`PhpProgramCodemodResult`](../interfaces/PhpProgramCodemodResult.md)

### options

[`PersistProgramArtifactsOptions`](../interfaces/PersistProgramArtifactsOptions.md) = `{}`

## Returns

`Promise`<`void`>

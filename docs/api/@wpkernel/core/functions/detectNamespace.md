[**@wpkernel/core v0.12.6-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / detectNamespace

# Function: detectNamespace()

```ts
function detectNamespace(options): NamespaceDetectionResult;
```

Detect namespace with intelligent auto-detection

Implements the detection priority cascade:
1. Explicit namespace parameter
2. Build-time defines (__WPK_NAMESPACE__, import.meta.env.WPK_NAMESPACE)
3. Module ID extraction (Script Modules pattern)
4. WordPress plugin header 'Text Domain'
5. package.json 'name' field
6. Fallback to default

## Parameters

### options

[`NamespaceDetectionOptions`](../type-aliases/NamespaceDetectionOptions.md) = `{}`

Detection options

## Returns

[`NamespaceDetectionResult`](../type-aliases/NamespaceDetectionResult.md)

Detection result with namespace and metadata

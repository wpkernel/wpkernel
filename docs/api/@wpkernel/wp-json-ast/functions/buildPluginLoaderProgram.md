[**@wpkernel/wp-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / buildPluginLoaderProgram

# Function: buildPluginLoaderProgram()

```ts
function buildPluginLoaderProgram(config): PhpProgram;
```

Build the plugin loader program for a generated plugin.

This orchestrates header, namespace guards, controller registration, UI wiring,
and bootstrap hooks. Heavy lifting lives in loader/\* modules to keep this file concise.

## Parameters

### config

[`PluginLoaderProgramConfig`](../interfaces/PluginLoaderProgramConfig.md)

## Returns

`PhpProgram`

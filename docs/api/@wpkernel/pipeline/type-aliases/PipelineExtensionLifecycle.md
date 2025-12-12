[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / PipelineExtensionLifecycle

# Type Alias: PipelineExtensionLifecycle

```ts
type PipelineExtensionLifecycle =
	| 'prepare'
	| 'before-fragments'
	| 'after-fragments'
	| 'before-builders'
	| 'after-builders'
	| 'finalize'
	| (string & object);
```

Options passed to pipeline extension hooks.

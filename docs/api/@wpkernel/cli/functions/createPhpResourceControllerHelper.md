[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / createPhpResourceControllerHelper

# Function: createPhpResourceControllerHelper()

```ts
function createPhpResourceControllerHelper(): BuilderHelper;
```

Creates a PHP builder helper for resource-specific REST controllers.

This helper iterates through each resource defined in the IR and generates
a corresponding REST controller. It integrates with various storage helpers
(transient, wp-option, wp-taxonomy, wp-post) to provide appropriate CRUD
operations for each resource.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for generating resource REST controllers.

[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / WPK_EXIT_CODES

# Variable: WPK_EXIT_CODES

```ts
const WPK_EXIT_CODES: object;
```

Framework-wide exit codes for CLI tooling and scripts.

## Type Declaration

### ADAPTER_ERROR

```ts
readonly ADAPTER_ERROR: 3 = 3;
```

Adapter or extension evaluation failed.

### SUCCESS

```ts
readonly SUCCESS: 0 = 0;
```

Command completed successfully.

### UNEXPECTED_ERROR

```ts
readonly UNEXPECTED_ERROR: 2 = 2;
```

Runtime failure outside adapter evaluation.

### VALIDATION_ERROR

```ts
readonly VALIDATION_ERROR: 1 = 1;
```

User/action validation failed.

[**@wpkernel/core v0.12.3-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / WPK\_EXIT\_CODES

# Variable: WPK\_EXIT\_CODES

```ts
const WPK_EXIT_CODES: object;
```

Framework-wide exit codes for CLI tooling and scripts.

## Type Declaration

### ADAPTER\_ERROR

```ts
readonly ADAPTER_ERROR: 3 = 3;
```

Adapter or extension evaluation failed.

### SUCCESS

```ts
readonly SUCCESS: 0 = 0;
```

Command completed successfully.

### UNEXPECTED\_ERROR

```ts
readonly UNEXPECTED_ERROR: 2 = 2;
```

Runtime failure outside adapter evaluation.

### VALIDATION\_ERROR

```ts
readonly VALIDATION_ERROR: 1 = 1;
```

User/action validation failed.

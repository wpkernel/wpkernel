[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / FragmentIrOptions

# Interface: FragmentIrOptions

Options for building the Intermediate Representation (IR).

## Properties

### config

```ts
config: WPKernelConfigV1;
```

Normalised configuration surface available to IR builders.

Builders must not depend on raw WPKernelConfigV1 to avoid leaking config shape changes.

---

### namespace

```ts
namespace: string;
```

The namespace of the project.

---

### origin

```ts
origin: string;
```

The origin of the configuration.

---

### sourcePath

```ts
sourcePath: string;
```

The source path of the configuration file.

---

### pipeline?

```ts
optional pipeline: Pipeline;
```

Optional: Pipeline to use for building the IR.

[**@wpkernel/test-utils v0.12.5-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / RunNodeProcessOptions

# Interface: RunNodeProcessOptions

## Extends

- [`RunProcessOptions`](RunProcessOptions.md)

## Properties

### cwd?

```ts
optional cwd: string | URL;
```

#### Inherited from

[`RunProcessOptions`](RunProcessOptions.md).[`cwd`](RunProcessOptions.md#cwd)

---

### env?

```ts
optional env: ProcessEnv;
```

#### Inherited from

[`RunProcessOptions`](RunProcessOptions.md).[`env`](RunProcessOptions.md#env)

---

### extras?

```ts
optional extras: readonly string[];
```

---

### input?

```ts
optional input: string | Buffer<ArrayBufferLike>;
```

#### Inherited from

[`RunProcessOptions`](RunProcessOptions.md).[`input`](RunProcessOptions.md#input)

---

### loader?

```ts
optional loader: string;
```

---

### noWarnings?

```ts
optional noWarnings: boolean;
```

---

### signal?

```ts
optional signal: AbortSignal;
```

#### Inherited from

[`RunProcessOptions`](RunProcessOptions.md).[`signal`](RunProcessOptions.md#signal)

---

### stdio?

```ts
optional stdio: StdioOptions;
```

#### Inherited from

[`RunProcessOptions`](RunProcessOptions.md).[`stdio`](RunProcessOptions.md#stdio)

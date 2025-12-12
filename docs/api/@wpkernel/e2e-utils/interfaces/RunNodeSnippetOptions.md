[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / RunNodeSnippetOptions

# Interface: RunNodeSnippetOptions

Options for executing a Node.js snippet through the CLI runner.

## Extends

- `CliCommandOptions`

## Properties

### script

```ts
script: string;
```

---

### args?

```ts
optional args: string[];
```

---

### cwd?

```ts
optional cwd: string;
```

#### Inherited from

```ts
CliCommandOptions.cwd;
```

---

### env?

```ts
optional env: ProcessEnv;
```

#### Inherited from

```ts
CliCommandOptions.env;
```

---

### stdin?

```ts
optional stdin: string;
```

#### Inherited from

```ts
CliCommandOptions.stdin;
```

---

### timeoutMs?

```ts
optional timeoutMs: number;
```

#### Inherited from

```ts
CliCommandOptions.timeoutMs;
```

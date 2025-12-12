[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / ConfirmPromptOptions

# Interface: ConfirmPromptOptions

Options for the `promptConfirm` function.

## Properties

### message

```ts
readonly message: string;
```

The message to display to the user.

---

### defaultValue?

```ts
readonly optional defaultValue: boolean;
```

Optional: The default value if the user just presses Enter.

---

### input?

```ts
readonly optional input: ReadableStream;
```

Optional: The input stream to read from. Defaults to `process.stdin`.

---

### output?

```ts
readonly optional output: WritableStream;
```

Optional: The output stream to write to. Defaults to `process.stdout`.

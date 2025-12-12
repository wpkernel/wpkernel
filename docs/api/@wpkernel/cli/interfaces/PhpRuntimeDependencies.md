[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / PhpRuntimeDependencies

# Interface: PhpRuntimeDependencies

## Properties

### exec()

```ts
readonly exec: {
  (file): PromiseWithChild<{
}>;
  (file, args): PromiseWithChild<{
}>;
  (file, options): PromiseWithChild<{
}>;
  (file, args, options): PromiseWithChild<{
}>;
  (file, options): PromiseWithChild<{
}>;
  (file, args, options): PromiseWithChild<{
}>;
  (file, options): PromiseWithChild<{
}>;
  (file, args, options): PromiseWithChild<{
}>;
};
```

#### Call Signature

```ts
(file): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

##### Returns

`PromiseWithChild`<\{
\}>

#### Call Signature

```ts
(file, args): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

##### Returns

`PromiseWithChild`<\{
\}>

#### Call Signature

```ts
(file, options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### options

`ExecFileOptionsWithBufferEncoding`

##### Returns

`PromiseWithChild`<\{
\}>

#### Call Signature

```ts
(
   file,
   args,
   options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

###### options

`ExecFileOptionsWithBufferEncoding`

##### Returns

`PromiseWithChild`<\{
\}>

#### Call Signature

```ts
(file, options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### options

`ExecFileOptionsWithStringEncoding`

##### Returns

`PromiseWithChild`<\{
\}>

#### Call Signature

```ts
(
   file,
   args,
   options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

###### options

`ExecFileOptionsWithStringEncoding`

##### Returns

`PromiseWithChild`<\{
\}>

#### Call Signature

```ts
(file, options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### options

`ExecFileOptions` | `null` | `undefined`

##### Returns

`PromiseWithChild`<\{
\}>

#### Call Signature

```ts
(
   file,
   args,
   options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

###### options

`ExecFileOptions` | `null` | `undefined`

##### Returns

`PromiseWithChild`<\{
\}>

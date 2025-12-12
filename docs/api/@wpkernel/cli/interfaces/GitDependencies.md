[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / GitDependencies

# Interface: GitDependencies

## Properties

### exec()?

```ts
readonly optional exec: {
  (file): PromiseWithChild&lt;{
}&gt;;
  (file, args): PromiseWithChild&lt;{
}&gt;;
  (file, options): PromiseWithChild&lt;{
}&gt;;
  (file, args, options): PromiseWithChild&lt;{
}&gt;;
  (file, options): PromiseWithChild&lt;{
}&gt;;
  (file, args, options): PromiseWithChild&lt;{
}&gt;;
  (file, options): PromiseWithChild&lt;{
}&gt;;
  (file, args, options): PromiseWithChild&lt;{
}&gt;;
};
```

#### Call Signature

```ts
(file): PromiseWithChild&lt;{
}&gt;;
```

##### Parameters

###### file

`string`

##### Returns

`PromiseWithChild`&lt;\{
\}&gt;

#### Call Signature

```ts
(file, args): PromiseWithChild&lt;{
}&gt;;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

##### Returns

`PromiseWithChild`&lt;\{
\}&gt;

#### Call Signature

```ts
(file, options): PromiseWithChild&lt;{
}&gt;;
```

##### Parameters

###### file

`string`

###### options

`ExecFileOptionsWithBufferEncoding`

##### Returns

`PromiseWithChild`&lt;\{
\}&gt;

#### Call Signature

```ts
(
   file, 
   args, 
   options): PromiseWithChild&lt;{
}&gt;;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

###### options

`ExecFileOptionsWithBufferEncoding`

##### Returns

`PromiseWithChild`&lt;\{
\}&gt;

#### Call Signature

```ts
(file, options): PromiseWithChild&lt;{
}&gt;;
```

##### Parameters

###### file

`string`

###### options

`ExecFileOptionsWithStringEncoding`

##### Returns

`PromiseWithChild`&lt;\{
\}&gt;

#### Call Signature

```ts
(
   file, 
   args, 
   options): PromiseWithChild&lt;{
}&gt;;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

###### options

`ExecFileOptionsWithStringEncoding`

##### Returns

`PromiseWithChild`&lt;\{
\}&gt;

#### Call Signature

```ts
(file, options): PromiseWithChild&lt;{
}&gt;;
```

##### Parameters

###### file

`string`

###### options

`ExecFileOptions` | `null` | `undefined`

##### Returns

`PromiseWithChild`&lt;\{
\}&gt;

#### Call Signature

```ts
(
   file, 
   args, 
   options): PromiseWithChild&lt;{
}&gt;;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

###### options

`ExecFileOptions` | `null` | `undefined`

##### Returns

`PromiseWithChild`&lt;\{
\}&gt;

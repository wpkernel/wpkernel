[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / PhpPrinterPathDependencies

# Interface: PhpPrinterPathDependencies

## Properties

### access()

```ts
readonly access: (path, mode?) =&gt; Promise&lt;void&gt;;
```

Tests a user's permissions for the file or directory specified by `path`.
The `mode` argument is an optional integer that specifies the accessibility
checks to be performed. `mode` should be either the value `fs.constants.F_OK` or a mask consisting of the bitwise OR of any of `fs.constants.R_OK`, `fs.constants.W_OK`, and `fs.constants.X_OK`
(e.g.`fs.constants.W_OK | fs.constants.R_OK`). Check `File access constants` for
possible values of `mode`.

If the accessibility check is successful, the promise is fulfilled with no
value. If any of the accessibility checks fail, the promise is rejected
with an [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object. The following example checks if the file`/etc/passwd` can be read and
written by the current process.

```js
import { access, constants } from 'node:fs/promises';

try {
  await access('/etc/passwd', constants.R_OK | constants.W_OK);
  console.log('can access');
} catch {
  console.error('cannot access');
}
```

Using `fsPromises.access()` to check for the accessibility of a file before
calling `fsPromises.open()` is not recommended. Doing so introduces a race
condition, since other processes may change the file's state between the two
calls. Instead, user code should open/read/write the file directly and handle
the error raised if the file is not accessible.

#### Parameters

##### path

`PathLike`

##### mode?

`number`

#### Returns

`Promise`&lt;`void`&gt;

Fulfills with `undefined` upon success.

#### Since

v10.0.0

***

### realpath()

```ts
readonly realpath: {
  (path, options?): Promise&lt;string&gt;;
  (path, options): Promise&lt;NonSharedBuffer&gt;;
  (path, options?): Promise&lt;string | NonSharedBuffer&gt;;
};
```

#### Call Signature

```ts
(path, options?): Promise&lt;string&gt;;
```

Determines the actual location of `path` using the same semantics as the `fs.realpath.native()` function.

Only paths that can be converted to UTF8 strings are supported.

The optional `options` argument can be a string specifying an encoding, or an
object with an `encoding` property specifying the character encoding to use for
the path. If the `encoding` is set to `'buffer'`, the path returned will be
passed as a `Buffer` object.

On Linux, when Node.js is linked against musl libc, the procfs file system must
be mounted on `/proc` in order for this function to work. Glibc does not have
this restriction.

##### Parameters

###### path

`PathLike`

###### options?

`ObjectEncodingOptions` | `BufferEncoding` | `null`

##### Returns

`Promise`&lt;`string`&gt;

Fulfills with the resolved path upon success.

##### Since

v10.0.0

#### Call Signature

```ts
(path, options): Promise&lt;NonSharedBuffer&gt;;
```

Asynchronous realpath(3) - return the canonicalized absolute pathname.

##### Parameters

###### path

`PathLike`

A path to a file. If a URL is provided, it must use the `file:` protocol.

###### options

`BufferEncodingOption`

The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.

##### Returns

`Promise`&lt;`NonSharedBuffer`&gt;

#### Call Signature

```ts
(path, options?): Promise&lt;string | NonSharedBuffer&gt;;
```

Asynchronous realpath(3) - return the canonicalized absolute pathname.

##### Parameters

###### path

`PathLike`

A path to a file. If a URL is provided, it must use the `file:` protocol.

###### options?

The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.

`ObjectEncodingOptions` | `BufferEncoding` | `null`

##### Returns

`Promise`&lt;`string` \| `NonSharedBuffer`&gt;

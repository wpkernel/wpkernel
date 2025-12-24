[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

***

[@wpkernel/cli](../README.md) / FileSystem

# Interface: FileSystem

File system operations interface for start command.

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

### cp()

```ts
readonly cp: (source, destination, opts?) =&gt; Promise&lt;void&gt;;
```

**`Experimental`**

Asynchronously copies the entire directory structure from `src` to `dest`,
including subdirectories and files.

When copying a directory to another directory, globs are not supported and
behavior is similar to `cp dir1/ dir2/`.

#### Parameters

##### source

`string` | `URL`

##### destination

`string` | `URL`

##### opts?

`CopyOptions`

#### Returns

`Promise`&lt;`void`&gt;

Fulfills with `undefined` upon success.

#### Since

v16.7.0

***

### mkdir()

```ts
readonly mkdir: {
  (path, options): Promise&lt;string | undefined&gt;;
  (path, options?): Promise&lt;void&gt;;
  (path, options?): Promise&lt;string | undefined&gt;;
};
```

#### Call Signature

```ts
(path, options): Promise&lt;string | undefined&gt;;
```

Asynchronously creates a directory.

The optional `options` argument can be an integer specifying `mode` (permission
and sticky bits), or an object with a `mode` property and a `recursive` property indicating whether parent directories should be created. Calling `fsPromises.mkdir()` when `path` is a directory
that exists results in a
rejection only when `recursive` is false.

```js
import { mkdir } from 'node:fs/promises';

try {
  const projectFolder = new URL('./test/project/', import.meta.url);
  const createDir = await mkdir(projectFolder, { recursive: true });

  console.log(`created ${createDir}`);
} catch (err) {
  console.error(err.message);
}
```

##### Parameters

###### path

`PathLike`

###### options

`MakeDirectoryOptions` & `object`

##### Returns

`Promise`&lt;`string` \| `undefined`&gt;

Upon success, fulfills with `undefined` if `recursive` is `false`, or the first directory path created if `recursive` is `true`.

##### Since

v10.0.0

#### Call Signature

```ts
(path, options?): Promise&lt;void&gt;;
```

Asynchronous mkdir(2) - create a directory.

##### Parameters

###### path

`PathLike`

A path to a file. If a URL is provided, it must use the `file:` protocol.

###### options?

Either the file mode, or an object optionally specifying the file mode and whether parent folders
should be created. If a string is passed, it is parsed as an octal integer. If not specified, defaults to `0o777`.

`Mode` | `MakeDirectoryOptions` & `object` | `null`

##### Returns

`Promise`&lt;`void`&gt;

#### Call Signature

```ts
(path, options?): Promise&lt;string | undefined&gt;;
```

Asynchronous mkdir(2) - create a directory.

##### Parameters

###### path

`PathLike`

A path to a file. If a URL is provided, it must use the `file:` protocol.

###### options?

Either the file mode, or an object optionally specifying the file mode and whether parent folders
should be created. If a string is passed, it is parsed as an octal integer. If not specified, defaults to `0o777`.

`MakeDirectoryOptions` | `Mode` | `null`

##### Returns

`Promise`&lt;`string` \| `undefined`&gt;

[**@wpkernel/cli v0.12.4-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / InstallerDependencies

# Interface: InstallerDependencies

## Properties

### spawn()?

```ts
readonly optional spawn: {
  (command, options?): ChildProcessWithoutNullStreams;
  (command, options): ChildProcessByStdio&lt;Writable, Readable, Readable&gt;;
  (command, options): ChildProcessByStdio&lt;Writable, Readable, null&gt;;
  (command, options): ChildProcessByStdio&lt;Writable, null, Readable&gt;;
  (command, options): ChildProcessByStdio&lt;null, Readable, Readable&gt;;
  (command, options): ChildProcessByStdio&lt;Writable, null, null&gt;;
  (command, options): ChildProcessByStdio&lt;null, Readable, null&gt;;
  (command, options): ChildProcessByStdio&lt;null, null, Readable&gt;;
  (command, options): ChildProcessByStdio&lt;null, null, null&gt;;
  (command, options): ChildProcess;
  (command, args?, options?): ChildProcessWithoutNullStreams;
  (command, args, options): ChildProcessByStdio&lt;Writable, Readable, Readable&gt;;
  (command, args, options): ChildProcessByStdio&lt;Writable, Readable, null&gt;;
  (command, args, options): ChildProcessByStdio&lt;Writable, null, Readable&gt;;
  (command, args, options): ChildProcessByStdio&lt;null, Readable, Readable&gt;;
  (command, args, options): ChildProcessByStdio&lt;Writable, null, null&gt;;
  (command, args, options): ChildProcessByStdio&lt;null, Readable, null&gt;;
  (command, args, options): ChildProcessByStdio&lt;null, null, Readable&gt;;
  (command, args, options): ChildProcessByStdio&lt;null, null, null&gt;;
  (command, args, options): ChildProcess;
};
```

A custom spawn function, typically from 'node:child_process'.

#### Call Signature

```ts
(command, options?): ChildProcessWithoutNullStreams;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options?

`SpawnOptionsWithoutStdio`

##### Returns

`ChildProcessWithoutNullStreams`

##### Since

v0.1.90

#### Call Signature

```ts
(command, options): ChildProcessByStdio&lt;Writable, Readable, Readable&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioPipe`, `StdioPipe`, `StdioPipe`&gt;

##### Returns

`ChildProcessByStdio`&lt;`Writable`, `Readable`, `Readable`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(command, options): ChildProcessByStdio&lt;Writable, Readable, null&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioPipe`, `StdioPipe`, `StdioNull`&gt;

##### Returns

`ChildProcessByStdio`&lt;`Writable`, `Readable`, `null`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(command, options): ChildProcessByStdio&lt;Writable, null, Readable&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioPipe`, `StdioNull`, `StdioPipe`&gt;

##### Returns

`ChildProcessByStdio`&lt;`Writable`, `null`, `Readable`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(command, options): ChildProcessByStdio&lt;null, Readable, Readable&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioNull`, `StdioPipe`, `StdioPipe`&gt;

##### Returns

`ChildProcessByStdio`&lt;`null`, `Readable`, `Readable`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(command, options): ChildProcessByStdio&lt;Writable, null, null&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioPipe`, `StdioNull`, `StdioNull`&gt;

##### Returns

`ChildProcessByStdio`&lt;`Writable`, `null`, `null`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(command, options): ChildProcessByStdio&lt;null, Readable, null&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioNull`, `StdioPipe`, `StdioNull`&gt;

##### Returns

`ChildProcessByStdio`&lt;`null`, `Readable`, `null`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(command, options): ChildProcessByStdio&lt;null, null, Readable&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioNull`, `StdioNull`, `StdioPipe`&gt;

##### Returns

`ChildProcessByStdio`&lt;`null`, `null`, `Readable`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(command, options): ChildProcessByStdio&lt;null, null, null&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioNull`, `StdioNull`, `StdioNull`&gt;

##### Returns

`ChildProcessByStdio`&lt;`null`, `null`, `null`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(command, options): ChildProcess;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### options

`SpawnOptions`

##### Returns

`ChildProcess`

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args?, 
   options?): ChildProcessWithoutNullStreams;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args?

readonly `string`[]

List of string arguments.

###### options?

`SpawnOptionsWithoutStdio`

##### Returns

`ChildProcessWithoutNullStreams`

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args, 
options): ChildProcessByStdio&lt;Writable, Readable, Readable&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args

readonly `string`[]

List of string arguments.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioPipe`, `StdioPipe`, `StdioPipe`&gt;

##### Returns

`ChildProcessByStdio`&lt;`Writable`, `Readable`, `Readable`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args, 
options): ChildProcessByStdio&lt;Writable, Readable, null&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args

readonly `string`[]

List of string arguments.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioPipe`, `StdioPipe`, `StdioNull`&gt;

##### Returns

`ChildProcessByStdio`&lt;`Writable`, `Readable`, `null`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args, 
options): ChildProcessByStdio&lt;Writable, null, Readable&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args

readonly `string`[]

List of string arguments.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioPipe`, `StdioNull`, `StdioPipe`&gt;

##### Returns

`ChildProcessByStdio`&lt;`Writable`, `null`, `Readable`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args, 
options): ChildProcessByStdio&lt;null, Readable, Readable&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args

readonly `string`[]

List of string arguments.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioNull`, `StdioPipe`, `StdioPipe`&gt;

##### Returns

`ChildProcessByStdio`&lt;`null`, `Readable`, `Readable`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args, 
options): ChildProcessByStdio&lt;Writable, null, null&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args

readonly `string`[]

List of string arguments.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioPipe`, `StdioNull`, `StdioNull`&gt;

##### Returns

`ChildProcessByStdio`&lt;`Writable`, `null`, `null`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args, 
options): ChildProcessByStdio&lt;null, Readable, null&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args

readonly `string`[]

List of string arguments.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioNull`, `StdioPipe`, `StdioNull`&gt;

##### Returns

`ChildProcessByStdio`&lt;`null`, `Readable`, `null`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args, 
options): ChildProcessByStdio&lt;null, null, Readable&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args

readonly `string`[]

List of string arguments.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioNull`, `StdioNull`, `StdioPipe`&gt;

##### Returns

`ChildProcessByStdio`&lt;`null`, `null`, `Readable`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args, 
options): ChildProcessByStdio&lt;null, null, null&gt;;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args

readonly `string`[]

List of string arguments.

###### options

`SpawnOptionsWithStdioTuple`&lt;`StdioNull`, `StdioNull`, `StdioNull`&gt;

##### Returns

`ChildProcessByStdio`&lt;`null`, `null`, `null`&gt;

##### Since

v0.1.90

#### Call Signature

```ts
(
   command, 
   args, 
   options): ChildProcess;
```

The `child_process.spawn()` method spawns a new process using the given `command`, with command-line arguments in `args`. If omitted, `args` defaults
to an empty array.

**If the `shell` option is enabled, do not pass unsanitized user input to this**
**function. Any input containing shell metacharacters may be used to trigger**
**arbitrary command execution.**

A third argument may be used to specify additional options, with these defaults:

```js
const defaults = {
  cwd: undefined,
  env: process.env,
};
```

Use `cwd` to specify the working directory from which the process is spawned.
If not given, the default is to inherit the current working directory. If given,
but the path does not exist, the child process emits an `ENOENT` error
and exits immediately. `ENOENT` is also emitted when the command
does not exist.

Use `env` to specify environment variables that will be visible to the new
process, the default is `process.env`.

`undefined` values in `env` will be ignored.

Example of running `ls -lh /usr`, capturing `stdout`, `stderr`, and the
exit code:

```js
import { spawn } from 'node:child_process';
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) =&gt; {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) =&gt; {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) =&gt; {
  console.log(`child process exited with code ${code}`);
});
```

Example: A very elaborate way to run `ps ax | grep ssh`

```js
import { spawn } from 'node:child_process';
const ps = spawn('ps', ['ax']);
const grep = spawn('grep', ['ssh']);

ps.stdout.on('data', (data) =&gt; {
  grep.stdin.write(data);
});

ps.stderr.on('data', (data) =&gt; {
  console.error(`ps stderr: ${data}`);
});

ps.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`ps process exited with code ${code}`);
  }
  grep.stdin.end();
});

grep.stdout.on('data', (data) =&gt; {
  console.log(data.toString());
});

grep.stderr.on('data', (data) =&gt; {
  console.error(`grep stderr: ${data}`);
});

grep.on('close', (code) =&gt; {
  if (code !== 0) {
    console.log(`grep process exited with code ${code}`);
  }
});
```

Example of checking for failed `spawn`:

```js
import { spawn } from 'node:child_process';
const subprocess = spawn('bad_command');

subprocess.on('error', (err) =&gt; {
  console.error('Failed to start subprocess.');
});
```

Certain platforms (macOS, Linux) will use the value of `argv[0]` for the process
title while others (Windows, SunOS) will use `command`.

Node.js overwrites `argv[0]` with `process.execPath` on startup, so `process.argv[0]` in a Node.js child process will not match the `argv0` parameter passed to `spawn` from the parent. Retrieve
it with the `process.argv0` property instead.

If the `signal` option is enabled, calling `.abort()` on the corresponding `AbortController` is similar to calling `.kill()` on the child process except
the error passed to the callback will be an `AbortError`:

```js
import { spawn } from 'node:child_process';
const controller = new AbortController();
const { signal } = controller;
const grep = spawn('grep', ['ssh'], { signal });
grep.on('error', (err) =&gt; {
  // This will be called with err being an AbortError if the controller aborts
});
controller.abort(); // Stops the child process
```

##### Parameters

###### command

`string`

The command to run.

###### args

readonly `string`[]

List of string arguments.

###### options

`SpawnOptions`

##### Returns

`ChildProcess`

##### Since

v0.1.90

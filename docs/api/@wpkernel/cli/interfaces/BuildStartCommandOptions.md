[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / BuildStartCommandOptions

# Interface: BuildStartCommandOptions

Options for building the `start` command, allowing for dependency injection.

## Properties

### buildReporter()?

```ts
readonly optional buildReporter: (options) =&gt; Reporter;
```

Optional: Custom reporter builder function.

#### Parameters

##### options

`ReporterOptions` = `{}`

#### Returns

`Reporter`

***

### fileSystem?

```ts
readonly optional fileSystem: Partial&lt;FileSystem&gt;;
```

Optional: Partial file system utility functions for testing.

***

### loadWatch()?

```ts
readonly optional loadWatch: () =&gt; Promise&lt;(paths, options?) =&gt; FSWatcher&gt;;
```

Optional: Custom function to load the `chokidar.watch` function.

#### Returns

`Promise`&lt;(`paths`, `options?`) =&gt; `FSWatcher`&gt;

***

### runGenerate?

```ts
readonly optional runGenerate: GenerateRunner;
```

Optional: Custom generate runner function.

***

### spawnViteProcess()?

```ts
readonly optional spawnViteProcess: (packageManager) =&gt; ChildProcessWithoutNullStreams;
```

Optional: Custom function to spawn the Vite development server process.

#### Parameters

##### packageManager

`PackageManager`

#### Returns

`ChildProcessWithoutNullStreams`

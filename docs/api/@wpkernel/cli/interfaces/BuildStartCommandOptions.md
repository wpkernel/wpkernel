[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildStartCommandOptions

# Interface: BuildStartCommandOptions

Options for building the `start` command, allowing for dependency injection.

## Properties

### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

Optional: Custom reporter builder function.

#### Parameters

##### options

`ReporterOptions` = `{}`

#### Returns

`Reporter`

---

### fileSystem?

```ts
readonly optional fileSystem: Partial<FileSystem>;
```

Optional: Partial file system utility functions for testing.

---

### loadWatch()?

```ts
readonly optional loadWatch: () => Promise<(paths, options?) => FSWatcher>;
```

Optional: Custom function to load the `chokidar.watch` function.

#### Returns

`Promise`<(`paths`, `options?`) => `FSWatcher`>

---

### runGenerate?

```ts
readonly optional runGenerate: GenerateRunner;
```

Optional: Custom generate runner function.

---

### spawnViteProcess()?

```ts
readonly optional spawnViteProcess: (packageManager) => ChildProcessWithoutNullStreams;
```

Optional: Custom function to spawn the Vite development server process.

#### Parameters

##### packageManager

`PackageManager`

#### Returns

`ChildProcessWithoutNullStreams`

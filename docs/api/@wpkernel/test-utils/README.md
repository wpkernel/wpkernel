**@wpkernel/test-utils v0.12.6-beta.3**

---

# @wpkernel/test-utils v0.12.6-beta.3

## Interfaces

### WordPress Harness

- [ApiFetchHarness](interfaces/ApiFetchHarness.md)
- [ApiFetchHarnessOptions](interfaces/ApiFetchHarnessOptions.md)
- [WithWordPressDataOptions](interfaces/WithWordPressDataOptions.md)
- [WordPressHarnessOverrides](interfaces/WordPressHarnessOverrides.md)
- [WordPressTestHarness](interfaces/WordPressTestHarness.md)

### Action Runtime

- [ActionRuntimeOverrides](interfaces/ActionRuntimeOverrides.md)

### UI Harness

- [WPKernelUITestHarness](interfaces/WPKernelUITestHarness.md)
- [WPKernelUITestHarnessOptions](interfaces/WPKernelUITestHarnessOptions.md)

### Integration

- [WorkspaceOptions](interfaces/WorkspaceOptions.md)

### Test Support

- [BuildCoreActionPipelineHarnessOptions](interfaces/BuildCoreActionPipelineHarnessOptions.md)
- [BuildCoreResourcePipelineHarnessOptions](interfaces/BuildCoreResourcePipelineHarnessOptions.md)
- [CoreActionPipelineHarness](interfaces/CoreActionPipelineHarness.md)
- [CoreResourcePipelineHarness](interfaces/CoreResourcePipelineHarness.md)
- [MemoryReporter](interfaces/MemoryReporter.md)
- [MemoryReporterEntry](interfaces/MemoryReporterEntry.md)
- [RuntimeOverrides](interfaces/RuntimeOverrides.md)

### Other

- [BuildNodeOptionsConfig](interfaces/BuildNodeOptionsConfig.md)
- [RunNodeProcessOptions](interfaces/RunNodeProcessOptions.md)
- [RunProcessOptions](interfaces/RunProcessOptions.md)
- [RunProcessResult](interfaces/RunProcessResult.md)
- [TestLayout](interfaces/TestLayout.md)
- [WordPressPackage](interfaces/WordPressPackage.md)

## Type Aliases

### Action Runtime

- [RuntimeCleanup](type-aliases/RuntimeCleanup.md)

### UI Harness

- [WPKernelUIProviderComponent](type-aliases/WPKernelUIProviderComponent.md)

### Other

- [WordPressData](type-aliases/WordPressData.md)

## Functions

### WordPress Harness

- [createApiFetchHarness](functions/createApiFetchHarness.md)
- [createWordPressTestHarness](functions/createWordPressTestHarness.md)
- [withWordPressData](functions/withWordPressData.md)

### Action Runtime

- [applyActionRuntimeOverrides](functions/applyActionRuntimeOverrides.md)
- [withActionRuntimeOverrides](functions/withActionRuntimeOverrides.md)

### UI Harness

- [createWPKernelUITestHarness](functions/createWPKernelUITestHarness.md)

### Integration

- [buildPhpIntegrationEnv](functions/buildPhpIntegrationEnv.md)
- [createWorkspaceRunner](functions/createWorkspaceRunner.md)
- [withWorkspace](functions/withWorkspace.md)

### Test Support

- [buildCoreActionPipelineHarness](functions/buildCoreActionPipelineHarness.md)
- [buildCoreResourcePipelineHarness](functions/buildCoreResourcePipelineHarness.md)
- [createMemoryReporter](functions/createMemoryReporter.md)

### Other

- [buildCliIntegrationEnv](functions/buildCliIntegrationEnv.md)
- [buildNodeOptions](functions/buildNodeOptions.md)
- [clearNamespaceState](functions/clearNamespaceState.md)
- [createMockWpPackage](functions/createMockWpPackage.md)
- [ensureLayoutManifest](functions/ensureLayoutManifest.md)
- [ensureWpData](functions/ensureWpData.md)
- [loadDefaultLayout](functions/loadDefaultLayout.md)
- [loadTestLayout](functions/loadTestLayout.md)
- [loadTestLayoutSync](functions/loadTestLayoutSync.md)
- [resolveLayoutRelativeSpecifier](functions/resolveLayoutRelativeSpecifier.md)
- [runNodeProcess](functions/runNodeProcess.md)
- [runProcess](functions/runProcess.md)
- [sanitizePhpIntegrationEnv](functions/sanitizePhpIntegrationEnv.md)
- [setKernelPackage](functions/setKernelPackage.md)
- [setProcessEnv](functions/setProcessEnv.md)
- [setWpPluginData](functions/setWpPluginData.md)

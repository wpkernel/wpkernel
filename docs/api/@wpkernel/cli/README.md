**@wpkernel/cli v0.12.6-beta.2**

***

# @wpkernel/cli v0.12.6-beta.2

Top-level exports for the `@wpkernel/cli` package.

This module re-exports the public surface of the CLI package so
documentation generators can build consistent API pages alongside the
wpk and UI packages.

## Classes

- [ReadinessRegistry](classes/ReadinessRegistry.md)

## Interfaces

### Commands

- [BuildCreateCommandOptions](interfaces/BuildCreateCommandOptions.md)
- [BuildDoctorCommandOptions](interfaces/BuildDoctorCommandOptions.md)
- [BuildInitCommandOptions](interfaces/BuildInitCommandOptions.md)
- [BuildStartCommandOptions](interfaces/BuildStartCommandOptions.md)
- [DoctorCheckResult](interfaces/DoctorCheckResult.md)
- [FileSystem](interfaces/FileSystem.md)
- [ValidateGeneratedImportsOptions](interfaces/ValidateGeneratedImportsOptions.md)

### Config

- [LoadedWPKernelConfig](interfaces/LoadedWPKernelConfig.md)
- [ResourceRegistry](interfaces/ResourceRegistry.md)
- [SchemaConfig](interfaces/SchemaConfig.md)
- [SchemaRegistry](interfaces/SchemaRegistry.md)
- [WPKernelConfigV1](interfaces/WPKernelConfigV1.md)

### AST Builders

- [CollatedPhpBlockArtifacts](interfaces/CollatedPhpBlockArtifacts.md)
- [CollatePhpBlockArtifactsOptions](interfaces/CollatePhpBlockArtifactsOptions.md)
- [CreatePhpBuilderOptions](interfaces/CreatePhpBuilderOptions.md)
- [ResourceDescriptor](interfaces/ResourceDescriptor.md)
- [ResourceStorageHelperState](interfaces/ResourceStorageHelperState.md)
- [StageRenderStubsOptions](interfaces/StageRenderStubsOptions.md)
- [TsBuilderAfterEmitOptions](interfaces/TsBuilderAfterEmitOptions.md)
- [TsBuilderCreator](interfaces/TsBuilderCreator.md)
- [TsBuilderCreatorContext](interfaces/TsBuilderCreatorContext.md)
- [TsBuilderEmitOptions](interfaces/TsBuilderEmitOptions.md)
- [TsBuilderLifecycleHooks](interfaces/TsBuilderLifecycleHooks.md)
- [WpOptionStorageHelperArtifacts](interfaces/WpOptionStorageHelperArtifacts.md)
- [WpPostRouteHelperState](interfaces/WpPostRouteHelperState.md)
- [WpTaxonomyStorageHelperArtifacts](interfaces/WpTaxonomyStorageHelperArtifacts.md)

### Adapters

- [AdapterContext](interfaces/AdapterContext.md)
- [AdapterExtension](interfaces/AdapterExtension.md)
- [AdapterExtensionContext](interfaces/AdapterExtensionContext.md)
- [AdaptersConfig](interfaces/AdaptersConfig.md)
- [PhpAdapterConfig](interfaces/PhpAdapterConfig.md)

### Workspace

- [ConfirmPromptOptions](interfaces/ConfirmPromptOptions.md)
- [EnsureCleanDirectoryOptions](interfaces/EnsureCleanDirectoryOptions.md)
- [FileManifest](interfaces/FileManifest.md)
- [MergeMarkers](interfaces/MergeMarkers.md)
- [MergeOptions](interfaces/MergeOptions.md)
- [RemoveOptions](interfaces/RemoveOptions.md)
- [Workspace](interfaces/Workspace.md)
- [WriteJsonOptions](interfaces/WriteJsonOptions.md)

### IR

- [CreateIrEnvironment](interfaces/CreateIrEnvironment.md)
- [FragmentIrOptions](interfaces/FragmentIrOptions.md)
- [IRBlock](interfaces/IRBlock.md)
- [IRCapabilityDefinition](interfaces/IRCapabilityDefinition.md)
- [IRCapabilityHint](interfaces/IRCapabilityHint.md)
- [IRCapabilityMap](interfaces/IRCapabilityMap.md)
- [IRDiagnostic](interfaces/IRDiagnostic.md)
- [IRPhpProject](interfaces/IRPhpProject.md)
- [IRResource](interfaces/IRResource.md)
- [IRResourceCacheKey](interfaces/IRResourceCacheKey.md)
- [IRRoute](interfaces/IRRoute.md)
- [IRSchema](interfaces/IRSchema.md)
- [IRv1](interfaces/IRv1.md)
- [IRWarning](interfaces/IRWarning.md)

### Runtime

- [BuilderInput](interfaces/BuilderInput.md)
- [ConflictDiagnostic](interfaces/ConflictDiagnostic.md)
- [FragmentInput](interfaces/FragmentInput.md)
- [FragmentOutput](interfaces/FragmentOutput.md)
- [MissingDependencyDiagnostic](interfaces/MissingDependencyDiagnostic.md)
- [PipelineContext](interfaces/PipelineContext.md)
- [PipelineExtensionHookResult](interfaces/PipelineExtensionHookResult.md)
- [PipelineRunOptions](interfaces/PipelineRunOptions.md)
- [PipelineRunResult](interfaces/PipelineRunResult.md)
- [PipelineStep](interfaces/PipelineStep.md)
- [UnusedHelperDiagnostic](interfaces/UnusedHelperDiagnostic.md)

### Other

- [ApplyFlags](interfaces/ApplyFlags.md)
- [ApplyLogEntry](interfaces/ApplyLogEntry.md)
- [BootstrapperResolutionDependencies](interfaces/BootstrapperResolutionDependencies.md)
- [BootstrapperResolutionHelperOptions](interfaces/BootstrapperResolutionHelperOptions.md)
- [BootstrapperResolutionState](interfaces/BootstrapperResolutionState.md)
- [BuildApplyCommandOptions](interfaces/BuildApplyCommandOptions.md)
- [BuildDefaultReadinessRegistryOptions](interfaces/BuildDefaultReadinessRegistryOptions.md)
- [BuildGenerateCommandOptions](interfaces/BuildGenerateCommandOptions.md)
- [ComposerHelperDependencies](interfaces/ComposerHelperDependencies.md)
- [ComposerReadinessState](interfaces/ComposerReadinessState.md)
- [CreateBackupsOptions](interfaces/CreateBackupsOptions.md)
- [CreateHelperOptions](interfaces/CreateHelperOptions.md)
- [CreatePhpProgramWriterHelperOptions](interfaces/CreatePhpProgramWriterHelperOptions.md)
- [DefaultReadinessHelperOverrides](interfaces/DefaultReadinessHelperOverrides.md)
- [DxContext](interfaces/DxContext.md)
- [DxEnvironment](interfaces/DxEnvironment.md)
- [FileWriteRecord](interfaces/FileWriteRecord.md)
- [FileWriterSummary](interfaces/FileWriterSummary.md)
- [GenerationManifest](interfaces/GenerationManifest.md)
- [GenerationManifestFile](interfaces/GenerationManifestFile.md)
- [GenerationManifestResourceArtifacts](interfaces/GenerationManifestResourceArtifacts.md)
- [GenerationManifestResourceEntry](interfaces/GenerationManifestResourceEntry.md)
- [GenerationSummary](interfaces/GenerationSummary.md)
- [GitDependencies](interfaces/GitDependencies.md)
- [GitHelperDependencies](interfaces/GitHelperDependencies.md)
- [GitReadinessState](interfaces/GitReadinessState.md)
- [Helper](interfaces/Helper.md)
- [HelperApplyOptions](interfaces/HelperApplyOptions.md)
- [HelperDescriptor](interfaces/HelperDescriptor.md)
- [InitWorkflowOptions](interfaces/InitWorkflowOptions.md)
- [InitWorkflowResult](interfaces/InitWorkflowResult.md)
- [InstallerDependencies](interfaces/InstallerDependencies.md)
- [IrFragmentInput](interfaces/IrFragmentInput.md)
- [IrFragmentOutput](interfaces/IrFragmentOutput.md)
- [MutableIr](interfaces/MutableIr.md)
- [PatchManifest](interfaces/PatchManifest.md)
- [PatchManifestSummary](interfaces/PatchManifestSummary.md)
- [PatchRecord](interfaces/PatchRecord.md)
- [PhpBuilderChannel](interfaces/PhpBuilderChannel.md)
- [PhpCodemodIngestionDependencies](interfaces/PhpCodemodIngestionDependencies.md)
- [PhpCodemodIngestionState](interfaces/PhpCodemodIngestionState.md)
- [PhpDriverConfigurationOptions](interfaces/PhpDriverConfigurationOptions.md)
- [PhpPrinterPathDependencies](interfaces/PhpPrinterPathDependencies.md)
- [PhpPrinterPathState](interfaces/PhpPrinterPathState.md)
- [PhpProgramAction](interfaces/PhpProgramAction.md)
- [PhpRuntimeDependencies](interfaces/PhpRuntimeDependencies.md)
- [PhpRuntimeState](interfaces/PhpRuntimeState.md)
- [PluginLoaderUiConfig](interfaces/PluginLoaderUiConfig.md)
- [PopulateArtifactsBaseOptions](interfaces/PopulateArtifactsBaseOptions.md)
- [PopulateWpPostRouteBundlesOptions](interfaces/PopulateWpPostRouteBundlesOptions.md)
- [QuickstartDependencies](interfaces/QuickstartDependencies.md)
- [QuickstartHelperOptions](interfaces/QuickstartHelperOptions.md)
- [QuickstartRunResult](interfaces/QuickstartRunResult.md)
- [QuickstartState](interfaces/QuickstartState.md)
- [ReadinessConfirmation](interfaces/ReadinessConfirmation.md)
- [ReadinessDetection](interfaces/ReadinessDetection.md)
- [ReadinessHelper](interfaces/ReadinessHelper.md)
- [ReadinessHelperDescriptor](interfaces/ReadinessHelperDescriptor.md)
- [ReadinessHelperFactoryContext](interfaces/ReadinessHelperFactoryContext.md)
- [ReadinessOutcome](interfaces/ReadinessOutcome.md)
- [ReadinessPlan](interfaces/ReadinessPlan.md)
- [ReadinessRunResult](interfaces/ReadinessRunResult.md)
- [ReadinessStepResult](interfaces/ReadinessStepResult.md)
- [ReleasePackDependencies](interfaces/ReleasePackDependencies.md)
- [ReleasePackHelperOptions](interfaces/ReleasePackHelperOptions.md)
- [ReleasePackManifestEntry](interfaces/ReleasePackManifestEntry.md)
- [ReleasePackState](interfaces/ReleasePackState.md)
- [ResourceStorageHelperHost](interfaces/ResourceStorageHelperHost.md)
- [TsxRuntimeDependencies](interfaces/TsxRuntimeDependencies.md)
- [TsxRuntimeState](interfaces/TsxRuntimeState.md)
- [WorkspaceGitStatusEntry](interfaces/WorkspaceGitStatusEntry.md)
- [WorkspaceHygieneDependencies](interfaces/WorkspaceHygieneDependencies.md)
- [WorkspaceHygieneState](interfaces/WorkspaceHygieneState.md)
- [WpPostRouteHelperHost](interfaces/WpPostRouteHelperHost.md)

## Type Aliases

### Commands

- [CreateCommandConstructor](type-aliases/CreateCommandConstructor.md)
- [CreateCommandInstance](type-aliases/CreateCommandInstance.md)
- [DoctorStatus](type-aliases/DoctorStatus.md)
- [InitCommandConstructor](type-aliases/InitCommandConstructor.md)
- [InitCommandInstance](type-aliases/InitCommandInstance.md)

### Config

- [ConfigOrigin](type-aliases/ConfigOrigin.md)

### AST Builders

- [WpOptionStorage](type-aliases/WpOptionStorage.md)

### Adapters

- [AdapterExtensionFactory](type-aliases/AdapterExtensionFactory.md)
- [PhpAdapterFactory](type-aliases/PhpAdapterFactory.md)

### Workspace

- [WriteOptions](type-aliases/WriteOptions.md)

### IR

- [IRCapabilityScope](type-aliases/IRCapabilityScope.md)
- [IRDiagnosticSeverity](type-aliases/IRDiagnosticSeverity.md)
- [IRRouteTransport](type-aliases/IRRouteTransport.md)
- [SchemaProvenance](type-aliases/SchemaProvenance.md)

### Runtime

- [BuilderHelper](type-aliases/BuilderHelper.md)
- [BuilderOutput](type-aliases/BuilderOutput.md)
- [BuilderWriteAction](type-aliases/BuilderWriteAction.md)
- [FragmentHelper](type-aliases/FragmentHelper.md)
- [Pipeline](type-aliases/Pipeline.md)
- [PipelineDiagnostic](type-aliases/PipelineDiagnostic.md)
- [PipelineExtension](type-aliases/PipelineExtension.md)
- [PipelineExtensionHook](type-aliases/PipelineExtensionHook.md)
- [PipelineExtensionHookOptions](type-aliases/PipelineExtensionHookOptions.md)

### Other

- [ApplyCommandConstructor](type-aliases/ApplyCommandConstructor.md)
- [ApplyCommandInstance](type-aliases/ApplyCommandInstance.md)
- [ApplyLogStatus](type-aliases/ApplyLogStatus.md)
- [CommandConstructor](type-aliases/CommandConstructor.md)
- [ContentModel](type-aliases/ContentModel.md)
- [FileWriteStatus](type-aliases/FileWriteStatus.md)
- [HelperApplyFn](type-aliases/HelperApplyFn.md)
- [HelperKind](type-aliases/HelperKind.md)
- [HelperMode](type-aliases/HelperMode.md)
- [IrFragment](type-aliases/IrFragment.md)
- [NormalizedMenuConfig](type-aliases/NormalizedMenuConfig.md)
- [PatchStatus](type-aliases/PatchStatus.md)
- [PhpBuilderApplyOptions](type-aliases/PhpBuilderApplyOptions.md)
- [PipelinePhase](type-aliases/PipelinePhase.md)
- [PluginLoaderUiResourceDescriptor](type-aliases/PluginLoaderUiResourceDescriptor.md)
- [PostTypesMap](type-aliases/PostTypesMap.md)
- [ReadinessConfirmationStatus](type-aliases/ReadinessConfirmationStatus.md)
- [ReadinessHelperFactory](type-aliases/ReadinessHelperFactory.md)
- [ReadinessKey](type-aliases/ReadinessKey.md)
- [ReadinessOutcomeStatus](type-aliases/ReadinessOutcomeStatus.md)
- [ReadinessStatus](type-aliases/ReadinessStatus.md)
- [Resource](type-aliases/Resource.md)
- [ScaffoldStatus](type-aliases/ScaffoldStatus.md)
- [StatusesMap](type-aliases/StatusesMap.md)
- [TaxonomiesMap](type-aliases/TaxonomiesMap.md)
- [WorkspaceGitStatus](type-aliases/WorkspaceGitStatus.md)
- [WpPostStorage](type-aliases/WpPostStorage.md)
- [WpTaxonomyStorage](type-aliases/WpTaxonomyStorage.md)

## Variables

### Commands

- [ApplyCommand](variables/ApplyCommand.md)

### IR

- [META\_EXTENSION\_KEY](variables/META_EXTENSION_KEY.md)
- [SCHEMA\_EXTENSION\_KEY](variables/SCHEMA_EXTENSION_KEY.md)

### Other

- [DEFAULT\_READINESS\_ORDER](variables/DEFAULT_READINESS_ORDER.md)
- [resourceAccessors](variables/resourceAccessors.md)
- [VERSION](variables/VERSION.md)

## Functions

### Commands

- [buildApplyCommand](functions/buildApplyCommand.md)
- [buildCreateCommand](functions/buildCreateCommand.md)
- [buildDoctorCommand](functions/buildDoctorCommand.md)
- [buildGenerateCommand](functions/buildGenerateCommand.md)
- [buildInitCommand](functions/buildInitCommand.md)
- [buildStartCommand](functions/buildStartCommand.md)

### AST Builders

- [buildTsFormatter](functions/buildTsFormatter.md)
- [createAdminScreenBuilder](functions/createAdminScreenBuilder.md)
- [createApplyPlanBuilder](functions/createApplyPlanBuilder.md)
- [createJsBlocksBuilder](functions/createJsBlocksBuilder.md)
- [createPatcher](functions/createPatcher.md)
- [createPhpBaseControllerHelper](functions/createPhpBaseControllerHelper.md)
- [createPhpBlocksHelper](functions/createPhpBlocksHelper.md)
- [createPhpCapabilityHelper](functions/createPhpCapabilityHelper.md)
- [createPhpChannelHelper](functions/createPhpChannelHelper.md)
- [createPhpIndexFileHelper](functions/createPhpIndexFileHelper.md)
- [createPhpPersistenceRegistryHelper](functions/createPhpPersistenceRegistryHelper.md)
- [createPhpPluginLoaderHelper](functions/createPhpPluginLoaderHelper.md)
- [createPhpResourceControllerHelper](functions/createPhpResourceControllerHelper.md)
- [createPhpTransientStorageHelper](functions/createPhpTransientStorageHelper.md)
- [createPhpWpOptionStorageHelper](functions/createPhpWpOptionStorageHelper.md)
- [createPhpWpPostRoutesHelper](functions/createPhpWpPostRoutesHelper.md)
- [createPhpWpTaxonomyStorageHelper](functions/createPhpWpTaxonomyStorageHelper.md)
- [createPlanBuilder](functions/createPlanBuilder.md)
- [createWpProgramWriterHelper](functions/createWpProgramWriterHelper.md)
- [getWpPostRouteHelperState](functions/getWpPostRouteHelperState.md)
- [readWpPostRouteBundle](functions/readWpPostRouteBundle.md)

### CLI

- [runCli](functions/runCli.md)

### Workspace

- [buildWorkspace](functions/buildWorkspace.md)
- [ensureCleanDirectory](functions/ensureCleanDirectory.md)
- [promptConfirm](functions/promptConfirm.md)

### IR

- [createBlocksFragment](functions/createBlocksFragment.md)
- [createCapabilitiesFragment](functions/createCapabilitiesFragment.md)
- [createCapabilityMapFragment](functions/createCapabilityMapFragment.md)
- [createDiagnosticsFragment](functions/createDiagnosticsFragment.md)
- [createIr](functions/createIr.md)
- [createIrWithBuilders](functions/createIrWithBuilders.md)
- [createMetaFragment](functions/createMetaFragment.md)
- [createOrderingFragment](functions/createOrderingFragment.md)
- [createResourcesFragment](functions/createResourcesFragment.md)
- [createValidationFragment](functions/createValidationFragment.md)
- [registerCoreBuilders](functions/registerCoreBuilders.md)
- [registerCoreFragments](functions/registerCoreFragments.md)

### Runtime

- [createHelper](functions/createHelper.md)

### Builders

- [createTsCapabilityBuilder](functions/createTsCapabilityBuilder.md)
- [createTsIndexBuilder](functions/createTsIndexBuilder.md)
- [createTsResourcesBuilder](functions/createTsResourcesBuilder.md)
- [createTsTypesBuilder](functions/createTsTypesBuilder.md)

### Other

- [assertReadinessRun](functions/assertReadinessRun.md)
- [buildDefaultReadinessRegistry](functions/buildDefaultReadinessRegistry.md)
- [buildPhpPrettyPrinter](functions/buildPhpPrettyPrinter.md)
- [createAppConfigBuilder](functions/createAppConfigBuilder.md)
- [createAppFormBuilder](functions/createAppFormBuilder.md)
- [createBootstrapperResolutionReadinessHelper](functions/createBootstrapperResolutionReadinessHelper.md)
- [createBundler](functions/createBundler.md)
- [createComposerReadinessHelper](functions/createComposerReadinessHelper.md)
- [createDataViewInteractivityFixtureBuilder](functions/createDataViewInteractivityFixtureBuilder.md)
- [createDataViewRegistryBuilder](functions/createDataViewRegistryBuilder.md)
- [createGitReadinessHelper](functions/createGitReadinessHelper.md)
- [createLayoutFragment](functions/createLayoutFragment.md)
- [createPhpBuilderConfigHelper](functions/createPhpBuilderConfigHelper.md)
- [createPhpCodemodIngestionHelper](functions/createPhpCodemodIngestionHelper.md)
- [createPhpCodemodIngestionReadinessHelper](functions/createPhpCodemodIngestionReadinessHelper.md)
- [createPhpDriverInstaller](functions/createPhpDriverInstaller.md)
- [createPhpPrinterPathReadinessHelper](functions/createPhpPrinterPathReadinessHelper.md)
- [createPhpRuntimeReadinessHelper](functions/createPhpRuntimeReadinessHelper.md)
- [createPipeline](functions/createPipeline.md)
- [createQuickstartReadinessHelper](functions/createQuickstartReadinessHelper.md)
- [createReadinessHelper](functions/createReadinessHelper.md)
- [createReadinessRegistry](functions/createReadinessRegistry.md)
- [createReleasePackReadinessHelper](functions/createReleasePackReadinessHelper.md)
- [createSchemasFragment](functions/createSchemasFragment.md)
- [createTsConfigBuilder](functions/createTsConfigBuilder.md)
- [createTsxRuntimeReadinessHelper](functions/createTsxRuntimeReadinessHelper.md)
- [createUiEntryBuilder](functions/createUiEntryBuilder.md)
- [createWorkspaceHygieneReadinessHelper](functions/createWorkspaceHygieneReadinessHelper.md)
- [getPhpBuilderChannel](functions/getPhpBuilderChannel.md)
- [getPhpBuilderConfigState](functions/getPhpBuilderConfigState.md)
- [readWorkspaceGitStatus](functions/readWorkspaceGitStatus.md)
- [registerDefaultReadinessHelpers](functions/registerDefaultReadinessHelpers.md)
- [registerReadinessHelperFactories](functions/registerReadinessHelperFactories.md)
- [requireIr](functions/requireIr.md)
- [resetPhpBuilderChannel](functions/resetPhpBuilderChannel.md)
- [toWorkspaceRelative](functions/toWorkspaceRelative.md)

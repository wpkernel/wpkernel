import { createHelper } from '../../runtime';
import { WPKernelError } from '@wpkernel/core/error';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import { createWpProgramWriterHelper } from './pipeline.writer';
import { createPhpBlocksHelper } from './block.artifacts';
import { createPhpBaseControllerHelper } from './controller.base';
import { createPhpChannelHelper } from './pipeline.channel';
import { createPhpCapabilityHelper } from './entry.capabilities';
import { createPhpIndexFileHelper } from './entry.index';
import { createPhpPersistenceRegistryHelper } from './entry.registry';
import { createPhpPluginLoaderHelper } from './entry.plugin';
import {
	createPhpTransientStorageHelper,
	createPhpWpOptionStorageHelper,
	createPhpWpTaxonomyStorageHelper,
} from './storage.artifacts';
import { createPhpWpPostRoutesHelper } from './controller.wpPostRoutes';
import { createPhpResourceControllerHelper } from './controller.resources';
import {
	type CreatePhpBuilderOptions,
	type PhpBuilderApplyOptions,
} from './types';
import type { BuildIrOptions } from '../../ir/publicTypes';
import type {
	AdapterContext,
	PhpCodemodAdapterConfig,
	PhpCodemodDriverOptions,
} from '../../config/types';
import type { PhpDriverConfigurationOptions } from '@wpkernel/php-json-ast';
import { createPhpCodemodIngestionHelper } from './pipeline.codemods';
import type { CreatePhpCodemodIngestionHelperOptions } from './pipeline.codemods';
import {
	resolveBundledComposerAutoloadPath,
	resolveBundledPhpDriverPrettyPrintPath,
} from '../../utils/phpAssets';

const BUNDLED_PHP_AUTOLOAD_PATH = resolveBundledComposerAutoloadPath();
const BUNDLED_PHP_PRETTY_PRINT_SCRIPT_PATH =
	resolveBundledPhpDriverPrettyPrintPath();
const DRIVER_OPTION_KEYS = ['binary', 'scriptPath', 'importMetaUrl'] as const;

type MutableDriverOptions = {
	binary?: string;
	scriptPath?: string;
	importMetaUrl?: string;
	autoloadPaths?: readonly string[];
};

/**
 * Creates a builder helper for generating PHP code and artifacts.
 *
 * This helper orchestrates a sequence of other PHP-specific helpers to generate
 * various components of the PHP output, such as controllers, storage implementations,
 * capability definitions, and the main plugin loader file.
 *
 * @category AST Builders
 * @param    options - Configuration options for the PHP builder.
 * @returns A `BuilderHelper` instance configured to generate PHP artifacts.
 */
export function createPhpBuilder(
	options: CreatePhpBuilderOptions = {}
): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.core',
		kind: 'builder',
		dependsOn: ['builder.generate.php.driver'],
		async apply(applyOptions: BuilderApplyOptions, next?: BuilderNext) {
			const { input, reporter } = applyOptions;
			if (input.phase !== 'generate') {
				reporter.debug('createPhpBuilder: skipping phase.', {
					phase: input.phase,
				});
				await next?.();
				return;
			}

			const buildOptions = applyOptions.input.options as BuildIrOptions;
			const adapterContext = buildAdapterContext(
				buildOptions,
				applyOptions.input.ir,
				reporter
			);
			const adapterConfig = resolvePhpAdapterConfig(
				buildOptions,
				adapterContext
			);
			const driverOptions = ensureBundledDriverDefaults(
				mergeDriverOptions(options.driver, adapterConfig?.driver)
			);
			const codemodHelperOptions = buildCodemodHelperOptions(
				adapterConfig?.codemods,
				driverOptions
			);

			const helperPipeline = [
				createPhpChannelHelper(),
				createPhpBaseControllerHelper(),
				createPhpTransientStorageHelper(),
				createPhpWpOptionStorageHelper(),
				createPhpWpTaxonomyStorageHelper(),
				createPhpWpPostRoutesHelper(),
				createPhpResourceControllerHelper(),
				createPhpCapabilityHelper(),
				createPhpPersistenceRegistryHelper(),
				createPhpPluginLoaderHelper(),
				createPhpIndexFileHelper(),
				createPhpBlocksHelper(),
				...(codemodHelperOptions
					? [createPhpCodemodIngestionHelper(codemodHelperOptions)]
					: []),
				createWpProgramWriterHelper({
					driver: driverOptions,
				}),
			];

			if (!input.ir) {
				throw new WPKernelError('ValidationError', {
					message:
						'createPhpBuilder requires an IR instance during execution.',
				});
			}

			await runHelperSequence(helperPipeline, applyOptions);
			reporter.info('createPhpBuilder: PHP artifacts generated.');
			await next?.();
		},
	});
}

async function runHelperSequence(
	helpers: readonly BuilderHelper[],
	options: PhpBuilderApplyOptions
): Promise<void> {
	const invoke = async (index: number): Promise<void> => {
		const helper = helpers[index];
		if (!helper) {
			return;
		}

		await helper.apply(options, async () => {
			await invoke(index + 1);
		});
	};

	await invoke(0);
}

function resolvePhpAdapterConfig(
	buildOptions: BuildIrOptions,
	adapterContext: AdapterContext | null
) {
	const adapterFactory = buildOptions.config.adapters?.php;
	if (!adapterFactory || !adapterContext) {
		return undefined;
	}

	return adapterFactory(adapterContext) ?? undefined;
}

function buildAdapterContext(
	buildOptions: BuildIrOptions,
	ir: PhpBuilderApplyOptions['input']['ir'],
	reporter: PhpBuilderApplyOptions['reporter']
): AdapterContext | null {
	if (!ir) {
		return null;
	}

	return {
		config: buildOptions.config,
		namespace: buildOptions.namespace,
		reporter,
		ir,
	} satisfies AdapterContext;
}

function mergeDriverOptions(
	base: CreatePhpBuilderOptions['driver'],
	override?: PhpDriverConfigurationOptions
): PhpDriverConfigurationOptions | undefined {
	if (!base && !override) {
		return undefined;
	}

	const merged: MutableDriverOptions = {};
	applyDriverOptions(merged, base);
	applyDriverOptions(merged, override);

	const autoloadPaths = mergeAutoloadPathEntries(
		override?.autoloadPaths,
		base?.autoloadPaths
	);
	if (autoloadPaths) {
		merged.autoloadPaths = autoloadPaths;
	}

	return hasDriverEntries(merged)
		? (merged as PhpDriverConfigurationOptions)
		: undefined;
}

function applyDriverOptions(
	target: MutableDriverOptions,
	source:
		| CreatePhpBuilderOptions['driver']
		| PhpDriverConfigurationOptions
		| undefined
): void {
	if (!source) {
		return;
	}

	for (const key of DRIVER_OPTION_KEYS) {
		const value = source[key];
		if (typeof value === 'string' && value.length > 0) {
			target[key] = value;
		}
	}
}

function hasDriverEntries(target: MutableDriverOptions): boolean {
	if (target.autoloadPaths && target.autoloadPaths.length > 0) {
		return true;
	}

	return DRIVER_OPTION_KEYS.some((key) => {
		const value = target[key];
		return typeof value === 'string' && value.length > 0;
	});
}

function buildCodemodHelperOptions(
	codemods: PhpCodemodAdapterConfig | undefined,
	driver: PhpDriverConfigurationOptions | undefined
): CreatePhpCodemodIngestionHelperOptions | null {
	if (!codemods) {
		return null;
	}

	const files = codemods.files.filter((file) => typeof file === 'string');
	if (files.length === 0) {
		return null;
	}

	const mergedDriver = mergeCodemodDriverOptions(codemods.driver, driver);

	return {
		files,
		configurationPath: codemods.configurationPath,
		enableDiagnostics: codemods.diagnostics?.nodeDumps === true,
		phpBinary: mergedDriver?.binary,
		scriptPath: mergedDriver?.scriptPath,
		importMetaUrl: mergedDriver?.importMetaUrl,
		autoloadPaths: mergedDriver?.autoloadPaths,
	} satisfies CreatePhpCodemodIngestionHelperOptions;
}

function mergeCodemodDriverOptions(
	adapterDriver: PhpCodemodDriverOptions | undefined,
	defaultDriver: PhpDriverConfigurationOptions | undefined
): PhpDriverConfigurationOptions | undefined {
	if (!adapterDriver && !defaultDriver) {
		return undefined;
	}

	const merged: MutableDriverOptions = {};

	for (const key of DRIVER_OPTION_KEYS) {
		const value = selectDriverValue(key, adapterDriver, defaultDriver);
		if (value) {
			merged[key] = value;
		}
	}

	const autoloadPaths = mergeAutoloadPathEntries(
		adapterDriver?.autoloadPaths,
		defaultDriver?.autoloadPaths
	);
	if (autoloadPaths) {
		merged.autoloadPaths = autoloadPaths;
	}

	return Object.keys(merged).length > 0 ? merged : undefined;
}

function selectDriverValue(
	key: (typeof DRIVER_OPTION_KEYS)[number],
	adapterDriver: PhpCodemodDriverOptions | undefined,
	defaultDriver: PhpDriverConfigurationOptions | undefined
): string | undefined {
	const preferred = adapterDriver?.[key];
	if (isNonEmptyString(preferred)) {
		return preferred;
	}

	const fallback = defaultDriver?.[key];
	return isNonEmptyString(fallback) ? fallback : undefined;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function ensureBundledDriverDefaults(
	driver: PhpDriverConfigurationOptions | undefined
): PhpDriverConfigurationOptions {
	const autoloadPaths = mergeAutoloadPathEntries(driver?.autoloadPaths, [
		BUNDLED_PHP_AUTOLOAD_PATH,
	]) ?? [BUNDLED_PHP_AUTOLOAD_PATH];

	let scriptPath: string | undefined = driver?.scriptPath;
	if (!isPresent(scriptPath) && !isPresent(driver?.importMetaUrl)) {
		scriptPath = BUNDLED_PHP_PRETTY_PRINT_SCRIPT_PATH;
	}

	return {
		...(driver ?? {}),
		autoloadPaths,
		scriptPath,
	};
}

function mergeAutoloadPathEntries(
	...sources: ReadonlyArray<readonly string[] | undefined>
): readonly string[] | undefined {
	const merged: string[] = [];

	for (const source of sources) {
		if (!Array.isArray(source)) {
			continue;
		}

		for (const entry of source) {
			if (typeof entry !== 'string') {
				continue;
			}

			const trimmed = entry.trim();
			if (trimmed.length === 0) {
				continue;
			}

			if (!merged.includes(trimmed)) {
				merged.push(trimmed);
			}
		}
	}

	return merged.length > 0 ? merged : undefined;
}

function isPresent(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

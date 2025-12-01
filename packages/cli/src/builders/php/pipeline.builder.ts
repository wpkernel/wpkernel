import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	PipelineContext,
} from '../../runtime/types';
import { type CreatePhpBuilderOptions } from './types';
import type { BuildIrOptions } from '../../ir/publicTypes';
import type {
	AdapterContext,
	PhpCodemodAdapterConfig,
	PhpCodemodDriverOptions,
} from '../../config/types';
import type { PhpDriverConfigurationOptions } from '@wpkernel/php-json-ast';
import { resolveBundledPhpDriverPrettyPrintPath } from '../../utils/phpAssets';
import type { CreatePhpCodemodIngestionHelperOptions } from './pipeline.codemods';

const BUNDLED_PHP_PRETTY_PRINT_SCRIPT_PATH =
	resolveBundledPhpDriverPrettyPrintPath();
const DRIVER_OPTION_KEYS = ['binary', 'scriptPath', 'importMetaUrl'] as const;

type MutableDriverOptions = {
	binary?: string;
	scriptPath?: string;
	importMetaUrl?: string;
	autoloadPaths?: readonly string[];
};

type PhpBuilderConfigState = {
	driver?: PhpDriverConfigurationOptions;
	codemods?: CreatePhpCodemodIngestionHelperOptions | null;
};

const PHP_BUILDER_CONFIG_STATE = new WeakMap<
	PipelineContext,
	PhpBuilderConfigState
>();

export function getPhpBuilderConfigState(
	context: PipelineContext
): PhpBuilderConfigState {
	return (
		PHP_BUILDER_CONFIG_STATE.get(context) ?? {
			driver: undefined,
			codemods: null,
		}
	);
}

export function createPhpBuilderConfigHelper(
	options: CreatePhpBuilderOptions = {}
): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.config',
		kind: 'builder',
		dependsOn: ['builder.generate.php.channel.bootstrap'],
		async apply(applyOptions: BuilderApplyOptions) {
			const { input, reporter, context } = applyOptions;
			if (input.phase !== 'generate' || !input.ir) {
				return;
			}

			const buildOptions = input.options as BuildIrOptions;
			const adapterContext = buildAdapterContext(
				buildOptions,
				input.ir,
				reporter
			);
			const adapterConfig = resolvePhpAdapterConfig(
				buildOptions,
				adapterContext
			);
			const driverOptions = ensureBundledDriverDefaults(
				mergeDriverOptions(options.driver, adapterConfig?.driver)
			);
			const codemodOptions = buildCodemodHelperOptions(
				adapterConfig?.codemods,
				driverOptions
			);

			PHP_BUILDER_CONFIG_STATE.set(context, {
				driver: driverOptions,
				codemods: codemodOptions,
			});
		},
	});
}

function resolvePhpAdapterConfig(
	buildOptions: BuildIrOptions,
	adapterContext: AdapterContext | null
) {
	const adapterFactory = buildOptions.config?.adapters?.php;
	if (!adapterFactory || !adapterContext) {
		return undefined;
	}

	return adapterFactory(adapterContext) ?? undefined;
}

function buildAdapterContext(
	buildOptions: BuildIrOptions,
	ir: BuilderApplyOptions['input']['ir'],
	reporter: BuilderApplyOptions['reporter']
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
	let scriptPath: string | undefined = driver?.scriptPath;
	if (!isPresent(scriptPath) && !isPresent(driver?.importMetaUrl)) {
		scriptPath = BUNDLED_PHP_PRETTY_PRINT_SCRIPT_PATH;
	}

	return {
		...(driver ?? {}),
		autoloadPaths: driver?.autoloadPaths,
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

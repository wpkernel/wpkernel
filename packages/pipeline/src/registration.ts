import type {
	Helper,
	HelperKind,
	PipelineExtensionHook,
	PipelineExtensionHookRegistration,
	PipelineExtensionLifecycle,
	PipelineReporter,
} from './types';
import type { RegisteredHelper } from './dependency-graph';
import type { ExtensionHookEntry } from './extensions';
import { createHelperId } from './dependency-graph';
import type { ErrorFactory } from './error-factory';

/**
 * Registers a helper by validating its kind and checking for override conflicts.
 *
 * @param  helper       - The helper to register
 * @param  expectedKind - The expected helper kind
 * @param  entries      - The array of registered helpers to add to
 * @param  kindName     - Human-readable kind name for error messages
 * @param  onConflict   - Callback invoked when an override conflict is detected
 * @param  createError  - Error factory function
 * @throws {Error} If kind mismatch or multiple overrides for the same key
 *
 * @internal
 */
export function registerHelper<
	TContext,
	TInput,
	TOutput,
	TReporter extends PipelineReporter,
	TKind extends HelperKind,
	THelper extends Helper<
		TContext,
		TInput,
		TOutput,
		TReporter,
		TKind
	> = Helper<TContext, TInput, TOutput, TReporter, TKind>,
>(
	helper: THelper,
	expectedKind: HelperKind,
	entries: RegisteredHelper<THelper>[],
	kindName: string,
	onConflict: (helper: THelper, existing: THelper, message: string) => void,
	createError: ErrorFactory
): void {
	if (helper.kind !== expectedKind) {
		throw createError(
			'ValidationError',
			`Attempted to register helper "${helper.key}" as ${kindName} but received kind "${helper.kind}".`
		);
	}

	if (helper.mode === 'override') {
		const existingOverride = entries.find(
			(entry) =>
				entry.helper.key === helper.key &&
				entry.helper.mode === 'override'
		);

		if (existingOverride) {
			const message = `Multiple overrides registered for helper "${helper.key}".`;
			onConflict(helper, existingOverride.helper, message);

			throw createError('ValidationError', message);
		}

		// Remove all previous entries with the same key
		// We iterate backwards to safely splice
		for (let i = entries.length - 1; i >= 0; i--) {
			if (entries[i]!.helper.key === helper.key) {
				entries.splice(i, 1);
			}
		}
	}

	const index = entries.length;
	entries.push({
		helper,
		id: createHelperId(helper, index),
		index,
	});
}

/**
 * Registers an extension hook with an optional key.
 *
 * @param key            - Optional unique key for the hook
 * @param hook           - The extension hook function
 * @param extensionHooks - The array of registered extension hooks
 * @param lifecycle
 * @returns The resolved key used for registration
 *
 * @internal
 */
export function registerExtensionHook<TContext, TOptions, TArtifact>(
	key: string | undefined,
	hook: PipelineExtensionHook<TContext, TOptions, TArtifact>,
	extensionHooks: ExtensionHookEntry<TContext, TOptions, TArtifact>[],
	lifecycle: PipelineExtensionLifecycle = 'after-fragments'
): string {
	const resolvedKey =
		key ?? `pipeline.extension#${extensionHooks.length + 1}`;
	extensionHooks.push({
		key: resolvedKey,
		lifecycle,
		hook,
	});
	return resolvedKey;
}

/**
 * Handles the result of an extension's register() method.
 *
 * If the result is a function, registers it as an extension hook.
 * Otherwise, returns the result unchanged.
 *
 * @param extensionKey   - The extension's key
 * @param result         - The result from extension.register()
 * @param extensionHooks - The array of registered extension hooks
 * @returns The result if not a function, otherwise undefined
 *
 * @internal
 */
export function handleExtensionRegisterResult<TContext, TOptions, TArtifact>(
	extensionKey: string | undefined,
	result: unknown,
	extensionHooks: ExtensionHookEntry<TContext, TOptions, TArtifact>[]
): unknown {
	if (typeof result === 'function') {
		registerExtensionHook(
			extensionKey,
			result as PipelineExtensionHook<TContext, TOptions, TArtifact>,
			extensionHooks
		);
		return undefined;
	}

	if (
		result &&
		typeof result === 'object' &&
		'hook' in result &&
		typeof (
			result as PipelineExtensionHookRegistration<
				TContext,
				TOptions,
				TArtifact
			>
		).hook === 'function'
	) {
		const registration = result as PipelineExtensionHookRegistration<
			TContext,
			TOptions,
			TArtifact
		>;
		registerExtensionHook(
			extensionKey,
			registration.hook,
			extensionHooks,
			registration.lifecycle
		);
		return undefined;
	}

	return result;
}

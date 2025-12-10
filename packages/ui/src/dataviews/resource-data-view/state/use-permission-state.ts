import { useEffect, useRef, useState } from 'react';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceDataViewController } from '../../types';
import type { PermissionState } from '../types/state';
import { normalizeCapabilityError } from '../utils/errors';

function resolveCapabilityRuntime(
	controller: ResourceDataViewController<unknown, unknown>
) {
	const capabilityRuntime = controller.capabilities?.capability;
	if (!capabilityRuntime) {
		return undefined;
	}

	const candidate = capabilityRuntime.can;
	if (typeof candidate !== 'function') {
		return undefined;
	}

	return candidate as (
		key: string,
		...args: unknown[]
	) => boolean | Promise<boolean>;
}

function buildInitialState(capability?: string): PermissionState {
	if (!capability) {
		return { status: 'allowed' };
	}

	return { status: 'checking', capability };
}

export function usePermissionState<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	reporter: Reporter
): PermissionState {
	const capability =
		controller.config.capability ??
		controller.config.screen?.menu?.capability;
	const capabilityRuntime = controller.capabilities?.capability;
	const capabilityResolver = capabilityRuntime?.can;
	const [state, setState] = useState<PermissionState>(() =>
		buildInitialState(capability)
	);
	const lastStatusRef = useRef<PermissionState['status']>(state.status);

	useEffect(() => {
		if (!capability) {
			setState({ status: 'allowed' });
			return;
		}

		const can = resolveCapabilityRuntime(
			controller as ResourceDataViewController<unknown, unknown>
		);

		if (!can) {
			// Fall back to allow when no capability runtime is wired so DataViews can still render/fetch.
			reporter.warn?.(
				'Capability runtime missing for DataViews menu access; allowing by default',
				{
					capability,
					resource: controller.resourceName,
				}
			);
			setState({ status: 'allowed', capability });
			return;
		}

		let cancelled = false;

		const assignResult = (allowed: boolean) => {
			if (cancelled) {
				return;
			}
			setState({
				status: allowed ? 'allowed' : 'denied',
				capability,
			});
		};

		const assignError = (value: unknown) => {
			if (cancelled) {
				return;
			}
			const normalized = normalizeCapabilityError(value, reporter, {
				capability,
				resource: controller.resourceName,
			});
			setState({
				status: 'denied',
				capability,
				error: normalized,
			});
		};

		try {
			const result = can(capability);
			if (result instanceof Promise) {
				setState({ status: 'checking', capability });
				result.then(assignResult).catch(assignError);
			} else {
				assignResult(Boolean(result));
			}
		} catch (error) {
			assignError(error);
		}

		return () => {
			cancelled = true;
		};
	}, [
		capability,
		controller,
		reporter,
		capabilityRuntime,
		capabilityResolver,
	]);

	useEffect(() => {
		if (!capability) {
			lastStatusRef.current = state.status;
			return;
		}

		const previous = lastStatusRef.current;
		if (previous === state.status) {
			return;
		}

		if (state.status === 'denied') {
			controller.emitPermissionDenied({
				capability,
				source: 'screen',
				reason: state.error ? 'error' : 'forbidden',
				error: state.error,
			});
		} else if (state.status === 'unknown') {
			controller.emitPermissionDenied({
				capability,
				source: 'screen',
				reason: 'runtime-missing',
			});
		}

		lastStatusRef.current = state.status;
	}, [capability, controller, state]);

	return state;
}

// Minimal mock for @wpkernel/ui/dataviews to avoid pulling ESM @wordpress/dataviews in Jest.
// Functions/components are no-ops; tests can override as needed.
import type { ReactElement } from 'react';

export const DataForm = (() => null) as unknown as () => ReactElement | null;
export const DataViewsDebugPanel = DataForm;
export const DataFormDebugPanel = DataForm;

export const createResourceDataViewController = () => ({});
export const createDataFormController = () => ({});
export const createDataViewsRuntime = () => ({});
export const ensureControllerRuntime = (value: unknown) => value;
export const createDataViewInteraction = () => ({});
export const subscribeToDataViewsEvent = () => () => undefined;
export const useDataViewsEvent = () => undefined;
export const useDataFormHelper = () => ({});
export const usePersistentDataViewState = () => ({});
export const usePersistentDataFormState = () => ({});
export const useCapability = () => ({ allowed: true });
export const useCapabilityGuard = () => ({});
export const useResourceAdminController = () => ({});

export const textField = () => ({});
export const numberField = () => ({});
export const selectField = () => ({});
export const statusField = () => ({});
export const buildFormConfigFromFields = () => ({});
export const createFieldBuilder = () => ({});

export const ResourceDataView = DataForm;

// Types are irrelevant at runtime; TS will pick them from real package in typechecking.

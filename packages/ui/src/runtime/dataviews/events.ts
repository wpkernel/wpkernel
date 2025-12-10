import type { WPKInstance } from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import type { WPKernelError } from '@wpkernel/core/error';

export const DATA_VIEWS_EVENT_PREFIX = 'ui:dataviews';
export const DATA_VIEWS_EVENT_REGISTERED = `${DATA_VIEWS_EVENT_PREFIX}:registered`;
export const DATA_VIEWS_EVENT_UNREGISTERED = `${DATA_VIEWS_EVENT_PREFIX}:unregistered`;
export const DATA_VIEWS_EVENT_VIEW_CHANGED = `${DATA_VIEWS_EVENT_PREFIX}:view-changed`;
export const DATA_VIEWS_EVENT_ACTION_TRIGGERED = `${DATA_VIEWS_EVENT_PREFIX}:action-triggered`;
export const DATA_VIEWS_EVENT_PERMISSION_DENIED = `${DATA_VIEWS_EVENT_PREFIX}:permission-denied`;
export const DATA_VIEWS_EVENT_FETCH_FAILED = `${DATA_VIEWS_EVENT_PREFIX}:fetch-failed`;
export const DATA_VIEWS_EVENT_BOUNDARY_TRANSITION = `${DATA_VIEWS_EVENT_PREFIX}:boundary-transition`;

export type DataViewRegisteredPayload = {
	resource: string;
};

/**
 * Payload for the `viewChanged` event.
 * @public
 */
export type DataViewChangedPayload = {
	resource: string;
	viewState: {
		fields: string[];
		sort?: { field: string; direction: 'asc' | 'desc' };
		search?: string;
		filters?: Record<string, unknown>;
		page: number;
		perPage: number;
	};
};

export type DataViewActionTriggeredPayload = {
	resource: string;
	actionId: string;
	selection: Array<string | number>;
	meta?: Record<string, unknown>;
	permitted: boolean;
	reason?: string;
};

/**
 * Defines the source of a permission check within a DataView.
 *
 * @category DataViews
 */
export type DataViewPermissionSource = 'screen' | 'action';
/**
 * Reasons why a DataView permission might be denied.
 *
 * @category DataViews
 */
export type DataViewPermissionDeniedReason =
	| 'forbidden'
	| 'error'
	| 'runtime-missing'
	| 'pending';

export type DataViewPermissionDeniedPayload = {
	resource: string;
	capability?: string;
	source: DataViewPermissionSource;
	reason: DataViewPermissionDeniedReason;
	actionId?: string;
	selection?: Array<string | number>;
	error?: WPKernelError;
};

export type DataViewFetchFailedPayload = {
	resource: string;
	error: WPKernelError;
	query?: unknown;
};

export type DataViewBoundaryState =
	| 'content'
	| 'loading'
	| 'empty'
	| 'error'
	| 'permission-denied';

export type DataViewBoundaryTransitionPayload = {
	resource: string;
	state: DataViewBoundaryState;
	previous?: DataViewBoundaryState;
	listStatus: string;
	permissionStatus: string;
	itemCount: number;
	totalItems?: number;
};

export interface DataViewsEventEmitter {
	registered: (payload: DataViewRegisteredPayload) => void;
	unregistered: (payload: DataViewRegisteredPayload) => void;
	viewChanged: (payload: DataViewChangedPayload) => void;
	actionTriggered: (payload: DataViewActionTriggeredPayload) => void;
	permissionDenied: (payload: DataViewPermissionDeniedPayload) => void;
	fetchFailed: (payload: DataViewFetchFailedPayload) => void;
	boundaryChanged: (payload: DataViewBoundaryTransitionPayload) => void;
}

function emitEvent(
	wpk: WPKInstance,
	reporter: Reporter,
	eventName: string,
	payload:
		| DataViewRegisteredPayload
		| DataViewChangedPayload
		| DataViewActionTriggeredPayload
		| DataViewPermissionDeniedPayload
		| DataViewFetchFailedPayload
		| DataViewBoundaryTransitionPayload
): void {
	try {
		wpk.emit(eventName, payload);
		reporter.debug('Emitted DataViews event', {
			event: eventName,
			resource: 'resource' in payload ? payload.resource : undefined,
		});
	} catch (error) {
		reporter.error('Failed to emit DataViews event', {
			event: eventName,
			error,
		});
	}
}

export const __TESTING__ = {
	emitEvent,
};

export function createDataViewsEventEmitter(
	wpk: WPKInstance,
	reporter: Reporter
): DataViewsEventEmitter {
	return {
		registered(payload) {
			emitEvent(wpk, reporter, DATA_VIEWS_EVENT_REGISTERED, payload);
		},
		unregistered(payload) {
			emitEvent(wpk, reporter, DATA_VIEWS_EVENT_UNREGISTERED, payload);
		},
		viewChanged(payload) {
			emitEvent(wpk, reporter, DATA_VIEWS_EVENT_VIEW_CHANGED, payload);
		},
		actionTriggered(payload) {
			emitEvent(
				wpk,
				reporter,
				DATA_VIEWS_EVENT_ACTION_TRIGGERED,
				payload
			);
		},
		permissionDenied(payload) {
			emitEvent(
				wpk,
				reporter,
				DATA_VIEWS_EVENT_PERMISSION_DENIED,
				payload
			);
		},
		fetchFailed(payload) {
			emitEvent(wpk, reporter, DATA_VIEWS_EVENT_FETCH_FAILED, payload);
		},
		boundaryChanged(payload) {
			emitEvent(
				wpk,
				reporter,
				DATA_VIEWS_EVENT_BOUNDARY_TRANSITION,
				payload
			);
		},
	};
}

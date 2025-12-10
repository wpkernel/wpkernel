import { useCallback, useMemo, useState } from 'react';
import type { ResourceObject } from '@wpkernel/core/resource';
import type {
	ResourceDataViewConfig,
	ResourceDataViewController,
	DataViewsRuntimeContext,
} from './types';
import { createResourceDataViewController } from './resource-controller';
import { useDataFormHelper, type UseDataFormHelperResult } from './form-helper';
import type { FormConfig } from './fields';
import { defineAction } from '@wpkernel/core/actions';
import type { Form, Field } from '@wordpress/dataviews';

export type AdminMode = 'list' | 'create' | 'edit';

export interface ResourceAdminControllerOptions<TItem, TQuery> {
	resource: ResourceObject<TItem, TQuery>;
	runtime: DataViewsRuntimeContext;
	config: ResourceDataViewConfig<TItem, TQuery>;
	form: {
		fields: ResourceDataViewConfig<TItem, TQuery>['fields'];
		formLayout: FormConfig;
		buildInput?: (data: Partial<TItem>) => unknown;
		validate?: (data: Partial<TItem>) => string | null;
	};
}

export interface ResourceAdminController<TItem, TQuery> {
	controller: ResourceDataViewController<TItem, TQuery>;
	form: UseDataFormHelperResult<TItem>;
	mode: AdminMode;
	editId: string | number | null;
	openCreate: () => void;
	openEdit: (id: string | number) => void;
	close: () => void;
}

/**
 * Creates a minimal admin controller that keeps list and form state in sync.
 * @param options
 */
export function useResourceAdminController<TItem, TQuery>(
	options: ResourceAdminControllerOptions<TItem, TQuery>
): ResourceAdminController<TItem, TQuery> {
	const [mode, setMode] = useState<AdminMode>('list');
	const [editId, setEditId] = useState<string | number | null>(null);

	const controller = useMemo(
		() =>
			createResourceDataViewController({
				resource: options.resource,
				config: options.config,
				runtime: options.runtime.dataviews,
				namespace: options.runtime.namespace,
				capabilities: options.runtime.capabilities,
			}),
		[options.config, options.resource, options.runtime]
	);

	const form = useDataFormHelper<TItem, unknown, TQuery>({
		resource: options.resource,
		runtime: options.runtime,
		resourceName: options.resource.name ?? 'resource',
		action: defineAction({
			name: `${options.resource.name ?? 'resource'}.form`,
			handler: async (_ctx: unknown, input: unknown) => input,
		}),
		fields: options.form.fields as unknown as Field<Partial<TItem>>[],
		form: options.form.formLayout as unknown as Form,
		buildInput: options.form.buildInput,
		validate: options.form.validate,
	});

	const openCreate = useCallback(() => {
		setEditId(null);
		setMode('create');
	}, []);

	const openEdit = useCallback((id: string | number) => {
		setEditId(id);
		setMode('edit');
	}, []);

	const close = useCallback(() => {
		setEditId(null);
		setMode('list');
	}, []);

	return {
		controller,
		form,
		mode,
		editId,
		openCreate,
		openEdit,
		close,
	};
}

import { useMemo, useState, useCallback } from 'react';
import { DataForm } from '@wordpress/dataviews';
import type { Field, Form } from '@wordpress/dataviews';
import { defineAction, type DefinedAction } from '@wpkernel/core/actions';
import type { WPKernelError } from '@wpkernel/core/error';
import type { CacheKeyPattern, ResourceObject } from '@wpkernel/core/resource';
import { createDataFormController } from './data-form-controller';
import type { DataViewsRuntimeContext } from './types';

export interface DataFormHelperOptions<TItem, TInput, TQuery> {
	resource: ResourceObject<TItem, TQuery>;
	runtime: DataViewsRuntimeContext;
	resourceName: string;
	fields: Field<Partial<TItem>>[];
	action?: DefinedAction<TInput, unknown>;
	form: Form;
	buildInput?: (data: Partial<TItem>) => TInput;
	validate?: (data: Partial<TItem>) => string | null;
	invalidate?: (result: unknown, input: TInput) => CacheKeyPattern[] | false;
	onSuccess?: (result: unknown) => void;
	onError?: (error: WPKernelError) => void;
}

export interface UseDataFormHelperResult<TItem> {
	Form: JSX.Element;
	data: Partial<TItem>;
	setData: React.Dispatch<React.SetStateAction<Partial<TItem>>>;
	submit: () => Promise<unknown>;
	reset: () => void;
	state: {
		status: 'idle' | 'running' | 'success' | 'error';
		error?: WPKernelError;
		inFlight: number;
		result?: unknown;
		isValid: boolean;
	};
}

export function useDataFormHelper<TItem, TInput, TQuery>(
	options: DataFormHelperOptions<TItem, TInput, TQuery>
): UseDataFormHelperResult<TItem> {
	const [data, setData] = useState<Partial<TItem>>({});

	const controller = useMemo(() => {
		const action =
			options.action ??
			defineAction<TInput, unknown>({
				name: `${options.resourceName}.form`,
				handler: async (_ctx: unknown, input: TInput) =>
					input as unknown,
			});

		return createDataFormController<TInput, unknown, TQuery>({
			action,
			resource: options.resource as unknown as ResourceObject<
				unknown,
				TQuery
			>,
			resourceName: options.resourceName,
			runtime: options.runtime,
			invalidate: options.invalidate,
			onSuccess: options.onSuccess,
			onError: options.onError,
		});
	}, [
		options.action,
		options.invalidate,
		options.onError,
		options.onSuccess,
		options.resource,
		options.resourceName,
		options.runtime,
	]);

	const [isValid, setIsValid] = useState(true);

	const submit = useCallback(async () => {
		const validationError = options.validate?.(data);
		if (validationError) {
			throw new Error(validationError);
		}
		setIsValid(true);
		const input =
			options.buildInput?.(data as Partial<TItem>) ??
			(data as unknown as TInput);
		return controller().submit(input);
	}, [controller, data, options]);

	const Form = (
		<DataForm
			data={data}
			fields={options.fields as unknown as Field<Partial<TItem>>[]}
			form={options.form as Form}
			onChange={(patch) =>
				setData((prev) => ({ ...prev, ...(patch as Partial<TItem>) }))
			}
		/>
	);

	const state = controller().state;

	return {
		Form,
		data,
		setData,
		submit,
		reset: controller().reset,
		state: {
			...state,
			isValid,
		},
	};
}

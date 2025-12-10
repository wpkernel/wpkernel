import type { Field } from '@wordpress/dataviews';

type FilterOperators = string;

type CommonFieldOptions<TItem> = {
	label?: string;
	searchable?: boolean;
	sortable?: boolean;
	/**
	 * Shorthand for filterBy. Pass operator names (e.g. 'isAny', 'isNone') or false to disable.
	 */
	filters?: FilterOperators[] | false;
	filterBy?: Field<TItem>['filterBy'];
	edit?: unknown;
	render?: unknown;
	enableHiding?: boolean;
	getValue?: Field<TItem>['getValue'];
	setValue?: Field<TItem>['setValue'];
	elements?: Field<TItem>['elements'];
	form?: {
		required?: boolean;
		layout?: Record<string, unknown>;
	};
};

const toLabel = (id: string): string =>
	id
		.replace(/[_\-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^\w/, (c) => c.toUpperCase());

function applyFilters<TItem>(
	field: Field<TItem>,
	filterBy?: Field<TItem>['filterBy'],
	filters?: FilterOperators[] | false
) {
	if (filterBy !== undefined) {
		field.filterBy = filterBy as Field<TItem>['filterBy'];
		return;
	}

	if (Array.isArray(filters)) {
		field.filterBy = {
			operators: filters as never[],
		} as Field<TItem>['filterBy'];
		return;
	}

	if (filters === false) {
		field.filterBy = false;
	}
}

function buildBaseField<TItem>(
	id: string,
	type: Field<TItem>['type'],
	options: CommonFieldOptions<TItem> = {}
): Field<TItem> {
	const {
		label,
		searchable,
		sortable,
		filters,
		filterBy,
		edit,
		render,
		enableHiding,
		getValue,
		setValue,
		elements,
		form,
	} = options;

	const field = {
		id,
		type,
		label: label ?? toLabel(id),
		enableGlobalSearch: searchable ?? true,
		enableSorting: sortable ?? true,
		enableHiding,
		getValue,
		setValue,
	} as Field<TItem> & Record<string, unknown>;

	if (edit !== undefined) {
		(field as Record<string, unknown>).edit = edit as unknown;
	}

	if (render !== undefined) {
		(field as Record<string, unknown>).render = render as unknown;
	}

	if (elements) {
		field.elements = elements;
	}

	if (form) {
		field.__form = form;
	}

	applyFilters(field, filterBy, filters);

	return field;
}

/**
 * Convenience helper to create a text field definition.
 * @param id
 * @param options
 */
export function textField<TItem>(
	id: string,
	options: CommonFieldOptions<TItem> = {}
): Field<TItem> {
	return buildBaseField(id, 'text', options);
}

/**
 * Convenience helper to create a number field definition.
 * @param id
 * @param options
 */
export function numberField<TItem>(
	id: string,
	options: CommonFieldOptions<TItem> = {}
): Field<TItem> {
	return buildBaseField(id, 'number', options);
}

/**
 * Convenience helper to create a select/enumeration field definition.
 * @param id
 * @param elements
 * @param options
 */
export function selectField<TItem>(
	id: string,
	elements: NonNullable<Field<TItem>['elements']>,
	options: CommonFieldOptions<TItem> = {}
): Field<TItem> {
	return buildBaseField(id, 'text', {
		...options,
		elements,
		filterBy:
			options.filterBy ??
			(options.filters === false
				? false
				: ({
						operators: (options.filters ??
							(['isAny', 'isNone'] as string[])) as never[],
					} as Field<TItem>['filterBy'])),
	});
}

/**
 * Convenience helper for status-like fields with badge-friendly defaults.
 * @param id
 * @param elements
 * @param options
 */
export function statusField<TItem>(
	id: string,
	elements: NonNullable<Field<TItem>['elements']>,
	options: CommonFieldOptions<TItem> = {}
): Field<TItem> {
	return selectField(id, elements, {
		sortable: options.sortable ?? false,
		searchable: options.searchable ?? false,
		...options,
	});
}

export type FormConfig = {
	layout: Record<string, unknown>;
	fields: string[];
};

export function buildFormConfigFromFields<TItem>(
	fields: Field<TItem>[],
	defaultLayout: FormConfig['layout'] = {}
): { fields: Field<TItem>[]; form: FormConfig } {
	const formFields: string[] = [];
	for (const field of fields) {
		const formMeta = (field as Record<string, unknown>).__form as
			| { layout?: Record<string, unknown> }
			| undefined;
		if (formMeta) {
			formFields.push(field.id);
		}
	}

	return {
		fields,
		form: {
			layout: defaultLayout,
			fields: formFields.length ? formFields : fields.map((f) => f.id),
		},
	};
}

export type FieldBuilder<TItem> = {
	fields: Field<TItem>[];
	form: FormConfig;
};

export function createFieldBuilder<TItem>() {
	const fields: Field<TItem>[] = [];
	return {
		add(field: Field<TItem>) {
			fields.push(field);
			return this;
		},
		build(defaultLayout: FormConfig['layout'] = {}): FieldBuilder<TItem> {
			return buildFormConfigFromFields(fields, defaultLayout);
		},
	};
}

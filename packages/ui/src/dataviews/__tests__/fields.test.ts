import {
	textField,
	numberField,
	selectField,
	statusField,
	buildFormConfigFromFields,
	createFieldBuilder,
} from '../fields';

describe('field helpers', () => {
	it('creates text and number fields with sensible defaults', () => {
		const text = textField('job_title');
		expect(text).toMatchObject({
			id: 'job_title',
			type: 'text',
			label: 'Job title',
			enableGlobalSearch: true,
			enableSorting: true,
		});

		const number = numberField('salary', {
			searchable: false,
			sortable: false,
		});
		expect(number).toMatchObject({
			id: 'salary',
			type: 'number',
			enableGlobalSearch: false,
			enableSorting: false,
		});
	});

	it('applies filter configuration with correct precedence', () => {
		const withFilters = textField('status', { filters: ['contains'] });
		expect((withFilters.filterBy as any).operators).toEqual(['contains']);

		const disabled = textField('status', { filters: false });
		expect(disabled.filterBy).toBe(false);

		const explicit = textField('status', {
			filters: ['contains'],
			filterBy: { operators: ['startsWith'] } as any,
		});
		expect((explicit.filterBy as any).operators).toEqual(['startsWith']);
	});

	it('copies edit/render/elements/form metadata onto the field', () => {
		const render = () => 'render';
		const edit = { component: 'Edit' };
		const elements = [{ value: 'one', label: 'One' }];
		const field = textField('kind', {
			render,
			edit,
			elements,
			form: { required: true },
		});

		expect((field as any).render).toBe(render);
		expect((field as any).edit).toBe(edit);
		expect(field.elements).toBe(elements);
		expect((field as any).__form).toEqual({ required: true });
	});

	it('selectField and statusField set filter defaults and overrides', () => {
		const select = selectField('department', [
			{ value: 'eng', label: 'Eng' },
		]);
		expect(select.type).toBe('text');
		expect((select.filterBy as any).operators).toEqual(['isAny', 'isNone']);

		const selectDisabled = selectField(
			'department',
			[{ value: 'eng', label: 'Eng' }],
			{ filters: false }
		);
		expect(selectDisabled.filterBy).toBe(false);

		const status = statusField('status', [
			{ value: 'open', label: 'Open' },
		]);
		expect(status.enableGlobalSearch).toBe(false);
		expect(status.enableSorting).toBe(false);

		const statusOverride = statusField(
			'status',
			[{ value: 'open', label: 'Open' }],
			{ searchable: true, sortable: true }
		);
		expect(statusOverride.enableGlobalSearch).toBe(true);
		expect(statusOverride.enableSorting).toBe(true);
	});

	it('builds form config based on __form metadata', () => {
		const withForm = textField('title', { form: { required: true } });
		const noForm = textField('location');

		const result = buildFormConfigFromFields([withForm, noForm], {
			type: 'panel',
		});

		expect(result.form.layout).toEqual({ type: 'panel' });
		expect(result.form.fields).toEqual(['title']);
	});

	it('createFieldBuilder chains adds and returns merged config', () => {
		const builder = createFieldBuilder()
			.add(textField('title'))
			.add(textField('location'));

		const built = builder.build({ type: 'regular' });

		expect(built.fields.map((f) => f.id)).toEqual(['title', 'location']);
		expect(built.form.fields).toEqual(['title', 'location']);
		expect(built.form.layout).toEqual({ type: 'regular' });
	});
});

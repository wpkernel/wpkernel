import { act, renderHook } from '@testing-library/react';
import { usePersistentDataViewState } from '../state/persistent-view';
import { usePersistentDataFormState } from '../state/persistent-form';

describe('persistent view state', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('persists view changes to localStorage', () => {
		const defaultView = { type: 'table', layout: { columns: [] } } as any;
		const { result } = renderHook(() =>
			usePersistentDataViewState({
				resource: 'jobs',
				defaultView,
				runtime: { namespace: 'tests' } as any,
			})
		);

		act(() => {
			result.current[1]({
				type: 'table',
				layout: { columns: ['title'] },
			} as any);
		});

		const stored = localStorage.getItem('tests/dataview/jobs');
		expect(stored).toContain('title');
	});

	it('recovers gracefully from invalid stored view data', () => {
		localStorage.setItem('tests/dataview/jobs', '{not-json');
		const defaultView = { type: 'table', layout: { columns: [] } } as any;

		const { result } = renderHook(() =>
			usePersistentDataViewState({
				resource: 'jobs',
				defaultView,
				runtime: { namespace: 'tests' } as any,
			})
		);

		expect(result.current[0]).toEqual(defaultView);
	});
});

describe('persistent form state', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('persists form data and can reset', () => {
		const { result } = renderHook(() =>
			usePersistentDataFormState<{ title: string }>({
				resource: 'jobs',
				namespace: 'tests',
				defaultValue: { title: '' },
			})
		);

		act(() => {
			result.current[1]({ title: 'Engineer' });
		});

		expect(localStorage.getItem('tests/dataform/jobs')).toContain(
			'Engineer'
		);

		act(() => {
			result.current[2]();
		});

		expect(localStorage.getItem('tests/dataform/jobs')).toContain('""');
	});

	it('falls back to default when stored form data is invalid', () => {
		localStorage.setItem('tests/dataform/jobs', '{bad json');

		const { result } = renderHook(() =>
			usePersistentDataFormState<{ title: string }>({
				resource: 'jobs',
				namespace: 'tests',
				defaultValue: { title: 'default' },
			})
		);

		expect(result.current[0]).toEqual({ title: 'default' });
	});
});

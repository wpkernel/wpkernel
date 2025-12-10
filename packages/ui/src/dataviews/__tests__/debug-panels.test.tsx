import { render } from '@testing-library/react';
import { DataViewsDebugPanel } from '../debug/DataViewsDebugPanel';
import { DataFormDebugPanel } from '../debug/DataFormDebugPanel';

const originalEnv = process.env.WPK_DATAVIEWS_DEBUG;

describe('Debug panels', () => {
	beforeEach(() => {
		process.env.WPK_DATAVIEWS_DEBUG = '1';
	});

	afterEach(() => {
		process.env.WPK_DATAVIEWS_DEBUG = originalEnv;
	});

	it('renders DataViewsDebugPanel when enabled', () => {
		const { getByText } = render(
			<DataViewsDebugPanel
				view={{ type: 'table', layout: { columns: [] } } as any}
				paginationInfo={{ totalItems: 0, totalPages: 0 }}
				selection={[]}
				defaultLayouts={{ table: { columns: [] } }}
				permission={{ status: 'allowed' }}
			/>
		);
		expect(getByText(/DataViews debug/i)).toBeTruthy();
	});

	it('renders DataFormDebugPanel when enabled', () => {
		const { getByText } = render(
			<DataFormDebugPanel data={{}} validity={{}} isValid />
		);
		expect(getByText(/DataForm debug/i)).toBeTruthy();
	});

	it('does not render when flag is off', () => {
		process.env.WPK_DATAVIEWS_DEBUG = '0';
		const { queryByText } = render(
			<DataViewsDebugPanel
				view={{ type: 'table', layout: { columns: [] } } as any}
				paginationInfo={{ totalItems: 0, totalPages: 0 }}
				selection={[]}
				defaultLayouts={{ table: { columns: [] } }}
				permission={{ status: 'allowed' }}
			/>
		);
		expect(queryByText(/DataViews debug/i)).toBeNull();
	});

	it('does not render DataFormDebugPanel when flag is off', () => {
		process.env.WPK_DATAVIEWS_DEBUG = '0';
		const { queryByText } = render(
			<DataFormDebugPanel data={{}} validity={{}} isValid />
		);
		expect(queryByText(/DataForm debug/i)).toBeNull();
	});
});

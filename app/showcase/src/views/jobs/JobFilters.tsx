import {
	Flex,
	FlexItem,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export type JobStatusFilter = 'all' | 'draft' | 'publish' | 'closed';

export type JobFiltersState = {
	search: string;
	status: JobStatusFilter;
};

type JobFiltersProps = {
	value: JobFiltersState;
	onChange: (next: JobFiltersState) => void;
};

/**
 * JobFilters renders simple controls for search + status filtering.
 * @param root0
 * @param root0.value
 * @param root0.onChange
 */
export function JobFilters({ value, onChange }: JobFiltersProps): JSX.Element {
	const handleSearchChange = (search: string) => {
		onChange({ ...value, search });
	};

	const handleStatusChange = (status: string) => {
		onChange({
			...value,
			status: (status as JobStatusFilter) || 'all',
		});
	};

	return (
		<Flex align="flex-end" justify="flex-start" wrap>
			<FlexItem>
				<TextControl
					label={__('Search jobs', 'wp-kernel-showcase')}
					placeholder={__(
						'Search by title, department, or location',
						'wp-kernel-showcase'
					)}
					value={value.search}
					onChange={handleSearchChange}
					data-testid="jobs-search-input"
				/>
			</FlexItem>
			<FlexItem>
				<SelectControl
					label={__('Status', 'wp-kernel-showcase')}
					value={value.status}
					onChange={handleStatusChange}
					options={[
						{
							label: __('All statuses', 'wp-kernel-showcase'),
							value: 'all',
						},
						{
							label: __('Published', 'wp-kernel-showcase'),
							value: 'publish',
						},
						{
							label: __('Draft', 'wp-kernel-showcase'),
							value: 'draft',
						},
						{
							label: __('Closed', 'wp-kernel-showcase'),
							value: 'closed',
						},
					]}
					data-testid="jobs-status-select"
				/>
			</FlexItem>
		</Flex>
	);
}

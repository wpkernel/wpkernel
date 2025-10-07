import {
	Card,
	CardBody,
	CardHeader,
	Notice,
	Spinner,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { Job } from '../../../types/job';

type JobListTableProps = {
	jobs: Job[];
	isLoading: boolean;
	errorMessage?: string | null;
};

const formatDate = (value?: string): string => {
	if (!value) {
		return '—';
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return date.toLocaleDateString();
};

/**
 * JobListTable renders an accessible table of job records.
 * @param root0
 * @param root0.jobs
 * @param root0.isLoading
 * @param root0.errorMessage
 */
export function JobListTable({
	jobs,
	isLoading,
	errorMessage,
}: JobListTableProps): JSX.Element {
	return (
		<Card data-testid="jobs-table-card">
			<CardHeader>
				<h2>{__('Job postings', 'wp-kernel-showcase')}</h2>
			</CardHeader>
			<CardBody>
				{isLoading && (
					<div
						className="jobs-table__loading"
						data-testid="jobs-table-loading"
					>
						<Spinner />
					</div>
				)}
				{errorMessage && (
					<Notice
						status="error"
						isDismissible={false}
						data-testid="jobs-table-error"
					>
						{errorMessage}
					</Notice>
				)}
				{!isLoading && !errorMessage && jobs.length === 0 && (
					<div data-testid="jobs-table-empty">
						<Notice status="info" isDismissible={false}>
							{__(
								'No job postings match the current filters.',
								'wp-kernel-showcase'
							)}
						</Notice>
					</div>
				)}{' '}
				{jobs.length > 0 && (
					<table
						className="wp-list-table widefat striped jobs-table"
						data-testid="jobs-table"
					>
						<thead>
							<tr>
								<th scope="col">
									{__('Title', 'wp-kernel-showcase')}
								</th>
								<th scope="col">
									{__('Department', 'wp-kernel-showcase')}
								</th>
								<th scope="col">
									{__('Location', 'wp-kernel-showcase')}
								</th>
								<th scope="col">
									{__('Status', 'wp-kernel-showcase')}
								</th>
								<th scope="col">
									{__('Created', 'wp-kernel-showcase')}
								</th>
							</tr>
						</thead>
						<tbody>
							{jobs.map((jobItem) => (
								<tr
									key={jobItem.id}
									data-testid={`jobs-table-row-${jobItem.id}`}
									data-job-id={jobItem.id}
								>
									<td>
										<strong>{jobItem.title}</strong>
									</td>
									<td>{jobItem.department || '—'}</td>
									<td>{jobItem.location || '—'}</td>
									<td>
										<span data-testid="job-status-value">
											{jobItem.status}
										</span>
									</td>
									<td>{formatDate(jobItem.created_at)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</CardBody>
		</Card>
	);
}

import { useEffect, useState } from '@wordpress/element';
import type { FormEvent } from 'react';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	Notice,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { CreateJobInput } from '../../actions/jobs/CreateJob';

type JobCreatePanelProps = {
	onSubmit: (input: CreateJobInput) => Promise<void> | void;
	feedback?: { type: 'success' | 'error'; message: string } | null;
	isSubmitting: boolean;
};

const createDefaultFormState = (): CreateJobInput => ({
	title: '',
	department: '',
	location: '',
	description: '',
	status: 'draft',
});

/**
 * JobCreatePanel provides a simple admin-side job creation form.
 * @param root0
 * @param root0.onSubmit
 * @param root0.feedback
 * @param root0.isSubmitting
 */
export function JobCreatePanel({
	onSubmit,
	feedback,
	isSubmitting,
}: JobCreatePanelProps): JSX.Element {
	const [formState, setFormState] = useState<CreateJobInput>(
		createDefaultFormState()
	);

	useEffect(() => {
		if (feedback?.type === 'success') {
			setFormState(createDefaultFormState());
		}
	}, [feedback]);

	const updateField = <K extends keyof CreateJobInput>(
		key: K,
		value: CreateJobInput[K]
	) => {
		setFormState((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		await onSubmit(formState);
	};

	return (
		<Card data-testid="job-create-panel">
			<CardHeader>
				<h2>{__('Add a job posting', 'wp-kernel-showcase')}</h2>
			</CardHeader>
			<CardBody>
				{feedback && (
					<div data-testid="job-create-feedback">
						<Notice
							status={
								feedback.type === 'success'
									? 'success'
									: 'error'
							}
							isDismissible={false}
						>
							{feedback.message}
						</Notice>
					</div>
				)}{' '}
				<form onSubmit={handleSubmit} data-testid="job-create-form">
					<TextControl
						label={__('Job title', 'wp-kernel-showcase')}
						value={formState.title}
						onChange={(value) => updateField('title', value)}
						required
						data-testid="job-title-input"
					/>
					<TextControl
						label={__('Department', 'wp-kernel-showcase')}
						value={formState.department ?? ''}
						onChange={(value) => updateField('department', value)}
						data-testid="job-department-input"
					/>
					<TextControl
						label={__('Location', 'wp-kernel-showcase')}
						value={formState.location ?? ''}
						onChange={(value) => updateField('location', value)}
						data-testid="job-location-input"
					/>
					<TextControl
						label={__('Short description', 'wp-kernel-showcase')}
						value={formState.description ?? ''}
						onChange={(value) => updateField('description', value)}
						data-testid="job-description-input"
					/>
					<SelectControl
						label={__('Status', 'wp-kernel-showcase')}
						value={formState.status}
						onChange={(value) =>
							updateField(
								'status',
								(value as CreateJobInput['status']) ?? 'draft'
							)
						}
						options={[
							{
								label: __('Draft', 'wp-kernel-showcase'),
								value: 'draft',
							},
							{
								label: __('Published', 'wp-kernel-showcase'),
								value: 'publish',
							},
							{
								label: __('Closed', 'wp-kernel-showcase'),
								value: 'closed',
							},
						]}
						data-testid="job-status-select"
					/>

					<Button
						type="submit"
						variant="primary"
						isBusy={isSubmitting}
						disabled={isSubmitting}
						data-testid="job-submit-button"
					>
						{isSubmitting
							? __('Creating job…', 'wp-kernel-showcase')
							: __('Create job', 'wp-kernel-showcase')}
					</Button>
				</form>
			</CardBody>
		</Card>
	);
}

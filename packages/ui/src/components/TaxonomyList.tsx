import { useEffect, useState } from 'react';
import { Button, Notice, Spinner, TextControl } from '@wordpress/components';
import { fetch as wpkFetch } from '@wpkernel/core/http';
import { getWPKernelReporter } from '@wpkernel/core/reporter';

type Term = { id?: number; name?: string; slug?: string; description?: string };

type TaxonomyListProps = {
	slug: string;
	title: string;
};

export function TaxonomyList({ slug, title }: TaxonomyListProps) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [terms, setTerms] = useState<Term[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const reporter = getWPKernelReporter();

	const fetchTerms = async () => {
		setIsLoading(true);
		setError(null);
		try {
			reporter?.debug(`[TaxonomyList] Fetching terms for ${slug}...`);
			// hide_empty=0 ensures we see newly created terms that have no posts assigned
			const path = `/wp/v2/${slug}?per_page=100&hide_empty=0`;
			const { data } = (await wpkFetch({
				path,
				method: 'GET',
				meta: {
					namespace: 'acme-jobs',
					resourceName: slug,
				},
			})) as { data: Term[] };

			if (Array.isArray(data)) {
				setTerms(data);
			}
		} catch (err) {
			const m =
				err instanceof Error ? err.message : 'Failed to load terms.';
			reporter?.debug(`[TaxonomyList]${m}`);
			setError(m);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void fetchTerms();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slug]);

	const handleSubmit = async () => {
		if (!name.trim()) {
			setError('Name is required.');
			return;
		}
		setError(null);
		setIsLoading(true);
		try {
			const { data } = (await wpkFetch({
				path: `/wp/v2/${slug}`,
				method: 'POST',
				data: {
					name,
					description,
				},
				meta: {
					namespace: 'acme-jobs',
					resourceName: slug,
				},
			})) as { data: Term };

			if (data) {
				setTerms((prev) => [...prev, data]);
				setName('');
				setDescription('');
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to create term.';
			setError(message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = async (id: number) => {
		try {
			await wpkFetch({
				path: `/wp/v2/${slug}/${id}`,
				method: 'DELETE',
				data: { force: true },
				meta: {
					namespace: 'acme-jobs',
					resourceName: slug,
				},
			});
			setTerms((prev) => prev.filter((t) => t.id !== id));
		} catch (err) {
			const m =
				err instanceof Error ? err.message : 'Failed to delete term.';
			reporter?.debug(`[TaxonomyList] ${m}`);
			setError(m);
			void fetchTerms();
		}
	};

	return (
		<div style={{ display: 'flex', gap: '24px' }}>
			<div style={{ flex: 1 }}>
				<h2>{title}</h2>
				{isLoading && !terms.length ? (
					<div
						style={{
							display: 'flex',
							gap: '8px',
							alignItems: 'center',
						}}
					>
						<Spinner />
						<span>Loading…</span>
					</div>
				) : null}
				{error ? (
					<Notice status="error" isDismissible={false}>
						{error}
					</Notice>
				) : null}
				<table className="widefat striped">
					<thead>
						<tr>
							<th>Name</th>
							<th>Slug</th>
							<th>Description</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{terms.map((term) => (
							<tr key={term.id ?? term.slug}>
								<td>{term.name}</td>
								<td>{term.slug}</td>
								<td>{term.description}</td>
								<td>
									<Button
										variant="secondary"
										isDestructive
										onClick={() =>
											term.id && handleDelete(term.id)
										}
										disabled={isLoading}
									>
										Delete
									</Button>
								</td>
							</tr>
						))}
						{!terms.length && !isLoading ? (
							<tr>
								<td colSpan={4}>No terms yet.</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
			<div style={{ flex: 1 }}>
				<h2>Add new {title.toLowerCase()}</h2>
				<TextControl
					label="Name"
					value={name}
					onChange={(val) => setName(val)}
					disabled={isLoading}
				/>
				<TextControl
					label="Description"
					value={description}
					onChange={(val) => setDescription(val)}
					disabled={isLoading}
				/>
				<Button
					variant="primary"
					onClick={() => void handleSubmit()}
					disabled={isLoading}
				>
					Add new
				</Button>
			</div>
		</div>
	);
}

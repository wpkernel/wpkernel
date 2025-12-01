/** Job Resource Type Definition */
export interface Job {
	date: string;
	date_gmt: string;
	modified: string;
	modified_gmt: string;
	status: string;
	slug: string;
	link: string;
	author: number;
	featured_media: number;
	department?: string;
	tags?: string[];
}

/** Custom filters derived from meta. */
export interface JobQuery {
	page?: number;
	per_page?: number;
	search?: string;
	orderby?: keyof Job | 'relevance';
	order?: 'asc' | 'desc';
	_fields?: string;
	department?: string;
	tags?: string;
}

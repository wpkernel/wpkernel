export interface WorkspaceLike {
	readonly root: string;
	resolve: (...parts: string[]) => string;
	exists: (target: string) => Promise<boolean>;
}

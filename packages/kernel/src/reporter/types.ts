export type ReporterChannel = 'console' | 'hooks' | 'bridge' | 'all';

export type ReporterLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ReporterOptions {
	namespace?: string;
	channel?: ReporterChannel;
	level?: ReporterLevel;
	/**
	 * Enables or disables the reporter instance without changing transport configuration.
	 * Primarily used for conditional debug reporters.
	 */
	enabled?: boolean;
}

export interface ReporterLogMetadata {
	namespace: string;
	level: ReporterLevel;
	message: string;
	context?: unknown;
	timestamp: number;
}

export interface Reporter {
	info: (message: string, context?: unknown) => void;
	warn: (message: string, context?: unknown) => void;
	error: (message: string, context?: unknown) => void;
	debug: (message: string, context?: unknown) => void;
	child: (namespace: string) => Reporter;
}

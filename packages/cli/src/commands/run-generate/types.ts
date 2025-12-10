import type { FileWriterSummary } from '../../utils/file-writer';

export interface GenerationSummary extends FileWriterSummary {
	dryRun: boolean;
}

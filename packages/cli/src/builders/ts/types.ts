import type { Workspace } from '../../workspace';

export type PrintedCapabilityModule = {
	source: string;
	declaration: string;
};
export interface RegistrationEntry {
	readonly importPath: string;
	readonly variableName: string;
}
export interface StubFile {
	readonly path: string;
	readonly contents: string;
}
export interface ModuleSpecifierOptions {
	readonly workspace: Workspace;
	readonly from: string;
	readonly target: string;
}

export interface ResolveResourceImportOptions {
	readonly workspace: Workspace;
	readonly from: string;
	readonly resourceKey: string;
	readonly resourceSymbol?: string;
	readonly configPath?: string;
	readonly generatedResourcesDir: string;
	readonly appliedResourcesDir: string;
	readonly configured?: string;
}
export interface BlockRegistrarMetadata {
	readonly blockKey: string;
	readonly variableName: string;
	readonly manifestIdentifier: string;
	readonly settingsHelperIdentifier: string;
}
export interface RegistrarModuleFactoryOptions {
	readonly outputDir: string;
	readonly source?: string;
}

export interface RegistrarModuleMetadata {
	readonly filePath: string;
	readonly banner: readonly string[];
	readonly registrationFunction: string;
	readonly settingsHelper: string;
}

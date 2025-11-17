type CommandHelpEntry = {
	summary: string;
	description: string;
	details: string;
	examples: Array<[string, string]>;
};

type CommandHelpMap = Record<CommandHelpName, CommandHelpEntry>;

export type CommandHelpName =
	| 'create'
	| 'init'
	| 'generate'
	| 'apply'
	| 'doctor'
	| 'start';

const COMMAND_HELP: CommandHelpMap = {
	create: {
		summary:
			'Scaffold a new plugin workspace, install dependencies, and run readiness checks.',
		description:
			'Create a new WPKernel project: scaffolds files, initialises git, installs npm/Composer dependencies, and runs the quickstart readiness helpers.',
		details: [
			[
				'What happens:',
				'- Generates plugin bootstrap files (`wpk.config.ts`, plugin.php, TS/JS configs, ESLint, Vite).',
				'- Ensures the target directory is clean (use `--force` / `--allow-dirty` to override).',
				'- Installs npm dependencies with the selected package manager and composes PHP autoloaders.',
				'- Runs the quickstart readiness helpers so follow-up commands have diagnostics.',
			].join('\n\n'),
			[
				'Key options:',
				'- `--package-manager <npm|pnpm|yarn>` - override the detected/`WPK_PACKAGE_MANAGER` default.',
				'- `--force` - allow WPKernel to overwrite existing files.',
				'- `--allow-dirty` (`-D`) - bypass git cleanliness checks when you just want to run in a dirty workspace.',
				'- `--prefer-registry-versions` - install published versions instead of linking workspace packages.',
				'- `--name` - override the namespace slug (defaults to the directory name).',
			].join('\n\n'),
			[
				'Tips:',
				'- Set `WPK_PACKAGE_MANAGER` to control the default package manager for CI smoke tests.',
				'- Re-run readiness any time with `wpk doctor --plan quickstart`.',
			].join('\n\n'),
		].join('\n\n'),
		examples: [
			[
				'Scaffold the current directory using pnpm',
				'wpk create --package-manager pnpm',
			],
			[
				'Create a plugin inside ./demo-plugin and overwrite contents',
				'wpk create --force demo-plugin',
			],
		] as [string, string][],
	},

	init: {
		summary:
			'Wire WPKernel tooling into an existing project without scaffolding new files.',
		description:
			'Install WPKernel inside an existing plugin/theme: validates the workspace, links configs, installs deps, and prepares readiness metadata.',
		details: [
			'Use init after cloning an existing repo or when migrating a legacy plugin.',
			'Key options match `wpk create` (`--package-manager`, `--force`, `--allow-dirty`, `--prefer-registry-versions`).',
			'`wpk init` never overwrites project files; it only ensures dependencies and readiness are configured.',
		].join('\n'),
		examples: [
			[
				'Install deps in the current repo using yarn',
				'wpk init --package-manager yarn',
			],
		] as [string, string][],
	},

	generate: {
		summary:
			'Compile wpk.config.* into PHP bridges, TypeScript clients, and capability maps.',
		description:
			'Runs the generation pipeline: loads config, builds the IR, writes artifacts into the layout-defined generation directories, and updates the apply state manifest.',
		details: [
			[
				'Flags:',
				'- `--dry-run` - show a summary of changes without writing files.',
				'- `--verbose` - emit transport/cache debug logs during pipeline execution.',
				'- `--allow-dirty` (`-D`) - run even if git has pending changes (useful in CI environments).',
			].join('\n\n'),
			[
				'Outputs (layout-aware):',
				'- PHP bridges and controllers under the configured `php.generated` directory.',
				'- JavaScript capability runtime under the configured `js.generated` directory.',
				'- Admin UI assets under the configured `ui.generated` directory.',
				'- An apply state manifest used later by `wpk apply` (paths are taken from `layout.manifest.json`).',
			].join('\n\n'),
		].join('\n\n'),
		examples: [
			['Generate artifacts normally', 'wpk generate'],
			[
				'Preview changes without touching the filesystem',
				'wpk generate --dry-run',
			],
			['Capture detailed logs', 'wpk generate --verbose'],
		] as [string, string][],
	},

	apply: {
		summary:
			'Apply the pending patch manifest written by `wpk generate`, with interactive or auto approval.',
		description:
			'Previews file diffs, lets you approve or reject the patch, optionally creates backups, then writes the new artifacts.',
		details: [
			[
				'Flags:',
				'- `--yes` - skip the interactive prompt and apply immediately.',
				'- `--backup` - snapshot the workspace before applying (stores backups under the configured backup directory).',
				'- `--force` - apply even when git detects pending changes or overwriting files.',
				'- `--cleanup <path>` - delete leftover shim paths before applying (repeatable).',
				'- `--allow-dirty` (`-D`) - bypass git safety checks in CI environments.',
			].join('\n\n'),
			[
				'Workflow:',
				'1. Loads the apply manifest produced by `wpk generate` (location is defined in `layout.manifest.json`).',
				'2. Shows a colourised preview; without `--yes` you can accept/abort.',
				'3. Writes files, optionally restores backups on failure.',
			].join('\n\n'),
		].join('\n\n'),
		examples: [
			['Apply immediately inside CI', 'wpk apply --yes --allow-dirty'],
			[
				'Clean stale temp files before applying',
				'wpk apply --cleanup inc/.generated-temp',
			],
		] as [string, string][],
	},

	doctor: {
		summary:
			'Run readiness helpers plus workspace, Composer, and configuration health checks.',
		description:
			'Audits the project: validates `wpk.config.*`, ensures Composer autoloading is configured, runs readiness helpers, and prints a status table.',
		details: [
			'Use `wpk doctor` after cloning a repo or before release builds to confirm prerequisites.',
			'Readiness scopes come from `wpk.config` (`config.readiness.helpers`). Each helper outputs pass/warn/fail.',
			'Combine with `wpk doctor --help` and `wpk doctor | less` to inspect long summaries.',
		].join('\n'),
		examples: [
			['Run the default health checks', 'wpk doctor'],
			['Capture output for CI artifacts', 'wpk doctor > doctor.log'],
		] as [string, string][],
	},

	start: {
		summary:
			'Watch config + source files, regenerate on change, and launch the Vite dev server.',
		description:
			'Combines `wpk generate --watch` and `npm run dev`: watches the workspace, reruns generation tiers, and proxies to WordPress via Vite.',
		details: [
			[
				'Flags:',
				'- `--verbose` - stream watcher + Vite diagnostics.',
				'- `--auto-apply` - automatically re-run `wpk apply --yes` when PHP artifacts change.',
				'- The command prints the local dev URL once Vite is ready. Press Ctrl+C to stop both the watcher and Vite.',
			].join('\n\n'),
		].join('\n'),
		examples: [
			['Start the dev server with verbose logs', 'wpk start --verbose'],
			[
				'Automatically apply PHP artifacts on every run',
				'wpk start --auto-apply',
			],
		] as [string, string][],
	},
};

const CLI_HELP = {
	description:
		'Unified CLI for scaffolding, generating, applying, and validating WPKernel projects.',
	details: [
		[
			'Flags',
			'- `--version` (`-v`) - print the CLI version and exit.',
			'- `--package-manager <npm|pnpm|yarn>` (`-p` / `-pm`) - available on `wpk create` and `wpk init` to force the installer (falls back to `WPK_PACKAGE_MANAGER`).',
		].join('\n\n'),
		[
			'Common workflow:',
			'1. `wpk create my-plugin`',
			'2. `cd my-plugin`',
			'3. `wpk generate`',
			'4. `wpk apply --yes`',
			'5. `wpk doctor --plan quickstart` (or run without a plan)',
			'6. `wpk start`',
		].join('\n\n'),
		[
			'Environment variables:',
			'- `WPK_PACKAGE_MANAGER` - default package manager (npm/pnpm/yarn).',
			'- `WPK_PREFER_REGISTRY_VERSIONS` - set to 1 to prefer published packages when installing.',
			'- `REGISTRY_URL` - override the npm registry used by installers.',
			'- `WPK_INIT_INSTALL_NODE_MAX_MS` / `WPK_INIT_INSTALL_COMPOSER_MAX_MS` - installer timeouts (ms).',
		].join('\n\n'),
		'Every command supports `wpk <command> --help` for option-level guidance.',
	].join('\n\n'),
	examples: [
		[
			'Bootstrap and generate a plugin',
			'wpk create my-plugin && cd my-plugin && wpk generate',
		],
		['View help for a specific command', 'wpk apply --help'],
	] as [string, string][],
};

export { CLI_HELP, COMMAND_HELP };

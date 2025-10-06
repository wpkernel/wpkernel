import { promises as fs } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const bump = (process.argv[2] || "patch"); // "patch" | "minor" | "major"
const summary = process.argv.slice(3).join(" ").trim() || "Update.";

// read the fixed packages directly from .changeset/config.json
async function readFixedPackages() {
	const cfgPath = join(root, ".changeset", "config.json");
	const raw = await fs.readFile(cfgPath, "utf8");
	const cfg = JSON.parse(raw);
	const fixedGroups = Array.isArray(cfg.fixed) ? cfg.fixed : [];
	// flatten (you have one group)
	const pkgs = new Set();
	for (const group of fixedGroups) for (const name of group) pkgs.add(name);
	// filter to only those that actually exist & are public
	const paths = await allPackageJsonPaths();
	const byName = new Map();
	for (const p of paths) {
		const j = JSON.parse(await fs.readFile(p, "utf8"));
		if (j.name && !j.private) byName.set(j.name, true);
	}
	return [...pkgs].filter((n) => byName.has(n)).sort();
}

async function allPackageJsonPaths() {
	const rootPkg = JSON.parse(await fs.readFile(join(root, "package.json"), "utf8"));
	const patterns = rootPkg.workspaces?.packages || rootPkg.workspaces || ["packages/*"];
	const out = [];
	for (const pat of patterns) {
		const base = pat.replace(/\/\*$/, "");
		try {
			const entries = await fs.readdir(join(root, base), { withFileTypes: true });
			for (const e of entries) {
				if (!e.isDirectory()) continue;
				const p = join(root, base, e.name, "package.json");
				try {
					await fs.access(p);
					out.push(p);
				} catch { }
			}
		} catch { }
	}
	return out;
}

function makeFrontmatter(pkgNames, bump) {
	const lines = ["---"];
	for (const name of pkgNames) lines.push(`"${name}": ${bump}`);
	lines.push("---", "");
	return lines.join("\n");
}

function filenameFrom(summary) {
	const iso = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "");
	const slug = summary.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "update";
	return `${iso}-${slug}.md`;
}

(async () => {
	const pkgs = await readFixedPackages();
	if (!pkgs.length) {
		console.error("No public packages found from .changeset/config.json fixed groups.");
		process.exit(1);
	}
	const dir = join(root, ".changeset");
	await fs.mkdir(dir, { recursive: true });
	const file = join(dir, filenameFrom(summary));
	const body = makeFrontmatter(pkgs, bump) + summary + "\n";
	await fs.writeFile(file, body, "utf8");
	console.log(`Created ${file}`);
})().catch((e) => {
	console.error(e);
	process.exit(1);
});

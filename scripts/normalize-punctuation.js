#!/usr/bin/env node

/**
 * Post-format script: Normalize characters in markdown files
 * This runs after Prettier to enforce consistent punctuation/symbols
 */

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

// --- CONFIGURATION ARRAY ---
// Define replacements as an array of objects.
// Each object must have a 'search' RegExp (or string) and a 'replace' string.
const REPLACEMENTS = [
	// Example 1: Em-dash normalization
	{
		name: 'em dash',
		search: /—/g, // The character to find (em dash)
		replace: '-', // The character to use instead (hyphen)
	},
	// Example 2: The exact replacements you asked for (e.g., green checkmark to black checkmark)
	// Note: The specific Unicode character for a checkmark is U+2714 (✓)
	{
		name: 'colored checkmark',
		search: /✅/g, // The colored checkmark (U+2705)
		replace: '✓', // The simple black checkmark (U+2714)
	},
	// Example 3: Colored cross to simple black cross
	// Note: The specific Unicode character for the cross mark is U+2716 (✗) or U+2715 (✕)
	{
		name: 'colored cross mark',
		search: /❌/g, // The colored cross mark (U+274C)
		replace: '✗', // The black cross mark (U+2717)
	},
	// Add any other replacements here:
	// {
	//   name: 'copyright symbol',
	//   search: /\(c\)/g,
	//   replace: '©',
	// },
];

const files = globSync('**/*.md', {
	ignore: [
		'**/node_modules/**',
		'**/dist/**',
		'**/build/**',
		'**/coverage/**',
	],
});

// A map to store total counts for each replacement type
const totalReplacementCounts = {};

files.forEach((file) => {
	try {
		let content = readFileSync(file, 'utf8');
		const originalContent = content; // Keep the initial content for comparison
		const fileReplacements = [];

		// Loop through each defined replacement
		REPLACEMENTS.forEach(({ name, search, replace }) => {
			// 1. Calculate the number of replacements needed BEFORE the change
			const matches = content.match(search);
			const count = (matches || []).length;

			if (count > 0) {
				// 2. Perform the replacement on the *current* content string
				content = content.replace(search, replace);

				// 3. Log the file-specific replacement
				fileReplacements.push({ name, count });

				// 4. Update the global total
				totalReplacementCounts[name] =
					(totalReplacementCounts[name] || 0) + count;
			}
		});

		// Write the file ONLY if the content has changed
		if (originalContent !== content) {
			writeFileSync(file, content, 'utf8');

			// Consolidated log for the file
			const logMessage = fileReplacements
				.map(({ name, count }) => `${count} ${name}(s)`)
				.join(', ');

			console.log(`✓ ${file}: replaced ${logMessage}`);
		}
	} catch (err) {
		console.error(`✗ ${file}: ${err.message}`);
	}
});

// --- FINAL SUMMARY ---
const totalTypes = Object.keys(totalReplacementCounts).length;

if (totalTypes > 0) {
	console.log('\n--- Normalization Summary ---');
	let grandTotal = 0;

	for (const name in totalReplacementCounts) {
		const count = totalReplacementCounts[name];
		grandTotal += count;
		console.log(`\t• ${count} total ${name}(s) normalized`);
	}

	console.log(`\nTotal Replacements Made: ${grandTotal}`);
} else {
	console.log(
		'No characters found for normalization - all files already clean'
	);
}

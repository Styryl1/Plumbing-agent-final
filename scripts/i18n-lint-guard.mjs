#!/usr/bin/env node

/**
 * i18n Lint Guard - Detects double-prefix anti-patterns
 * Prevents calls like: useTranslations('jobs') + t('jobs.*')
 * Enforces: useTranslations('jobs') + t('title') (leaf keys only)
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const COMPONENT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const SRC_PATTERN = 'src/**/*{.tsx,.ts,.jsx,.js}';

// Regex patterns for detection
const USE_TRANSLATIONS_PATTERN = /useTranslations\(['"]([^'"]+)['"]\)/g;
const T_CALL_PATTERN = /\bt\(['"]([^'"]+)['"]\)/g;

class I18nLintGuard {
	constructor() {
		this.errors = [];
		this.warnings = [];
		this.filesProcessed = 0;
	}

	/**
	 * Extract namespace from useTranslations() calls
	 */
	extractNamespaces(content) {
		const namespaces = new Set();
		let match;

		const regex = new RegExp(USE_TRANSLATIONS_PATTERN.source, 'g');
		while ((match = regex.exec(content)) !== null) {
			namespaces.add(match[1]);
		}

		return Array.from(namespaces);
	}

	/**
	 * Extract all t() call keys
	 */
	extractTCalls(content) {
		const calls = [];
		let match;

		const regex = new RegExp(T_CALL_PATTERN.source, 'g');
		while ((match = regex.exec(content)) !== null) {
			calls.push({
				key: match[1],
				line: content.substring(0, match.index).split('\\n').length
			});
		}

		return calls;
	}

	/**
	 * Detect double-prefix violations
	 */
	detectDoublePrefix(namespaces, tCalls) {
		const violations = [];

		for (const namespace of namespaces) {
			for (const call of tCalls) {
				// Check if t() call starts with the namespace (double-prefix)
				if (call.key.startsWith(namespace + '.')) {
					violations.push({
						namespace,
						key: call.key,
						line: call.line,
						suggestion: call.key.replace(namespace + '.', ''),
						type: 'double-prefix'
					});
				}
			}
		}

		return violations;
	}

	/**
	 * Detect bare useTranslations() calls (should be namespaced)
	 */
	detectBareHooks(content) {
		const bareHooks = [];
		const barePattern = /useTranslations\\(\\)/g;
		let match;

		while ((match = barePattern.exec(content)) !== null) {
			bareHooks.push({
				line: content.substring(0, match.index).split('\\n').length,
				type: 'bare-hook'
			});
		}

		return bareHooks;
	}

	/**
	 * Process a single file
	 */
	async processFile(filePath) {
		try {
			const content = await readFile(filePath, 'utf-8');
			const namespaces = this.extractNamespaces(content);
			const tCalls = this.extractTCalls(content);
			const bareHooks = this.detectBareHooks(content);

			// Skip files without i18n usage
			if (namespaces.length === 0 && tCalls.length === 0 && bareHooks.length === 0) {
				return;
			}

			this.filesProcessed++;

			// Check for double-prefix violations
			const violations = this.detectDoublePrefix(namespaces, tCalls);

			if (violations.length > 0 || bareHooks.length > 0) {
				const fileErrors = {
					file: filePath,
					violations,
					bareHooks,
					namespaces,
					totalCalls: tCalls.length
				};

				this.errors.push(fileErrors);
			}

		} catch (error) {
			this.warnings.push(`Warning: Could not process ${filePath}: ${error.message}`);
		}
	}

	/**
	 * Format results for display
	 */
	formatResults() {
		if (this.errors.length === 0 && this.warnings.length === 0) {
			return {
				success: true,
				message: `✅ i18n Lint Guard: All ${this.filesProcessed} files passed validation`
			};
		}

		let output = ['🚨 i18n Lint Guard: Found violations\\n'];

		for (const fileError of this.errors) {
			output.push(`📁 ${fileError.file}`);
			output.push(`   Namespaces: ${fileError.namespaces.join(', ')}`);
			output.push(`   Total t() calls: ${fileError.totalCalls}\\n`);

			// Double-prefix violations
			for (const violation of fileError.violations) {
				output.push(`   ❌ Line ${violation.line}: Double-prefix detected`);
				output.push(`      Hook: useTranslations('${violation.namespace}')`);
				output.push(`      Call: t('${violation.key}')`);
				output.push(`      Fix:  t('${violation.suggestion}')\\n`);
			}

			// Bare hook violations
			for (const bare of fileError.bareHooks) {
				output.push(`   ⚠️  Line ${bare.line}: Bare hook detected`);
				output.push(`      Found: useTranslations()`);
				output.push(`      Fix:   useTranslations('SomeNamespace')\\n`);
			}
		}

		if (this.warnings.length > 0) {
			output.push('\\n⚠️  Warnings:');
			for (const warning of this.warnings) {
				output.push(`   ${warning}`);
			}
		}

		const summary = `\\n📊 Summary: ${this.errors.length} files with violations, ${this.filesProcessed} files processed`;
		output.push(summary);

		return {
			success: false,
			message: output.join('\\n')
		};
	}

	/**
	 * Recursively find component files
	 */
	async findComponentFiles(dir = 'src', files = []) {
		try {
			const entries = await readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = join(dir, entry.name);

				if (entry.isDirectory()) {
					// Skip certain directories
					if (['node_modules', 'build', '.next'].includes(entry.name)) {
						continue;
					}
					await this.findComponentFiles(fullPath, files);
				} else if (entry.isFile() && COMPONENT_EXTENSIONS.includes(extname(entry.name))) {
					files.push(fullPath);
				}
			}
		} catch (error) {
			// Ignore directories we can't read
		}

		return files;
	}

	/**
	 * Main execution
	 */
	async run() {
		console.log('🔍 i18n Lint Guard: Scanning for double-prefix violations...');

		try {
			const componentFiles = await this.findComponentFiles();
			console.log(`📁 Found ${componentFiles.length} component files to scan`);

			// Process all files
			await Promise.all(componentFiles.map(file => this.processFile(file)));

			// Format and display results
			const result = this.formatResults();
			console.log(result.message);

			// Exit with error code if violations found
			if (!result.success) {
				process.exit(1);
			}

		} catch (error) {
			console.error('❌ i18n Lint Guard failed:', error.message);
			process.exit(1);
		}
	}
}

// Run the guard if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const guard = new I18nLintGuard();
	await guard.run();
}

export default I18nLintGuard;
#!/usr/bin/env node

/**
 * i18n Parity Check - Ensures EN and NL translations have identical key structure
 * Prevents translator drift where keys exist in one language but not the other
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const MESSAGES_DIR = 'src/i18n/messages';
const SUPPORTED_LOCALES = ['en', 'nl'];

class I18nParityChecker {
	constructor() {
		this.errors = [];
		this.warnings = [];
		this.localeData = {};
	}

	/**
	 * Recursively extract all key paths from a nested object
	 */
	extractKeyPaths(obj, prefix = '') {
		const keys = new Set();

		for (const [key, value] of Object.entries(obj)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;

			if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
				// Recurse into nested objects
				const nestedKeys = this.extractKeyPaths(value, fullKey);
				for (const nestedKey of nestedKeys) {
					keys.add(nestedKey);
				}
			} else {
				// Leaf key (string, number, boolean, array)
				keys.add(fullKey);
			}
		}

		return keys;
	}

	/**
	 * Load and parse JSON for a specific locale
	 */
	async loadLocaleData(locale) {
		try {
			const filePath = join(MESSAGES_DIR, `${locale}.json`);
			const content = await readFile(filePath, 'utf-8');
			const data = JSON.parse(content);

			return {
				data,
				keys: this.extractKeyPaths(data),
				path: filePath
			};
		} catch (error) {
			throw new Error(`Failed to load ${locale}.json: ${error.message}`);
		}
	}

	/**
	 * Find missing keys between two locales
	 */
	findMissingKeys(sourceKeys, targetKeys, sourceLang, targetLang) {
		const missing = [];

		for (const key of sourceKeys) {
			if (!targetKeys.has(key)) {
				missing.push({
					key,
					source: sourceLang,
					target: targetLang,
					type: 'missing-key'
				});
			}
		}

		return missing;
	}

	/**
	 * Find structural differences (different value types)
	 */
	findStructuralDiffs(sourceData, targetData, sourceLang, targetLang, prefix = '') {
		const diffs = [];

		for (const [key, sourceValue] of Object.entries(sourceData)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			const targetValue = targetData[key];

			if (targetValue === undefined) {
				continue; // Already caught by findMissingKeys
			}

			const sourceType = Array.isArray(sourceValue) ? 'array' : typeof sourceValue;
			const targetType = Array.isArray(targetValue) ? 'array' : typeof targetValue;

			if (sourceType !== targetType) {
				diffs.push({
					key: fullKey,
					source: sourceLang,
					target: targetLang,
					sourceType,
					targetType,
					type: 'type-mismatch'
				});
			} else if (sourceType === 'object' && targetType === 'object') {
				// Recurse into nested objects
				const nestedDiffs = this.findStructuralDiffs(
					sourceValue,
					targetValue,
					sourceLang,
					targetLang,
					fullKey
				);
				diffs.push(...nestedDiffs);
			}
		}

		return diffs;
	}

	/**
	 * Find ICU message format inconsistencies
	 */
	findICUInconsistencies(sourceData, targetData, sourceLang, targetLang, prefix = '') {
		const inconsistencies = [];

		for (const [key, sourceValue] of Object.entries(sourceData)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			const targetValue = targetData[key];

			if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
				// Extract ICU placeholders: {name}, {count, plural, ...}, etc.
				const sourcePlaceholders = sourceValue.match(/\\{[^}]+\\}/g) || [];
				const targetPlaceholders = targetValue.match(/\\{[^}]+\\}/g) || [];

				// Compare placeholder sets
				const sourceSet = new Set(sourcePlaceholders);
				const targetSet = new Set(targetPlaceholders);

				const missingInTarget = [...sourceSet].filter(p => !targetSet.has(p));
				const extraInTarget = [...targetSet].filter(p => !sourceSet.has(p));

				if (missingInTarget.length > 0 || extraInTarget.length > 0) {
					inconsistencies.push({
						key: fullKey,
						source: sourceLang,
						target: targetLang,
						missingInTarget,
						extraInTarget,
						type: 'icu-mismatch'
					});
				}
			} else if (typeof sourceValue === 'object' && typeof targetValue === 'object') {
				// Recurse into nested objects
				const nestedInconsistencies = this.findICUInconsistencies(
					sourceValue,
					targetValue,
					sourceLang,
					targetLang,
					fullKey
				);
				inconsistencies.push(...nestedInconsistencies);
			}
		}

		return inconsistencies;
	}

	/**
	 * Compare two locales for parity
	 */
	compareLocales(locale1Data, locale2Data) {
		const { data: data1, keys: keys1, path: path1 } = locale1Data;
		const { data: data2, keys: keys2, path: path2 } = locale2Data;
		const locale1 = path1.match(/(\\w+)\\.json$/)[1];
		const locale2 = path2.match(/(\\w+)\\.json$/)[1];

		const comparison = {
			locale1,
			locale2,
			missing: [],
			structural: [],
			icu: []
		};

		// Find missing keys in both directions
		comparison.missing.push(...this.findMissingKeys(keys1, keys2, locale1, locale2));
		comparison.missing.push(...this.findMissingKeys(keys2, keys1, locale2, locale1));

		// Find structural differences
		comparison.structural.push(...this.findStructuralDiffs(data1, data2, locale1, locale2));
		comparison.structural.push(...this.findStructuralDiffs(data2, data1, locale2, locale1));

		// Find ICU inconsistencies
		comparison.icu.push(...this.findICUInconsistencies(data1, data2, locale1, locale2));

		return comparison;
	}

	/**
	 * Format results for display
	 */
	formatResults(comparisons) {
		const totalIssues = comparisons.reduce(
			(sum, comp) => sum + comp.missing.length + comp.structural.length + comp.icu.length,
			0
		);

		if (totalIssues === 0) {
			return {
				success: true,
				message: '✅ i18n Parity Check: All locales have consistent key structure'
			};
		}

		let output = ['🚨 i18n Parity Check: Found inconsistencies\\n'];

		for (const comparison of comparisons) {
			if (comparison.missing.length > 0 || comparison.structural.length > 0 || comparison.icu.length > 0) {
				output.push(`🔄 ${comparison.locale1.toUpperCase()} ↔ ${comparison.locale2.toUpperCase()}\\n`);

				// Missing keys
				for (const missing of comparison.missing) {
					output.push(`   ❌ Missing in ${missing.target.toUpperCase()}: "${missing.key}"`);
				}

				// Structural differences
				for (const diff of comparison.structural) {
					output.push(`   ⚠️  Type mismatch: "${diff.key}"`);
					output.push(`      ${diff.source.toUpperCase()}: ${diff.sourceType}`);
					output.push(`      ${diff.target.toUpperCase()}: ${diff.targetType}`);
				}

				// ICU inconsistencies
				for (const icu of comparison.icu) {
					output.push(`   🔤 ICU mismatch: "${icu.key}"`);
					if (icu.missingInTarget.length > 0) {
						output.push(`      Missing in ${icu.target.toUpperCase()}: ${icu.missingInTarget.join(', ')}`);
					}
					if (icu.extraInTarget.length > 0) {
						output.push(`      Extra in ${icu.target.toUpperCase()}: ${icu.extraInTarget.join(', ')}`);
					}
				}

				output.push('');
			}
		}

		const summary = `📊 Summary: ${totalIssues} issues found across ${comparisons.length} locale pair(s)`;
		output.push(summary);

		return {
			success: false,
			message: output.join('\\n')
		};
	}

	/**
	 * Main execution
	 */
	async run() {
		console.log('🔍 i18n Parity Check: Validating locale consistency...');

		try {
			// Load all supported locales
			for (const locale of SUPPORTED_LOCALES) {
				this.localeData[locale] = await this.loadLocaleData(locale);
				console.log(`📁 Loaded ${locale}.json (${this.localeData[locale].keys.size} keys)`);
			}

			// Compare all locale pairs
			const comparisons = [];
			for (let i = 0; i < SUPPORTED_LOCALES.length; i++) {
				for (let j = i + 1; j < SUPPORTED_LOCALES.length; j++) {
					const locale1 = SUPPORTED_LOCALES[i];
					const locale2 = SUPPORTED_LOCALES[j];

					const comparison = this.compareLocales(
						this.localeData[locale1],
						this.localeData[locale2]
					);

					comparisons.push(comparison);
				}
			}

			// Format and display results
			const result = this.formatResults(comparisons);
			console.log(result.message);

			// Exit with error code if inconsistencies found
			if (!result.success) {
				process.exit(1);
			}

		} catch (error) {
			console.error('❌ i18n Parity Check failed:', error.message);
			process.exit(1);
		}
	}
}

// Run the checker if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const checker = new I18nParityChecker();
	await checker.run();
}

export default I18nParityChecker;
/**
 * Custom ESLint rule: no-banned-strings
 * 
 * Advanced detection of placeholder strings, hardcoded UUIDs, and banned patterns.
 * Catches violations in literals, template strings, and other string contexts.
 * 
 * Designed for Dutch plumbing SaaS to prevent "Tijdelijke klant" and similar issues.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ban placeholder strings, hardcoded UUIDs, and temporary identifiers',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      bannedString: 'Banned placeholder/hardcoded value: "{{text}}" - Use proper data sources or i18n keys instead',
      bannedUuid: 'Hardcoded UUID detected: "{{uuid}}" - Use variables, constants, or proper data flow instead',
      bannedPattern: 'Banned pattern detected: "{{pattern}}" - This appears to be placeholder/temporary content',
    },
  },

  create(context) {
    const filename = context.getFilename();
    
    // Skip files where "placeholder" is legitimate
    if (
      filename.includes('eslint-rules') ||
      filename.includes('/ui/') ||
      filename.includes('shadcn') ||
      filename.endsWith('.d.ts') ||
      filename.includes('node_modules')
    ) {
      return {}; // Skip linting this file
    }

    // Comprehensive banned patterns with Dutch plumbing business context
    const BANNED_PATTERNS = [
      // Dutch placeholder patterns (high priority - always ban)
      /\b(Tijdelijke|Temporary)\s+(klant|customer)\b/i,
      /\bTest\s+(klant|customer)\b/i,
      /\b(Placeholder|Dummy)\s+(klant|customer)\b/i,
      
      // Suspicious business-specific patterns (not just generic "placeholder")
      /\btemp(?!late|oral)\s*klant/i,  // "temp klant" but not "template" or "temporal"
      /\bdummy\s*(customer|klant|user|client)/i,
      /\bfake\s*(customer|klant|user|client)/i,
      /\bsample\s*(customer|klant|user|client)/i,
      /\bmock\s*(customer|klant|user|client)/i,
      
      // Development placeholder patterns
      /\btodo:?\s*\w/i,
      /\bfixme:?\s*\w/i,
      /\bhack\b/i,
      
      // Business-specific Dutch patterns
      /\btest\s*loodgieter/i,
      /\bvoorbeeld\s*klant/i,
      /\bnep\s*klant/i,
    ];

    // UUID patterns (v1-v5, including all-zero UUID)
    const UUID_PATTERNS = [
      // All-zero UUID (common placeholder)
      /\b00000000-0000-0000-0000-000000000000\b/i,
      
      // Standard UUID v1-v5 patterns
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
      
      // Nil UUID variations
      /\b0{8}-0{4}-0{4}-0{4}-0{12}\b/i,
    ];

    /**
     * Check text for banned patterns and report violations
     */
    const checkText = (text, node) => {
      if (!text || typeof text !== 'string') return;

      // Check for banned string patterns
      for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(text)) {
          context.report({
            node,
            messageId: 'bannedPattern',
            data: { pattern: text.match(pattern)[0] },
          });
          return; // Report first match only to avoid noise
        }
      }

      // Check for UUID patterns
      for (const uuidPattern of UUID_PATTERNS) {
        const match = text.match(uuidPattern);
        if (match) {
          context.report({
            node,
            messageId: 'bannedUuid',
            data: { uuid: match[0] },
          });
          return; // Report first match only
        }
      }

      // Check for other suspicious patterns (longer strings only to reduce false positives)
      if (text.length > 10) {
        const suspiciousPatterns = [
          /^(temp|tmp|test|sample|demo|example|placeholder)$/i,
          /^user\d+$/i,
          /^customer\d+$/i,
          /^client\d+$/i,
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(text.trim())) {
            context.report({
              node,
              messageId: 'bannedString',
              data: { text: text.trim() },
            });
            return;
          }
        }
      }
    };

    return {
      // String literals: "some string"
      Literal(node) {
        if (typeof node.value === 'string') {
          checkText(node.value, node);
        }
      },

      // Template literals: `some ${var} string`
      TemplateLiteral(node) {
        // Check static parts of template literals
        node.quasis.forEach((quasi) => {
          if (quasi.value && quasi.value.cooked) {
            checkText(quasi.value.cooked, node);
          }
        });
      },

      // JSX text content: <span>some text</span>
      JSXText(node) {
        if (node.value && typeof node.value === 'string') {
          checkText(node.value.trim(), node);
        }
      },

      // JSX attribute values: <input value="some text" />
      JSXExpressionContainer(node) {
        if (node.expression && node.expression.type === 'Literal') {
          if (typeof node.expression.value === 'string') {
            checkText(node.expression.value, node);
          }
        }
      },
    };
  },
};
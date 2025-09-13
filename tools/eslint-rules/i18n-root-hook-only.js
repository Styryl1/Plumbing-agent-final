/**
 * Custom ESLint rule: i18n-root-hook-only
 *
 * Enforces the bulletproof i18n pattern: root hook + full path keys only.
 * Forbids namespaced useTranslations calls to eliminate Claude confusion.
 *
 * ✅ ALLOWED: const t = useTranslations(); t('customers.form.name.label')
 * ❌ FORBIDDEN: const tForm = useTranslations('customers.form'); tForm('name.label')
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce root hook + full path keys pattern for i18n',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        allowList: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files where namespaced hooks are allowed (emergency override)'
        }
      },
      additionalProperties: false
    }],
    messages: {
      namespacedHook: 'Forbidden: useTranslations("{{namespace}}") - Use root hook only: const t = useTranslations(); t("{{namespace}}.{{suggestedKey}}")',
      mixedPatterns: 'Mixed i18n patterns detected in same file - Use either all root hooks or all namespaced hooks (file must be allowlisted for namespaced)',
      rootHookPreferred: 'Use root hook pattern: const t = useTranslations(); t("{{fullPath}}") instead of namespaced hook',
      doubleNamespace: 'Potential double namespace in key "{{key}}" - verify this is correct'
    },
  },

  create(context) {
    const filename = context.getFilename();
    const options = context.options[0] || {};
    const allowList = options.allowList || [];

    // Check if file is allowlisted for namespaced hooks
    const isAllowlisted = allowList.some(pattern => {
      if (pattern.includes('*')) {
        // Convert glob pattern to simple string matching (security-compliant)
        const prefix = pattern.split('*')[0] || '';
        const suffix = pattern.split('*').pop() || '';
        return filename.includes(prefix) && (suffix === '' || filename.endsWith(suffix));
      }
      return filename.includes(pattern);
    });

    // Skip certain files entirely
    if (
      filename.includes('eslint-rules') ||
      filename.includes('node_modules') ||
      filename.endsWith('.d.ts') ||
      filename.includes('.config.')
    ) {
      return {};
    }

    // Track patterns used in this file
    let hasRootHook = false;
    let hasNamespacedHook = false;
    const namespacedHooks = [];
    const rootHooks = [];

    /**
     * Check if a call expression is a namespaced useTranslations call
     */
    const isNamespacedUseTranslations = (node) => {
      return (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'useTranslations' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal' &&
        typeof node.arguments[0].value === 'string'
      );
    };

    /**
     * Check if a call expression is a root useTranslations call
     */
    const isRootUseTranslations = (node) => {
      return (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'useTranslations' &&
        node.arguments.length === 0
      );
    };

    /**
     * Get suggested key for error message
     */
    const getSuggestedKey = (namespace) => {
      // Common patterns for key suggestions
      const commonKeys = {
        'customers': 'form.name.label',
        'jobs': 'title',
        'actions': 'edit',
        'invoices': 'table.customer',
        'common': 'status.planned'
      };
      return commonKeys[namespace] || 'key';
    };

    /**
     * Check for potential double namespace in translation keys
     */
    const checkForDoubleNamespace = (keyValue, node) => {
      if (typeof keyValue !== 'string') return;

      // Common namespace patterns that might be doubled
      const namespaces = ['customers', 'jobs', 'invoices', 'actions', 'common', 'ui', 'misc'];

      for (const ns of namespaces) {
        // Check if key starts with namespace.namespace (e.g., "customers.customers.name")
        // Use string methods for security compliance
        const doubleNamespacePrefix = ns + '.' + ns + '.';
        if (keyValue.startsWith(doubleNamespacePrefix)) {
          context.report({
            node,
            messageId: 'doubleNamespace',
            data: { key: keyValue }
          });
          return;
        }
      }
    };

    return {
      // Track variable declarations with useTranslations
      VariableDeclarator(node) {
        if (!node.init) return;

        if (isNamespacedUseTranslations(node.init)) {
          hasNamespacedHook = true;
          const namespace = node.init.arguments[0].value;
          namespacedHooks.push({
            node,
            namespace,
            variableName: node.id.name
          });

          // Report error if not allowlisted
          if (!isAllowlisted) {
            context.report({
              node,
              messageId: 'namespacedHook',
              data: {
                namespace: namespace,
                suggestedKey: getSuggestedKey(namespace)
              },
              fix(fixer) {
                // Auto-fix: convert to root hook
                return fixer.replaceText(node.init, 'useTranslations()');
              }
            });
          }
        } else if (isRootUseTranslations(node.init)) {
          hasRootHook = true;
          rootHooks.push({
            node,
            variableName: node.id.name
          });
        }
      },

      // Check translation key calls for double namespacing
      CallExpression(node) {
        // Skip the useTranslations calls themselves
        if (node.callee.name === 'useTranslations') return;

        // Check calls to translation functions (e.g., t('key'))
        if (
          node.callee.type === 'Identifier' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal'
        ) {
          const keyValue = node.arguments[0].value;
          checkForDoubleNamespace(keyValue, node);
        }
      },

      // At end of file, check for mixed patterns
      'Program:exit'(node) {
        if (hasRootHook && hasNamespacedHook && !isAllowlisted) {
          context.report({
            node,
            messageId: 'mixedPatterns'
          });
        }
      }
    };
  },
};
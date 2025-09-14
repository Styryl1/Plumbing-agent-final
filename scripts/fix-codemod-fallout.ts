/* scripts/fix-codemod-fallout.ts
 * Cross-platform cleanup for broken codemods:
 * - Normalize "use client" (remove expression form, top-of-file for non-pages; strip from server/api/routes/pages/layouts)
 * - Remove server-side/unused useTranslations imports
 * - Replace useT("ns") → useTranslations("ns")
 */
import fg from 'fast-glob';
import { Project, SyntaxKind, Node } from 'ts-morph';
import path from 'node:path';
import fs from 'node:fs';

(async () => {
const project = new Project({ tsConfigFilePath: 'tsconfig.json', skipAddingFilesFromTsConfig: false });

const files = await fg(['src/**/*.{ts,tsx}'], {
  dot: true,
  ignore: [
    '**/*.d.ts',
    'src/components/_legacy_*/**/*',
    'src/server/**/*.legacy.ts',
    'src/schema/**/*.legacy.ts',
    'node_modules/**'
  ]
});

const isServerPath = (p: string): boolean => {
  if (p.includes('/src/server/')) return true;
  if (p.includes('/src/app/api/')) return true;
  if (p.endsWith('/route.ts') || p.endsWith('/route.tsx')) return true;
  if (p.endsWith('/layout.tsx')) return true;
  if (p.endsWith('/page.tsx')) return true; // pages should stay server by default
  return false;
};

const hadClientDirective = (text: string): boolean =>
  /["']use client["']/.test(text) || /\(\s*["']use client["']\s*\);?/.test(text);

// Normalize directive text
const stripExprDirective = (text: string): string =>
  text.replace(/\(\s*["']use client["']\s*\);?/g, '').replace(/^\s*['"]use client['"]\s*[\r\n]*/m, '');

const putDirectiveAtTop = (text: string): string => {
  // remove any existing directive then insert at very top
  const cleaned = stripExprDirective(text).replace(/^\s*['"]use client['"]\s*[\r\n]*/m, '');
  return `'use client';\n` + cleaned;
};

let changedCount = 0;

for (const filePath of files) {
  const sf = project.addSourceFileAtPath(filePath);
  let text = sf.getFullText();
  let changed = false;

  // 1) Fix/strip "use client"
  const had = hadClientDirective(text);
  text = stripExprDirective(text);
  // strip legit directive (we'll re-add if needed)
  text = text.replace(/^\s*['"]use client['"]\s*[\r\n]*/m, '');
  if (had) {
    if (isServerPath(filePath)) {
      // server-ish: keep it removed
      changed = true;
    } else {
      text = putDirectiveAtTop(text);
      changed = true;
    }
  }

  // Reload edited text into sf if we altered raw text
  if (changed) {
    sf.replaceWithText(text);
  }

  // 2) Imports: remove server-side or unused `useTranslations`
  sf.getImportDeclarations().forEach((imp) => {
    const mod = imp.getModuleSpecifierValue();
    if (mod === 'next-intl') {
      const named = imp.getNamedImports();
      const usesUT = named.some((n) => n.getName() === 'useTranslations');
      if (usesUT) {
        const id = sf.getDescendantsOfKind(SyntaxKind.Identifier).find(id => id.getText() === 'useTranslations');
        const usedElsewhere = id && id.getReferences().some(ref => !ref.getNode().getFirstAncestorByKind(SyntaxKind.ImportSpecifier));
        const shouldRemove = isServerPath(filePath) || !usedElsewhere;
        if (shouldRemove) {
          imp.removeNamedImport('useTranslations');
          changed = true;
        }
        // If the import ends empty, remove it entirely
        if (imp.getNamedImports().length === 0 && !imp.getDefaultImport() && imp.getNamespaceImport() == null) {
          imp.remove();
          changed = true;
        }
      }
    }
    // Remove any lingering next-intl import that became empty
  });

  // 3) Replace deprecated useT -> useTranslations
  sf.getImportDeclarations().forEach((imp) => {
    const mod = imp.getModuleSpecifierValue();
    if (mod.endsWith('/i18n/client')) {
      // if it imported useT, drop it
      if (imp.getNamedImports().some(n => n.getName() === 'useT')) {
        imp.removeNamedImport('useT');
        // ensure we have a next-intl import with useTranslations
        const existingNextIntl = sf.getImportDeclarations().find(d => d.getModuleSpecifierValue() === 'next-intl');
        if (existingNextIntl) {
          if (!existingNextIntl.getNamedImports().some(n => n.getName() === 'useTranslations')) {
            existingNextIntl.addNamedImport('useTranslations');
          }
        } else {
          sf.addImportDeclaration({ moduleSpecifier: 'next-intl', namedImports: ['useTranslations'] });
        }
        changed = true;
      }
      // if now empty, remove import
      if (imp.getNamedImports().length === 0 && !imp.getDefaultImport() && imp.getNamespaceImport() == null) {
        imp.remove();
        changed = true;
      }
    }
  });

  // Replace call expressions useT(…) -> useTranslations(…)
  sf.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((ce) => {
    const expr = ce.getExpression();
    if (Node.isIdentifier(expr) && expr.getText() === 'useT') {
      expr.replaceWithText('useTranslations');
      changed = true;
    }
  });

  if (changed) {
    changedCount++;
    await sf.save();
  }
}

console.log(`fix-codemod-fallout: updated ${changedCount} files`);
})();
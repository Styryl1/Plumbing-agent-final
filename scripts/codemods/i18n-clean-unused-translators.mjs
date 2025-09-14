/**
 * Codemod: i18n cleanup (unused translators)
 *
 * Actions per file:
 * 1) Remove any const <name> = useTranslations() whose <name> is never referenced.
 * 2) If multiple declarations of const t = useTranslations() exist, keep the first, remove the rest.
 * 3) If no useTranslations() call remains and useTranslations is imported from "next-intl", remove that import specifier.
 * 4) If a "next-intl" import becomes empty after removing the specifier, remove the whole import line.
 *
 * Safe: we only delete a translator if its identifier is never used.
 * Scope: all TypeScript and TSX files in src directory
 *
 * Usage: pnpm dlx jscodeshift -t scripts/codemods/i18n-clean-unused-translators.mjs src
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let dirty = false;

  // Helper: true if identifier name is referenced (excluding its declaration)
  function isIdentifierUsed(scopePath, name) {
    // Look for any Identifier with same name not as the declarator id
    let used = false;
    j(scopePath)
      .find(j.Identifier, { name })
      .forEach(p => {
        // ignore the VariableDeclarator id itself
        if (p.parent && p.parent.node.type === "VariableDeclarator" && p.parent.node.id === p.node) return;
        used = true;
      });
    return used;
  }

  // 1) Remove dead translator declarators; also collect duplicate 't' to dedupe later
  const translatorDecls = root.find(j.VariableDeclarator, {
    init: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "useTranslations" }
    }
  });

  // Group by scope to keep hook positioning correct
  translatorDecls.paths().forEach(path => {
    const name = path.node.id.type === "Identifier" ? path.node.id.name : null;
    if (!name) return;

    const scopePath = path.scope.path;
    const used = isIdentifierUsed(scopePath, name);
    if (!used) {
      // Remove this unused translator declarator
      const varDecl = path.parent;
      if (varDecl && varDecl.node && varDecl.node.declarations && varDecl.node.declarations.length === 1) {
        j(varDecl).remove();
      } else {
        j(path).remove();
      }
      dirty = true;
    }
  });

  // 2) Deduplicate multiple `const t = useTranslations()` in the same scope (keep the first)
  // Re-scan after removals
  const tDecls = root.find(j.VariableDeclarator, {
    id: { type: "Identifier", name: "t" },
    init: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "useTranslations" }
    }
  });

  // Group by function/component scope by walking up to nearest Function/Program
  const byScope = new Map();
  tDecls.paths().forEach(p => {
    let scopeOwner = p;
    while (scopeOwner && scopeOwner.parent && scopeOwner.node && ![
      "FunctionDeclaration","FunctionExpression","ArrowFunctionExpression","Program"
    ].includes(scopeOwner.node.type)) {
      scopeOwner = scopeOwner.parent;
    }
    const key = scopeOwner ? scopeOwner.node.start + ":" + scopeOwner.node.end : "program";
    if (!byScope.has(key)) byScope.set(key, []);
    byScope.get(key).push(p);
  });

  for (const group of byScope.values()) {
    if (group.length > 1) {
      // keep the first, remove the rest
      group.slice(1).forEach(p => {
        const varDecl = p.parent;
        if (varDecl && varDecl.node && varDecl.node.declarations && varDecl.node.declarations.length === 1) {
          j(varDecl).remove();
        } else {
          j(p).remove();
        }
        dirty = true;
      });
    }
  }

  // 3) Remove unused `useTranslations` import specifier if no calls remain
  const anyUseTranslationsCalls = root.find(j.CallExpression, {
    callee: { type: "Identifier", name: "useTranslations" }
  }).size() > 0;

  root.find(j.ImportDeclaration, { source: { value: "next-intl" } }).forEach(impPath => {
    const specs = impPath.node.specifiers || [];
    const hasUseTranslationsImport = specs.some(s => s.type === "ImportSpecifier" && s.imported.name === "useTranslations");
    if (!hasUseTranslationsImport) return;

    // If there are no useTranslations() calls left, drop the specifier
    if (!anyUseTranslationsCalls) {
      const filtered = specs.filter(s => !(s.type === "ImportSpecifier" && s.imported.name === "useTranslations"));
      if (filtered.length === 0) {
        j(impPath).remove();
      } else {
        impPath.node.specifiers = filtered;
      }
      dirty = true;
    }
  });

  return dirty ? root.toSource({ quote: "double" }) : null;
}
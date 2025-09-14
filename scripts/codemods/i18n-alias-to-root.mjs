/**
 * Codemod: Replace alias translators (tForm/useT("ns")) with a single root translator `t`.
 * - tForm("x.y") -> t("ns.x.y")
 * - Ensure exactly one `const t = useTranslations()` in the same scope.
 * - Clean up `useT` imports if unused.
 * Scope to src files with ts/tsx extensions
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let dirty = false;

  function ensureUseTranslationsImport() {
    const decls = root.find(j.ImportDeclaration, { source: { value: "next-intl" } });
    if (decls.size() === 0) {
      const first = root.find(j.ImportDeclaration).at(0);
      const imp = j.importDeclaration([j.importSpecifier(j.identifier("useTranslations"))], j.literal("next-intl"));
      if (first.size() > 0) first.insertBefore(imp); else root.get().node.program.body.unshift(imp);
      dirty = true; return;
    }
    decls.forEach(p => {
      const specs = p.node.specifiers || [];
      if (!specs.some(s => s.type === "ImportSpecifier" && s.imported.name === "useTranslations")) {
        specs.push(j.importSpecifier(j.identifier("useTranslations")));
        p.node.specifiers = specs; dirty = true;
      }
    });
  }

  function removeUseTImportIfUnused() {
    root.find(j.ImportDeclaration, { source: { value: "next-intl" } }).forEach(p => {
      const specs = p.node.specifiers || [];
      const hasUseT = specs.some(s => s.type === "ImportSpecifier" && s.imported.name === "useT");
      if (!hasUseT) return;
      const still = root.find(j.Identifier, { name: "useT" }).size() > 0;
      if (!still) {
        p.node.specifiers = specs.filter(s => !(s.type === "ImportSpecifier" && s.imported.name === "useT"));
        dirty = true;
      }
    });
  }

  function findExistingT(scopePath) {
    return j(scopePath).find(j.VariableDeclarator, {
      id: { type: "Identifier", name: "t" },
      init: { type: "CallExpression", callee: { type: "Identifier", name: "useTranslations" } }
    });
  }

  function dedupeT(scopePath) {
    const all = j(scopePath).find(j.VariableDeclarator, {
      id: { name: "t" }, init: { type: "CallExpression", callee: { name: "useTranslations" } }
    });
    if (all.size() > 1) {
      all.paths().slice(1).forEach(p => {
        const decl = p.parent;
        if (decl && decl.node.declarations?.length === 1) j(decl).remove(); else j(p).remove();
        dirty = true;
      });
    }
  }

  root.find(j.VariableDeclarator).forEach(p => {
    const id = p.node.id;
    const init = p.node.init;
    if (!id || id.type !== "Identifier" || !init || init.type !== "CallExpression") return;
    const alias = id.name;
    const callee = init.callee;
    if (!(callee.type === "Identifier" && (callee.name === "useT" || callee.name === "useTranslations"))) return;
    if (init.arguments.length !== 1) return;
    const arg0 = init.arguments[0];
    if (!arg0 || arg0.type !== "Literal" || typeof arg0.value !== "string") return;
    const ns = arg0.value;
    if (!/^t[A-Z]\w*$/.test(alias)) return;

    // Rewrite calls: tAlias("k") -> t("ns.k")
    root.find(j.CallExpression, { callee: { type: "Identifier", name: alias } }).forEach(cp => {
      const args = cp.node.arguments;
      if (!args?.length) return;
      const k0 = args[0];
      if (k0 && k0.type === "Literal" && typeof k0.value === "string") {
        k0.value = `${ns}.${k0.value}`;
        cp.node.callee = j.identifier("t");
        dirty = true;
      }
    });

    const scopePath = p.scope.path;
    const existingT = findExistingT(scopePath);
    if (existingT.size() > 0) {
      const parentDecl = p.parent;
      if (parentDecl?.node?.declarations?.length === 1) j(parentDecl).remove(); else j(p).remove();
      dirty = true;
    } else {
      id.name = "t";
      init.callee = j.identifier("useTranslations");
      init.arguments = [];
      dirty = true;
    }
    dedupeT(scopePath);
  });

  ensureUseTranslationsImport();
  removeUseTImportIfUnused();

  return dirty ? root.toSource({ quote: "double" }) : null;
}
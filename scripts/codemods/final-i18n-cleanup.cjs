/**
 * Final i18n cleanup codemod - fixes remaining conversion issues
 *
 * Handles:
 * 1. Legacy useT("namespace") calls -> useTranslations() with root pattern
 * 2. Ensures proper useTranslations import
 * 3. Removes unused useT imports
 * 4. Converts namespace calls to full root keys
 */
module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let dirty = false;

  // Log file path for debugging
  console.log('Processing file:', file.path);

  // Check for useT patterns
  const useTDeclarators = root.find(j.VariableDeclarator, {
    init: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "useT" }
    }
  });

  console.log('Found useT declarators:', useTDeclarators.size());

  // Check for useTranslations patterns with namespace
  const useTranslationsDeclarators = root.find(j.VariableDeclarator, {
    init: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "useTranslations" }
    }
  });

  console.log('Found useTranslations declarators:', useTranslationsDeclarators.size());

  function ensureUseTranslationsImport() {
    const decls = root.find(j.ImportDeclaration, { source: { value: "next-intl" } });

    if (decls.size() === 0) {
      // No next-intl import exists, create one
      const firstImport = root.find(j.ImportDeclaration).at(0);
      const newImport = j.importDeclaration(
        [j.importSpecifier(j.identifier("useTranslations"))],
        j.literal("next-intl")
      );

      if (firstImport.size() > 0) {
        firstImport.insertBefore(newImport);
      } else {
        root.get().node.program.body.unshift(newImport);
      }
      dirty = true;
      return;
    }

    // Check if useTranslations is already imported
    decls.forEach(path => {
      const specs = path.node.specifiers || [];
      const hasUseTranslations = specs.some(s =>
        s.type === "ImportSpecifier" && s.imported.name === "useTranslations"
      );

      if (!hasUseTranslations) {
        specs.push(j.importSpecifier(j.identifier("useTranslations")));
        path.node.specifiers = specs;
        dirty = true;
      }
    });
  }

  function removeUseTImport() {
    root.find(j.ImportDeclaration, { source: { value: "next-intl" } }).forEach(path => {
      const specs = path.node.specifiers || [];
      const filteredSpecs = specs.filter(s =>
        !(s.type === "ImportSpecifier" && s.imported.name === "useT")
      );

      if (filteredSpecs.length !== specs.length) {
        path.node.specifiers = filteredSpecs;
        dirty = true;
      }
    });
  }

  // Pattern 1: Fix useT("namespace") -> useTranslations() + convert calls
  root.find(j.VariableDeclarator, {
    init: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "useT" }
    }
  }).forEach(path => {
    const init = path.node.init;
    const varName = path.node.id.name;

    console.log('Processing useT declarator:', varName, 'with args:', init.arguments.length);
    if (init.arguments.length > 0) {
      console.log('First arg type:', init.arguments[0].type);
      if (init.arguments[0].type === "Literal") {
        console.log('First arg value:', init.arguments[0].value, typeof init.arguments[0].value);
      }
    }

    if (init.arguments.length === 1 &&
        init.arguments[0].type === "Literal" &&
        typeof init.arguments[0].value === "string") {

      const namespace = init.arguments[0].value;
      console.log('Found namespace:', namespace, 'for variable:', varName);

      // Find all calls to this variable and convert them
      root.find(j.CallExpression, {
        callee: { type: "Identifier", name: varName }
      }).forEach(callPath => {
        const args = callPath.node.arguments;
        if (args.length === 1 &&
            args[0].type === "Literal" &&
            typeof args[0].value === "string") {

          // Convert tNamespace("key") -> t("namespace.key")
          args[0].value = `${namespace}.${args[0].value}`;
          callPath.node.callee = j.identifier("t");
          dirty = true;
        }
      });

      // Convert the hook declaration
      path.node.id.name = "t";
      init.callee.name = "useTranslations";
      init.arguments = [];
      dirty = true;
    }
  });

  // Pattern 2: Fix existing useTranslations("namespace") -> useTranslations()
  root.find(j.VariableDeclarator, {
    init: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "useTranslations" }
    }
  }).forEach(path => {
    const init = path.node.init;
    const varName = path.node.id.name;

    if (init.arguments.length === 1 &&
        init.arguments[0].type === "Literal" &&
        typeof init.arguments[0].value === "string") {

      const namespace = init.arguments[0].value;

      // Find all calls and convert to full keys
      root.find(j.CallExpression, {
        callee: { type: "Identifier", name: varName }
      }).forEach(callPath => {
        const args = callPath.node.arguments;
        if (args.length === 1 &&
            args[0].type === "Literal" &&
            typeof args[0].value === "string") {

          // Convert tNamespace("key") -> t("namespace.key")
          args[0].value = `${namespace}.${args[0].value}`;
          callPath.node.callee = j.identifier("t");
          dirty = true;
        }
      });

      // Convert to root hook
      path.node.id.name = "t";
      init.arguments = [];
      dirty = true;
    }
  });

  // Pattern 3: Deduplicate multiple t declarations in same scope
  const tDecls = root.find(j.VariableDeclarator, {
    id: { type: "Identifier", name: "t" },
    init: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "useTranslations" }
    }
  });

  if (tDecls.size() > 1) {
    // Keep the first one, remove the rest
    tDecls.paths().slice(1).forEach(path => {
      const parentDecl = path.parent;
      if (parentDecl && parentDecl.node.declarations && parentDecl.node.declarations.length === 1) {
        j(parentDecl).remove();
      } else {
        j(path).remove();
      }
      dirty = true;
    });
  }

  if (dirty) {
    ensureUseTranslationsImport();
    removeUseTImport();
  }

  return dirty ? root.toSource({ quote: "double" }) : null;
};
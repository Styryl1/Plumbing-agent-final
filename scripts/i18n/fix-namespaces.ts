import { Project, SyntaxKind, Node, VariableDeclarationKind } from "ts-morph";
import { globby } from "globby";
import { pascalCase } from "change-case";
import fs from "node:fs";

type Config = {
  namespaceAliases: Record<string,string>;
  varName: string;
  maxBatchSize: number;
};
const cfg: Config = JSON.parse(fs.readFileSync("scripts/i18n/config.json","utf8"));

function canonical(nsRaw: string): string {
  // Prefer exact match first, then longest alias match
  if (cfg.namespaceAliases[nsRaw]) return cfg.namespaceAliases[nsRaw];

  const entries = Object.entries(cfg.namespaceAliases).sort((a,b)=> b[0].length - a[0].length);
  for (const [k, v] of entries) {
    if (nsRaw.startsWith(k + ".")) return v;
  }
  // Fallback to first segment
  return nsRaw.split(".")[0]!;
}

function varFor(ns: string): string {
  // t + PascalCase of segments: settings.whatsapp -> tSettingsWhatsapp, but keep common ones simple
  const simple: Record<string, string> = {
    "invoices": "tInv",
    "jobs": "tJobs",
    "auth": "tAuth",
    "system": "tSys",
    "actions": "tAct",
    "ui": "tUI",
    "misc": "tMisc",
    "providers": "tProv",
    "whatsapp": "tWa",
    "launch": "tLaunch",
    "customers": "tCust",
    "employees": "tEmp",
    "common": "tCommon"
  };

  return simple[ns] || cfg.varName + pascalCase(ns.replace(/\./g, " "));
}

const project = new Project({ skipAddingFilesFromTsConfig: true });

const scan: Array<{
  file: string;
  bareHooks: string[];
  existingHooks: Record<string,string>;
  crossCalls: Array<{ callee: string; key: string; ns: string; leaf: string }>;
  neededNamespaces: string[];
}> = JSON.parse(fs.readFileSync("scripts/i18n/scan-report.json","utf8"));

let processed = 0;
for (const item of scan) {
  if (processed >= cfg.maxBatchSize) break;

  if (item.crossCalls.length === 0) {
    console.log("Skip (no cross-calls):", item.file);
    processed++;
    continue;
  }

  const sf = project.addSourceFileAtPath(item.file);

  // Map of canonical ns -> hook var name (existing or to create)
  const hookMap = new Map<string,string>();
  for (const [ns, vname] of Object.entries(item.existingHooks)) {
    hookMap.set(canonical(ns), vname);
  }


  // Get existing variable names to avoid collisions
  const existingVars = new Set(
    sf.getVariableDeclarations().map(d => d.getName())
  );

  const ensureHook = (ns: string) => {
    if (hookMap.has(ns)) return hookMap.get(ns)!;

    let vname = varFor(ns);
    let i = 2;
    while (existingVars.has(vname)) {
      vname = `${varFor(ns)}${i++}`;
    }

    hookMap.set(ns, vname);
    existingVars.add(vname);
    return vname;
  };

  // Find React component function (exported function or arrow function in variable)
  const findComponentFunction = () => {
    // Look for exported function components
    const exportedFunctions = sf.getExportedDeclarations().get("default") || [];
    for (const decl of exportedFunctions) {
      if (Node.isFunctionDeclaration(decl)) {
        return decl;
      }
    }

    // Look for named exported functions
    const functions = sf.getFunctions().filter(f => f.isExported());
    if (functions.length > 0) return functions[0];

    // Look for arrow function components in variable declarations
    const variableComponents = sf.getVariableDeclarations().filter(d => {
      const init = d.getInitializer();
      return init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) &&
             d.isExported();
    });
    if (variableComponents.length > 0) {
      const init = variableComponents[0]!.getInitializer();
      if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
        return init;
      }
    }

    return null;
  };

  const insertHooksIntoComponent = (requiredNs: string[]) => {
    const component = findComponentFunction();
    if (!component) {
      console.log("⚠️ Could not find component function in:", item.file);
      return;
    }

    // Get the function body
    let body;
    if (Node.isFunctionDeclaration(component)) {
      body = component.getBody();
    } else if (Node.isArrowFunction(component) || Node.isFunctionExpression(component)) {
      body = component.getBody();
      if (!Node.isBlock(body)) {
        console.log("⚠️ Arrow function has expression body, skipping:", item.file);
        return;
      }
    }

    if (!body || !Node.isBlock(body)) {
      console.log("⚠️ Could not get function body:", item.file);
      return;
    }

    // Find insertion point: after existing hooks or at the start
    const statements = body.getStatements();
    let insertIndex = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (Node.isVariableStatement(stmt)) {
        const decls = stmt.getDeclarations();
        const hasHook = decls.some(d => {
          const init = d.getInitializer();
          return init && Node.isCallExpression(init) &&
                 ["useT", "useTranslations"].includes(init.getExpression().getText());
        });
        if (hasHook) {
          insertIndex = i + 1;
        } else {
          break; // Stop after non-hook statements
        }
      } else {
        break; // Stop at first non-variable statement
      }
    }

    // Insert hooks for required namespaces
    for (const ns of requiredNs) {
      const vname = hookMap.get(ns)!;
      body.insertVariableStatement(insertIndex++, {
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{
          name: vname,
          initializer: `useT("${ns}")`
        }]
      });
    }
  };

  // Determine required namespaces and ensure hooks exist
  const required = Array.from(new Set(item.crossCalls.map(c => canonical(c.ns))));
  for (const ns of required) {
    ensureHook(ns);
  }

  // Insert hooks into the component function
  if (required.length > 0) {
    insertHooksIntoComponent(required);
  }

  // Rewrite calls: t("ns.leaf") -> tNs("leaf")
  let changed = false;
  sf.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    const args = node.getArguments();
    if (args.length < 1 || !Node.isStringLiteral(args[0] as any)) return;

    const key = (args[0] as any).getLiteralValue() as string;
    if (!key.includes(".")) return; // leave leaf-only calls intact

    const nsRaw = key.split(".").slice(0, -1).join(".");
    const nsCanonical = canonical(nsRaw);
    const leaf = key.split(".").slice(1).join(".");
    const hookVar = hookMap.get(nsCanonical);

    if (!hookVar) {
      console.log("⚠️ No hook found for namespace:", nsCanonical, "in", item.file);
      return;
    }

    // Replace callee + first arg
    node.getExpression().replaceWithText(hookVar);
    (args[0] as any).replaceWithText(`"${leaf}"`);
    changed = true;
  });

  // Remove bare hook variables if they're unused after rewrite
  for (const v of item.bareHooks) {
    const decls = sf.getVariableDeclarations().filter(d => d.getName() === v);
    for (const d of decls) {
      const refs = d.findReferencesAsNodes();
      // Only declaration itself = unused
      if (refs.length <= 1) {
        const stmt = d.getVariableStatement();
        if (stmt) {
          stmt.remove();
          changed = true;
        }
      }
    }
  }

  if (changed) {
    sf.saveSync();
    processed++;
    console.log("✅ Rewritten:", item.file);
  } else {
    console.log("⚪ No change:", item.file);
    processed++;
  }
}

console.log("Batch processed:", processed, "files");
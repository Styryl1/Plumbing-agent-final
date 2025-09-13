import { Project, SyntaxKind, Node } from "ts-morph";
import { globby } from "globby";
import fs from "node:fs";

async function main() {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const files = await globby(["src/**/*.{ts,tsx}", "!src/types/**", "!**/*.d.ts", "!src/i18n/**"]);

  type Report = {
    file: string;
    bareHooks: string[];                 // identifiers of bare useT/useTranslations
    existingHooks: Record<string,string>; // ns -> var name
    neededNamespaces: Set<string>;        // namespaces inferred from t("ns.leaf")
    crossCalls: Array<{ callee: string; key: string; ns: string; leaf: string }>;
  };

  const report: Report[] = [];

  function firstSegment(key: string) {
    return key.split(".")[0]!;
  }

  function nsPrefix(key: string): string {
    // Heuristic: try longest of known prefixes later in fixer using config
    const parts = key.split(".");
    return parts.length > 1 ? parts.slice(0, parts.length - 1).join(".") : parts[0]!;
  }

  for (const file of files) {
    project.addSourceFileAtPath(file);
  }

  for (const sf of project.getSourceFiles()) {
    const item: Report = {
      file: sf.getFilePath(),
      bareHooks: [],
      existingHooks: {},
      neededNamespaces: new Set(),
      crossCalls: []
    };

    // Find useT/useTranslations hook declarations
    sf.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression().getText();
        if (expr === "useT" || expr === "useTranslations") {
          const arg0 = node.getArguments()[0];
          const ns = arg0 && Node.isStringLiteral(arg0 as any) ? (arg0 as any).getLiteralValue() : null;
          const parent = node.getParent();
          if (ns) {
            // const tX = useTranslations("ns")
            if (Node.isVariableDeclaration(parent)) {
              const varName = parent.getName();
              item.existingHooks[ns] = varName;
            }
          } else {
            // bare hook without namespace
            if (Node.isVariableDeclaration(parent)) {
              const varName = parent.getName();
              item.bareHooks.push(varName);
            }
          }
        }
      }
    });

    // Find t("ns.leaf") calls
    sf.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const args = node.getArguments();
        if (args.length >= 1 && Node.isStringLiteral(args[0] as any)) {
          const key = (args[0] as any).getLiteralValue() as string;
          if (key.includes(".")) {
            const callee = node.getExpression().getText();
            const ns = nsPrefix(key);
            const leaf: string = key.split(".").slice(1).join(".");
            item.neededNamespaces.add(ns);
            item.crossCalls.push({ callee, key, ns, leaf });
          }
        }
      }
    });

    if (item.bareHooks.length || item.crossCalls.length) {
      // Convert Set to Array for JSON serialization
      const reportItem = {
        ...item,
        neededNamespaces: Array.from(item.neededNamespaces)
      };
      report.push(reportItem as any);
    }
  }

  fs.writeFileSync("scripts/i18n/scan-report.json", JSON.stringify(report, null, 2));
  console.log("Scan complete:", report.length, "files with issues");
  console.log("Total cross-calls:", report.reduce((sum, r) => sum + r.crossCalls.length, 0));
}

main().catch(console.error);
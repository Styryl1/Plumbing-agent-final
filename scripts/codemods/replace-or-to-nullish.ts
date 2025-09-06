import { Project, SyntaxKind, Node, ts } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: false,
});

const isAssignmentOrInit = (node: Node) => {
  const parent = node.getParent();
  if (!parent) return false;
  const kind = parent.getKind();
  return (
    kind === SyntaxKind.VariableDeclaration ||
    kind === SyntaxKind.BinaryExpression // assignment
  );
};

/**
 * Decide if it's safe to replace `a || b` with `a ?? b`
 * by checking the static type of `a`.
 *
 * SAFE when:
 *  - leftType is union including null or undefined
 *  - AND leftType DOES NOT include 'boolean' (to avoid boolean logic)
 *  - AND we are in assignment/init context (defaulting), not in conditions
 */
const safeToReplace = (left: Node): boolean => {
  const type = left.getType();
  const flags = type.getFlags();
  const isNullable = type.isNullable() || type.isUndefined() || type.isNull();
  const isBooleanish =
    type.isBoolean() || (flags & ts.TypeFlags.BooleanLike) !== 0;

  return isNullable && !isBooleanish;
};

const files = project.getSourceFiles([
  'src/**/*.ts',
  'src/**/*.tsx',
  '!**/*.d.ts',
]);

let changed = 0;

for (const sf of files) {
  const logicals = sf.forEachDescendantAsArray().filter(n =>
    n.getKind() === SyntaxKind.BinaryExpression &&
    (n.asKind(SyntaxKind.BinaryExpression)?.getOperatorToken()?.getText() === '||')
  );

  for (const be of logicals) {
    const bin = be.asKindOrThrow(SyntaxKind.BinaryExpression);

    // Only transform when used as defaulting (assignment/init)
    if (!isAssignmentOrInit(bin)) continue;

    const left = bin.getLeft();
    if (!safeToReplace(left)) continue;

    // Replace operator and, where appropriate, use ??=
    const parent = bin.getParent();

    // variable init: const x = a || b  --> const x = a ?? b
    if (parent?.getKind() === SyntaxKind.VariableDeclaration) {
      const text = `${left.getText()} ?? ${bin.getRight().getText()}`;
      bin.replaceWithText(text);
      changed++;
      continue;
    }

    // assignment: x = a || b  --> x ??= b  (only if left side is same as assignee)
    if (parent?.getKind() === SyntaxKind.BinaryExpression) {
      const assignee = parent.asKindOrThrow(SyntaxKind.BinaryExpression).getLeft().getText();
      const leftText = left.getText();
      if (assignee === leftText) {
        parent.replaceWithText(`${assignee} ??= ${bin.getRight().getText()}`);
        changed++;
      } else {
        // fallback: x = a ?? b
        parent.replaceWithText(`${assignee} = ${leftText} ?? ${bin.getRight().getText()}`);
        changed++;
      }
    }
  }

  if (sf.isSaved()) continue;
  sf.saveSync();
}

console.log(`Nullish codemod complete. Changes: ${changed}`);
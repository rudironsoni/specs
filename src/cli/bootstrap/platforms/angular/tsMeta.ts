import ts from 'typescript';

export const ANGULAR_EXTRACTOR = 'specs-angular-ts';
export const ANGULAR_EXTRACTOR_VERSION = '1';

export function objectLiteralToRecord(node: ts.ObjectLiteralExpression): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
    record[prop.name.text] = literalValue(prop.initializer);
  }
  return record;
}

export function literalValue(node: ts.Expression): unknown {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements
      .filter((el): el is ts.Expression => ts.isExpression(el))
      .map((el) => literalValue(el));
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isObjectLiteralExpression(node)) return objectLiteralToRecord(node);
  return undefined;
}

export function decoratorCall(node: ts.Node, name: string): ts.CallExpression | undefined {
  if (!ts.canHaveDecorators(node)) return undefined;
  const decorators = ts.getDecorators(node);
  if (!decorators) return undefined;
  for (const decorator of decorators) {
    if (ts.isCallExpression(decorator.expression) && ts.isIdentifier(decorator.expression.expression)) {
      if (decorator.expression.expression.text === name) return decorator.expression;
    }
  }
  return undefined;
}

export function callRootName(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return callRootName(expr.expression);
  return undefined;
}

export function unionLiterals(node: ts.TypeNode | undefined): string[] | undefined {
  if (!node) return undefined;
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return [node.literal.text];
  if (ts.isUnionTypeNode(node)) {
    const values = node.types.flatMap((t) => unionLiterals(t) ?? []);
    return values.length > 0 ? values : undefined;
  }
  return undefined;
}

export function propertyName(node: ts.PropertyDeclaration): string | undefined {
  if (ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isStringLiteral(node.name)) return node.name.text;
  return undefined;
}

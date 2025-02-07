import { Project, SyntaxKind, CallExpression } from "ts-morph";

// Create a project using your tsconfig.json
const project = new Project({ tsConfigFilePath: "./tsconfig.json" });

// Determines whether a call returns a Promise<AxiosResponse<…>>
function returnsAxiosResponsePromise(callExpr: CallExpression): boolean {
  // Get the call's return type.
  const returnType = callExpr.getReturnType();
  // Make sure the outer type is a Promise.
  const symbol = returnType.getSymbol();
  if (!symbol || symbol.getName() !== "Promise") {
    return false;
  }

  // Get the type argument from Promise<...>
  const typeArguments = returnType.getTypeArguments();
  if (typeArguments.length !== 1) return false;
  const innerType = typeArguments[0];

  // Here we simply check if the inner type's text includes "AxiosResponse".
  // (A more robust solution would retrieve the AxiosResponse symbol from the project and use isAssignableTo.)
  return innerType.getText().includes("AxiosResponse");
}

// Process each source file.
project.getSourceFiles().forEach(sourceFile => {
  // Find all call expressions.
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  callExpressions.forEach(callExpr => {
    // If the call returns a Promise<AxiosResponse>, we want to wrap it.
    if (returnsAxiosResponsePromise(callExpr)) {
      // Avoid double-wrapping if it's already wrapped.
      // For example, if the call expression is already something like withLogging(…)
      if (callExpr.getParentIfKind(SyntaxKind.CallExpression)?.getExpression().getText().includes("withLogging")) {
        return;
      }

      // Get the original call's text.
      const originalCallText = callExpr.getText();
      // Create the new wrapped call text.
      // This turns, e.g., axios.get(...args) into withLogging(axios.get(...args))
      const newCallText = `withLogging(${originalCallText})`;

      // Replace the call expression with the wrapped version.
      callExpr.replaceWithText(newCallText);
    }
  });

  // Optionally add an import for withLogging if one doesn't exist.
  const alreadyImports = sourceFile.getImportDeclarations().some(importDec =>
    importDec.getNamedImports().some(named => named.getName() === "withLogging")
  );
  if (!alreadyImports) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: "./withLogging", // adjust the path as needed
      namedImports: ["withLogging"]
    });
  }

  // Save the modified source file.
  sourceFile.saveSync();
});

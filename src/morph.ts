import { CallExpression, Project, ts } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "./tsconfig.json",
});

const file = project.getSourceFileOrThrow("src/morphMe.ts");

file.getDescendantsOfKind(ts.SyntaxKind.CallExpression).forEach((cexp) => {
  console.log("\n***")
  const symbol = cexp.getReturnType().getSymbol()
  if (!symbol || symbol.getName() !== "Promise") {
    return false;
  }
  console.log("Found a Promise-returning call expression:")
  console.log(cexp.getText())
  const typeArgs = cexp.getTypeArguments()
  console.log("Type arguments:")
  console.log(typeArgs.map((arg) => arg.getText()))

})

//

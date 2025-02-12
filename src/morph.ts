import { CallExpression, Project, ts } from "ts-morph";

const project = new Project({
  // tsConfigFilePath: "./tsconfig.json",
  tsConfigFilePath: "/Users/jhanetheknotww.com/ive/tsconfig.json",
});

// const file = project.getSourceFileOrThrow("src/morphMe.ts");
const file = project.getSourceFileOrThrow("/Users/jhanetheknotww.com/ive/src/services/vendor-summaries-api/storefrontHealth.ts");

// file.getDescendantsOfKind(ts.SyntaxKind.CallExpression).forEach((cexp) => {
//   console.log("\n***")
//   const returnTypeSymbol = cexp.getReturnType().getSymbol()
//   if (!returnTypeSymbol || returnTypeSymbol.getName() !== "Promise") {
//     return false;
//   }
//   console.log("Found a Promise-returning call expression:")
//   console.log(cexp.getText())
//   const typeArgs = cexp.getTypeArguments()
//   console.log("Type arguments:")
//   console.log(typeArgs.map((arg) => arg.getText()))

// })

// file
//   .getDescendantsOfKind(ts.SyntaxKind.Identifier)
//   .filter((cexp) => cexp.getType().getText() === "Response")
//   .forEach((cexp) => {
//     console.log("\n**")
//     console.log("found one")
//     console.log(`${cexp.getStartLineNumber()} -- ${cexp.getType().getText()}`)
//     const descendants = cexp.getDescendantsOfKind(ts.SyntaxKind.Identifier);
//     for (const d of descendants) {
//       const text = d.getText()
//       console.log(text)
//     }
//   });

//

// file
//   .getDescendantsOfKind(ts.SyntaxKind.CallExpression) // Find all function calls
//   .forEach((callExpr) => {
//     const expr = callExpr.getExpression();
//     if (expr.getKind() === ts.SyntaxKind.PropertyAccessExpression) {
//       // a propertyAccessExpress looks like console.log, response.json, axiosClient.get
//       const propertyAccess = expr.asKindOrThrow(ts.SyntaxKind.PropertyAccessExpression);
//       // idk but getExpression() returns the left side of the propertyAccessExpression
//       // like "axios" in "axios.get"
//       const objectExpr = propertyAccess.getExpression();

//       if (
//         objectExpr.getKind() === ts.SyntaxKind.Identifier &&
//         objectExpr.getText() === "response" && // Replace with your specific identifier's name
//         objectExpr.getType().getText() === "Response" // Ensure it's a Response type
//       ) {
//         console.log(`Found Response.${propertyAccess.getName()} at line ${callExpr.getStartLineNumber()}`);
//       }
//     }
//   });


// NEXT UP is to see what fullyQualifiedName if I define one myself, to make sure I can 
// hardcode in names for axios functions and fetch and stuff. Like maybe I could JUST look 
// for callExpressions where the propertyAccess expression has a matching fully qualified name.
// That'd be fucking sick

const fileName = file.getFilePath();

file.getDescendantsOfKind(ts.SyntaxKind.CallExpression).forEach((callExpr) => {
  const expr = callExpr.getExpression();

  if (expr.getKind() === ts.SyntaxKind.PropertyAccessExpression) {
    const propertyAccess = expr.asKindOrThrow(ts.SyntaxKind.PropertyAccessExpression);
    const objectExpr = propertyAccess.getExpression(); // This is the left-hand side, e.g., `response`

    if (
      objectExpr.getType().getText() === "Response" && // Check if the left-hand side has type `Response`
      propertyAccess.getName() === "json" // Ensure it's calling `json()`
    ) {
      const identifierText = objectExpr.getText(); // Preserve the original identifier name (e.g., `res`)

      console.log("found an identifier ");
      console.log(identifierText);
      console.log(objectExpr.getType().getSymbol()?.getFullyQualifiedName())
      // Replace `response.json()` with the `mySchemer` pattern, using the preserved identifier name
      callExpr.replaceWithText(`
          mySchemer({
            fn: ${identifierText}.json.bind(${identifierText}),
            tag: "${fileName}_${callExpr.getStartLineNumber()}"
          })()
        `);
    }
  }
});

project.saveSync();

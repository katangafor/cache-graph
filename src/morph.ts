import {
  CallExpression,
  Project,
  ts,
  SourceFile,
  PropertyAccessExpression,
} from "ts-morph";
import * as path from "path"

const project = new Project({
  // tsConfigFilePath: "./tsconfig.json",
  tsConfigFilePath: "/Users/jhanetheknotww.com/ive/tsconfig.json",
});

type instance = {
  line: number;
  filePath: string;
  text: string;
  expText: string;
};

const schemifyFileFetch = (file: SourceFile) => {
  const instances: instance[] = [];
  console.log("getting descendants");
  file.getDescendantsOfKind(ts.SyntaxKind.CallExpression).forEach((callExpr) => {
    // if callExpr response.json(), then the expression is response.json
    const expr = callExpr.getExpression(); // response.json

    if (expr.getKind() === ts.SyntaxKind.PropertyAccessExpression) {
      const propertyAccess = expr.asKindOrThrow(ts.SyntaxKind.PropertyAccessExpression);
      const objectExpr = propertyAccess.getExpression(); // walks backward to "response"

      if (
        objectExpr.getType().getText() === "Response" && // in any something.apples() call, make sure that something is of type "Response"
        propertyAccess.getName() === "json" // in any something.apples() call, make sure that apples is "json"
      ) {
        const identifierText = objectExpr.getText(); // Preserve the original identifier name (e.g., `res`)

        console.log(
          "found an identifier of type ",
          objectExpr.getType().getSymbol()?.getFullyQualifiedName(),
        );
        instances.push({
          line: expr.getStartLineNumber(),
          filePath: file.getFilePath(),
          text: expr.getText(),
          expText: expr.getText()
        });
        const filePath = file.getFilePath()
        // Replace `response.json()` with the `mySchemer` pattern, using the preserved identifier name
        callExpr.replaceWithText(`
            mySchemer({
              fn: ${identifierText}.json.bind(${identifierText}),
              tag: "${filePath}_${callExpr.getStartLineNumber()}"
            })()
          `);
      }
    }
  });
  return instances;
};

// export const getCompletion = createAsyncThunk('storefrontCompletion/gp/getCompletion', async () => {
// return (await gpAxios.vendorApi.get('/storefront/getCompletion')).data;
// });

// want to find:
// a call expression where the getExpression.getExpression is of type AxiosInstance

const getRelativeImportPath = (sourceFile: SourceFile, targetPath: string) => {
  const sourceDir = path.dirname(sourceFile.getFilePath());
  let relativePath = path.relative(sourceDir, targetPath);

  // Ensure it starts with './' or '../'
  if (!relativePath.startsWith(".")) {
    relativePath = "./" + relativePath;
  }

  // Remove file extension for TypeScript import (if it's a .ts file)
  relativePath = relativePath.replace(/\.ts$/, "");

  return relativePath;
};

const ensureSchemerImport = (file: SourceFile, schemerPath: string) => {
  const importDeclarations = file.getImportDeclarations();
  const isAlreadyImported = importDeclarations.some((imp) =>
    imp.getModuleSpecifierValue().includes("mySchemer")
  );

  if (!isAlreadyImported) {
    const relativePath = getRelativeImportPath(file, schemerPath);
    file.addImportDeclaration({
      namedImports: ["mySchemer"],
      moduleSpecifier: relativePath,
    });
  }
};


type callInstance = {
  line: number;
  filePath: string;
  text: string;
  expText: string;
  // I am so confused lol
  callExpression: CallExpression<ts.CallExpression>,
  argsText: string;
}

const getAxiosCalls = (file: SourceFile) => {
  const instances: callInstance[] = [];
  file.getDescendantsOfKind(ts.SyntaxKind.CallExpression).forEach((cexp) => {
    // expr at this point is all call expressions, so anything that ends with a function call.
    // Could be apples, console.log(), gpAxios.vendorApi.get(), getPeople().bestFriend(), etc
    const expr = cexp.getExpression();
    // should narrow it down to functions called from a property, like console.log() or axios.get().
    // At this point the expr is only the expression, not the call. So like console.log
    if (expr.getKind() === ts.SyntaxKind.PropertyAccessExpression) {
      // this extra check/assignment is only necessary for satisfying TS
      const propertyAccessExpr = expr.asKindOrThrow(
        ts.SyntaxKind.PropertyAccessExpression,
      );
      // this is the object whose property is being accessed and called. console or axios
      const objectExpr = propertyAccessExpr.getExpression();
      if (
        objectExpr.getType().getSymbol()?.getName() === "AxiosInstance" &&
        (propertyAccessExpr.getName() === "get" ||
          propertyAccessExpr.getName() === "post" ||
          propertyAccessExpr.getName() === "delete" ||
          propertyAccessExpr.getName() === "patch" ||
          propertyAccessExpr.getName() === "put")
      ) {
        // console.log("---")
        // console.log(cexp.getText())
        // console.log(objectExpr.getType().getSymbol()?.getName())
        instances.push({
          filePath: file.getFilePath(),
          line: cexp.getStartLineNumber(),
          text: cexp.getText(),
          expText: cexp.getExpression().getText(),
          callExpression: cexp,
          argsText: cexp.getArguments().map((a) => a.getText()).join(", ")
        });
      }
    }
  });
  return instances;
};

const schemerFilePath = "/Users/jhanetheknotww.com/ive/src/schemerify.ts";

const wrapAxiosCall = ({ callExpression, argsText, expText, filePath, line}: callInstance) => {

  const file = callExpression.getSourceFile();
  ensureSchemerImport(file, schemerFilePath);
  callExpression.replaceWithText(`
    mySchemer({
      fn: ${expText},
      tag: "${filePath.split("/").pop()}:${expText}:${line}"
    })(${argsText})
    `)
}

// const file = project.getSourceFileOrThrow("src/morphMe.ts");
const healthFile = project.getSourceFileOrThrow(
  "/Users/jhanetheknotww.com/ive/src/services/vendor-summaries-api/storefrontHealth.ts",
);

const gpAxiosFile = project.getSourceFileOrThrow(
  "/Users/jhanetheknotww.com/ive/src/services/api/gp/storefront/completion.ts",
);

console.time();
const allFiles = project.getSourceFiles();
let instances: callInstance[] = [];
for (const file of [gpAxiosFile]) {
  instances = [...instances, ...getAxiosCalls(file)];
}
const myInstance = instances[0]
console.log(myInstance);
// console.log(instances.length + " instances");

wrapAxiosCall(myInstance)


project.saveSync();
console.timeEnd();

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

// LMAO there are literally two uses of fetch in IVE, and one of them is the one I just
// fucking added.
// So... axios it is!

// ok so axios LOOKS like it could potentially work, but no idea.
// new tricky part: axios returns AxiosResponse, which has a data property.
// I could
// - include data in every single zod schema (dumb)
// - have... extra shit?? in my withSchema that skips data if you tell it to?
// - just hardcode it for axios (fine for now, but makes it harder to move to fetch)

// might have handle it. Can just say "if data instanceOf AxiosResponse"

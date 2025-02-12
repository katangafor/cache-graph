import {
  CallExpression,
  Project,
  ts,
  SourceFile,
  PropertyAccessExpression,
} from "ts-morph";

const project = new Project({
  tsConfigFilePath: "/Users/jhanetheknotww.com/ive/tsconfig.json",
});

const getSchemerCalls = () => {
  const calls: CallExpression[] = [];
  project.getSourceFiles().forEach((sourceFile) => {
    const callExpressions = sourceFile.getDescendantsOfKind(ts.SyntaxKind.CallExpression);

    callExpressions.forEach((callExpr) => {
      const expression = callExpr.getExpression();

      if (expression.getText() === "schemer" && callExpr.getArguments().length === 2) {
        calls.push(callExpr);
      }
    });
  });
  return calls;
};

const ensureZodImport = (file: SourceFile, schemerPath: string) => {
  const importDeclarations = file.getImportDeclarations();

  const isAlreadyImported = importDeclarations.some((imp) => {
    const namedImports = imp.getNamedImports();
    return namedImports.some(
      (namedImport) =>
        namedImport.getName() === "z" && imp.getModuleSpecifier().getText() === '"zod"',
    );
  });

  if (!isAlreadyImported) {
    file.addImportDeclaration({
      namedImports: ["z"],
      moduleSpecifier: "zod",
    });
  }
};

// given a tag, hit a request like this curl
// curl --location 'http://localhost:3009/generate-schema' \
// --header 'Content-Type: application/json' \
// --data '{
//     "tag": "getCompletion"
// }'
const getSchema = async (tag: string) => {
  const response = await fetch("http://localhost:3009/generate-schema", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tag,
    }),
  });
  if (!response.ok) {
    return null;
  }

  const schemaString = await response.text();
  return schemaString;
};

const main = async () => {
  const calls = getSchemerCalls();
  console.log(calls.length + " calls found");
  for (const cexp of calls) {
    // slice off the quotes
    const tag = cexp.getArguments()[1].getText().slice(1, -1);
    const schema = await getSchema(tag);
    if (schema === null) {
      continue;
    }

    const sourceFile = cexp.getSourceFile();
    ensureZodImport(sourceFile, "zod");
    const schemaVarName = "schema_line_" + cexp.getStartLineNumber();
    sourceFile.addVariableStatement({
      declarations: [
        {
          name: schemaVarName,
          initializer: schema,
        },
      ],
    });

    // add new const to file: the zod schema

    // add a third argument to the call
    const currentArgs = cexp.getArguments().map((arg) => arg.getText());
    const newArgs = [...currentArgs, schemaVarName];
    const parentExpr = cexp.getExpression().getText();
    // print the file and line number
    console.log(`${cexp.getSourceFile().getFilePath()}:${cexp.getStartLineNumber()}`);

    cexp.replaceWithText(`${parentExpr}(${newArgs.join(", ")})`);
  }

  project.saveSync();
};

main();

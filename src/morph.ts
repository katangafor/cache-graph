import { Project } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "./tsconfig.json",
});

const file = project.getSourceFileOrThrow("src/morphMe.ts");

const fn = file.getVariableDeclarationOrThrow("formatUser");

import { Project, ts } from "ts-morph";
import axios from "axios";

// make a lil axios client to test hittin httpbin 
const axiosClient = axios.create({
  baseURL: "https://httpbin.org",
});


const project = new Project({
  tsConfigFilePath: "./tsconfig.json",
});

const file = project.getSourceFileOrThrow("src/morphMe.ts");

console.log("gonna do it")

file.getDescendantsOfKind(ts.SyntaxKind.Identifier).forEach((id) => {
  if (id.getType().getText() === "user") {
    console.log(`${id.getText()} on line ${id.getStartLineNumber()}`);
  }
})

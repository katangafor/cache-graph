import axios from "axios";
import { genSchemer } from "./schemer";
import { z } from "zod"

const mySchemer = genSchemer({
  handleData: async ({ data, tag }) => {
    console.log("handleData()");
    console.log({
      [tag]: data,
    });
  },
  handleError: async () => {
    console.log("error validation");
  },
});

const personSchema = z.object({
  firstName: z.string(),
  lastname: z.string(),
})

const fetchNonsense = async () => {
  const response = await fetch("http://localhost:3005");
  const json = await 
            mySchemer({
              fn: response.json.bind(response),
              tag: "/Users/jhanetheknotww.com/cache-graph/src/morphMe.ts_24"
            })()
          ;
  return json;
};

fetchNonsense()
  .then((data) => {
    console.log("done:");
    console.log(data);
  })
  .catch((e) => {
    console.log(e);
  });

// const axiosClient = axios.create({
//   baseURL: "https://httpbin.org",
// });
// ok now make the call
// const gimmeThat = () => axiosClient.get("/get")

// const doSomething = async () => {
//   const response = gimmeThat();
//   return response;
// }

// type pls = ReturnType<typeof gimmeThat>;

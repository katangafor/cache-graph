import axios from "axios";

type user = {
  name: string;
  age: number;
};

const formatUser = (args: user) => {
  return `${args.name} is ${args.age} years old...`;
};

const johnny: user = {
  name: "Johnny",
  age: 21,
}

console.log(formatUser(johnny));

// make a lil axios client to test hittin httpbin 
const axiosClient = axios.create({
  baseURL: "https://httpbin.org",
});

// ok now make the call
const gimmeThat = () => axiosClient.get("/get")

const doSomething = async () => {
  const response = gimmeThat();
  return response;
}

type pls = ReturnType<typeof gimmeThat>;

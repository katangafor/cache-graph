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

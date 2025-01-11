// ok so we need
// 1. a graph structure that can represent cache dependencies
// 2. a way to register functions on that graph structure
// 3. a way to record cached data in redis prefixes in a way that can be understood by the graph

// first let's see if we can make graphs work
import { redisClient } from "./redis-client";
import { genCachify, makeCacheAware, cacheableFnArg } from "./graph";

// need to make sure I can cache stuff, then I can cache stuff with my HOF

const randInt = () => {
  return Math.floor(Math.random() * 100);
};

const main = async () => {
  await redisClient.connect();
  await redisClient.clear();

  const exampleCacheables = {
    getName: {
      fn: (name: string, lastName: string) => name,
      genSetKey: (name: string, lastName: string) => `name:${name}:${lastName}`,
    },
    getDoubleAge: {
      fn: (age: number, multiplier: number) => age * 2,
      genSetKey: (age: number, multiplier: number) => `age:${age}:${multiplier}`,
    },
  };

  const { gussiedUp } = makeCacheAware(
    {
      invalidatorFns: exampleCacheables,
      // this only works with the annotation :(
      getInvalidatorArgs: (id: number): cacheableFnArg<typeof exampleCacheables> => {
        return { getDoubleAge: [5, 3], getName: ["jaw", "knee"] };
      },
      fn: (id) => {
        return randInt();
      },
      genKey: (id) => `gussiedUpKey:${id.toString()}`,
    },
    redisClient,
  );

  await gussiedUp(8);
  await gussiedUp(8);
  await gussiedUp(8);
  await gussiedUp(10);
  await gussiedUp(10);
  await gussiedUp(10);
};

main();

// this is the old main with some cachify examples
// generate a random name and age
// const randoPerson = ({
//   givenName,
// }: {
//   givenName: string;
// }): Promise<{ name: string; age: number }> => {
//   return new Promise((resolve) => {
//     const delay = Math.floor(Math.random() * 500);
//     setTimeout(() => {
//       const age = Math.floor(Math.random() * 100);
//       resolve({ name: givenName, age });
//     }, delay);
//   });
// };

// const cachify = genCachify({
//   get: redisClient.get,
//   set: redisClient.set,
// });

// const main = async () => {
//   await redisClient.connect();
//   await redisClient.clear();

//   const cachedRandoPerson = cachify({
//     fetchFn: randoPerson,
//     genKey: ({ givenName }) => `randoPerson:${givenName}`,
//   });

//   const person1 = await cachedRandoPerson({ givenName: "seanathan" });
//   console.log(person1);
//   const person2 = await cachedRandoPerson({ givenName: "buxaplenty" });
//   console.log(person2);
//   const person3 = await cachedRandoPerson({ givenName: "johann" });
//   console.log(person3);
// };

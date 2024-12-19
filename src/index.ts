// ok so we need
// 1. a graph structure that can represent cache dependencies
// 2. a way to register functions on that graph structure
// 3. a way to record cached data in redis prefixes in a way that can be understood by the graph

// first let's see if we can make graphs work
import { redisClient } from "./redis-client";
import { genCachify } from "./graph";

// need to make sure I can cache stuff, then I can cache stuff with my HOF

// generate a random name and age
const randoPerson = ({
  givenName,
}: {
  givenName: string;
}): Promise<{ name: string; age: number }> => {
  return new Promise((resolve) => {
    const delay = Math.floor(Math.random() * 500);
    setTimeout(() => {
      const age = Math.floor(Math.random() * 100);
      resolve({ name: givenName, age });
    }, delay);
  });
};

const cachify = genCachify({
  get: redisClient.get,
  set: redisClient.set,
});

const main = async () => {
  await redisClient.connect();
  await redisClient.clear();

  const cachedRandoPerson = cachify({
    fetchFn: randoPerson,
    genKey: ({ givenName }) => `randoPerson:${givenName}`,
  });

  const person1 = await cachedRandoPerson({ givenName: "seanathan" });
  console.log(person1);
  const person2 = await cachedRandoPerson({ givenName: "buxaplenty" });
  console.log(person2);
  const person3 = await cachedRandoPerson({ givenName: "johann" });
  console.log(person3);
};

main();

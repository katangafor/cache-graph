// ok so we need
// 1. a graph structure that can represent cache dependencies
// 2. a way to register functions on that graph structure
// 3. a way to record cached data in redis prefixes in a way that can be understood by the graph

// first let's see if we can make graphs work
import { redisClient } from "./redis-client";
import { cachify } from "./graph";

// need to make sure I can cache stuff, then I can cache stuff with my HOC

// generate a random name and age
const randoPerson = ({
  givenName,
}: {
  givenName: number;
}): Promise<{ name: string; age: number }> => {
  return new Promise((resolve) => {
    const delay = Math.floor(Math.random() * 500);
    setTimeout(() => {
      const name = `Person ${givenName}`;
      const age = Math.floor(Math.random() * 100);
      resolve({ name, age });
    }, delay);
  });
};

const main = async () => {
  await redisClient.connect();
  await redisClient.clear();

  const key = "apples";
  await redisClient.set({
    key,
    value: "are banernos",
  });

  const val = await redisClient.get(key);
  console.log(val);

  // now cachify randoPerson
  const cachedRandoPerson = cachify({
    fetchFn: randoPerson,
    genKey: ({ givenName }) => `randoPerson:${givenName}`,
    get: redisClient.get,
    set: redisClient.set,
    tag: "randoPerson",
  });

  const person1 = await cachedRandoPerson({ givenName: 1 });
  console.log(person1);
  const person2 = await cachedRandoPerson({ givenName: 2 });
  console.log(person2);
  const person3 = await cachedRandoPerson({ givenName: 1 });
  console.log(person3);
};

main();

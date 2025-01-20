// ok so we need
// 1. a graph structure that can represent cache dependencies
// 2. a way to register functions on that graph structure
// 3. a way to record cached data in redis prefixes in a way that can be understood by the graph

// first let's see if we can make graphs work
import { redisClient } from "./redis-client";
import { genCachify, makeCacheAware, invalidatorFnArgs } from "./graph";
import { getStringifiedUser, updateBio, updateName } from "../exampleApp";

// need to make sure I can cache stuff, then I can cache stuff with my HOF

const randInt = () => {
  return Math.floor(Math.random() * 100);
};

const numberyExample = async () => {
  await redisClient.connect();
  await redisClient.clear();

  const exampleInvalidators = {
    getName: {
      fn: async (name: string, lastName: string) => name,
      genSetKey: (name: string, lastName: string) => `name-${name}-${lastName}`,
    },
    getDoubleAge: {
      fn: async (age: number, multiplier: number) => age * 2,
      genSetKey: (age: number, multiplier: number) => `age-${age}-${multiplier}`,
    },
  };

  const { gussiedUp, invalidatorFns } = makeCacheAware(
    {
      invalidatorFns: exampleInvalidators,
      // this only works with the annotation :(
      getInvalidatorArgs: (id: number): invalidatorFnArgs<typeof exampleInvalidators> => {
        return { getDoubleAge: [5, 3], getName: ["jaw", "knee"] };
      },
      fn: (id) => {
        return randInt();
      },
      genKey: (id) => `gussiedUpKey-${id.toString()}`,
    },
    redisClient,
  );

  await gussiedUp(8);
  await gussiedUp(8);
  await gussiedUp(8);
  await gussiedUp(10);
  await gussiedUp(10);
  await gussiedUp(10);

  // now let's call an invalidator fn
  await invalidatorFns.getDoubleAge(4, 10);
  // await invalidatorFns.getDoubleAge(5, 3);
};

const syncDoomExample = async () => {
  await redisClient.connect();
  await redisClient.clear();

  let users = [
    { id: 1, name: "doomguy", bio: "rip and tear", friends: [2, 3] },
    { id: 2, name: "mario", bio: "it's a me", friends: [1] },
    { id: 3, name: "link", bio: "hyah", friends: [1] },
    { id: 4, name: "samus", bio: "beep boop", friends: [] },
    { id: 5, name: "kratos", bio: "BOOYYY", friends: [3, 4] },
  ];

  const profileInvalidators = {
    updateName: {
      fn: updateName,
      genSetKey: (id: number, newName: string) => `updateName-${id}-${newName}`,
    },
  };

  const { gussiedUp, invalidatorFns } = makeCacheAware(
    {
      fn: getStringifiedUser,
      genKey: (id) => `user-${id}`,
      invalidatorFns: profileInvalidators,
      getInvalidatorArgs: (id): invalidatorFnArgs<typeof profileInvalidators> => {
        return { updateName: [id, "new name"] };
      },
    },
    redisClient,
  );

  console.log("**********");
  console.log("**********");
  console.log("**********");
  const doomguyProf1 = await getStringifiedUser(1, users);
  console.log("doomguyProf1 --- ", doomguyProf1);

  const doomguyProf2 = await getStringifiedUser(1, users);
  console.log("doomguyProf2 --- ", doomguyProf2);

  await updateName(1, "DOOOOM slayer", users);
  const doomguyProf3 = await getStringifiedUser(1, users);
  console.log("doomguyProf3 --- ", doomguyProf3);

  await updateBio(1, "rip and tear UNTIL IT IS DONE", users);
  const doomguyProf4 = await getStringifiedUser(1, users);
  console.log("doomguyProf4 --- ", doomguyProf4);
};

const cachifiedDoomExample = async () => {
  await redisClient.connect();
  await redisClient.clear();

  const cachify = genCachify({
    get: redisClient.get,
    set: redisClient.set,
  });

  const cachifiedStringifiedUser = cachify({
    fetchFn: getStringifiedUser,
    genKey: (id) => `user-${id}`,
  });

  let users = [
    { id: 1, name: "doomguy", bio: "rip and tear", friends: [2, 3] },
    { id: 2, name: "mario", bio: "it's a me", friends: [1] },
    { id: 3, name: "link", bio: "hyah", friends: [1] },
    { id: 4, name: "samus", bio: "beep boop", friends: [] },
    { id: 5, name: "kratos", bio: "BOOYYY", friends: [3, 4] },
  ];

  console.log("**********");
  console.log("**********");
  console.log("**********");
  const doomguyProf1 = await cachifiedStringifiedUser(1, users);
  console.log("doomguyProfile ---  ", doomguyProf1);

  // update doomguy's name
  await updateName(1, "DOOOOM slayer", users);
  const doomguyProf2 = await cachifiedStringifiedUser(1, users);
  console.log("doomguyProfile2 --- ", doomguyProf2);
  // ^ should be the same, even though we updated the name
};

const smartModeDoomExample = async () => {
  await redisClient.connect();
  await redisClient.clear();

  let users = [
    { id: 1, name: "doomguy", bio: "rip and tear", friends: [2, 3] },
    { id: 2, name: "mario", bio: "it's a me", friends: [1] },
    { id: 3, name: "link", bio: "hyah", friends: [1] },
    { id: 4, name: "samus", bio: "beep boop", friends: [] },
    { id: 5, name: "kratos", bio: "BOOYYY", friends: [3, 4] },
  ];

  const profileInvalidators = {
    updateName: {
      fn: updateName,
      genSetKey: (id: number) => `updateName-${id}`,
    },
  };

  const { gussiedUp: cacheAwareGetStringifiedUser, invalidatorFns } = makeCacheAware(
    {
      fn: getStringifiedUser,
      genKey: (id) => `userProfile-${id}`,
      invalidatorFns: profileInvalidators,
      getInvalidatorArgs: (id): invalidatorFnArgs<typeof profileInvalidators> => {
        return { updateName: [id] };
      },
    },
    redisClient,
  );

  console.log("**********");
  console.log("**********");
  console.log("**********");
  const doomguyProf1 = await cacheAwareGetStringifiedUser(1, users);
  console.log("doomguyProf1 --- ", doomguyProf1);

  const doomguyProf2 = await cacheAwareGetStringifiedUser(1, users);
  // should be from cache
  console.log("doomguyProf2 --- ", doomguyProf2);

  await invalidatorFns.updateName(1, "DOOOOM slayer", users);
  // should invalidate doomguy's profile cache
  const doomguyProf3 = await cacheAwareGetStringifiedUser(1, users);
  console.log("doomguyProf3 --- ", doomguyProf3);
};

// numberyExample();
// syncDoomExample();
// cachifiedDoomExample();
smartModeDoomExample();

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

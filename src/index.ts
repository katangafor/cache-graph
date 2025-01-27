// ok so we need
// 1. a graph structure that can represent cache dependencies
// 2. a way to register functions on that graph structure
// 3. a way to record cached data in redis prefixes in a way that can be understood by the graph

// first let's see if we can make graphs work
import { redisClient } from "./redis-client";
import { makeCacheAware, invalidatorFnArgs } from "./graph";
import { getStringifiedUser, updateBio, updateName } from "../exampleApp";
import { genCachify } from "./genCachify";
import { prisma } from "./prismaClient";

/**
 * 
 * INSERT INTO user (id, name, bio) VALUES
(1, 'doomguy', 'rip and tear'),
(2, 'master chief', 'oh shit jackal snipers'),
(3, 'link', 'navi PLEASE shut UP'),
(4, 'samus', 'beep boop'),
(5, 'kratos', 'boooyyyy');

INSERT INTO friend_relationship (userId, friendId) VALUES
(1, 2),
(1, 3),
(2, 1),
(3, 1),
(5, 3),
(5, 4);
 */
// clear both tables and insert that data
const resetDB = async () => {
  await prisma.friend_relationship.deleteMany({});
  await prisma.user.deleteMany({});

  await prisma.user.createMany({
    data: [
      { id: 1, name: "doomguy", bio: "rip and tear" },
      { id: 2, name: "master chief", bio: "oh shit jackal snipers" },
      { id: 3, name: "link", bio: "navi PLEASE shut UP" },
      { id: 4, name: "samus", bio: "beep boop" },
      { id: 5, name: "kratos", bio: "boooyyyy" },
    ],
  });

  await prisma.friend_relationship.createMany({
    data: [
      { userId: 1, friendId: 2 },
      { userId: 1, friendId: 3 },
      { userId: 2, friendId: 1 },
      { userId: 3, friendId: 1 },
      { userId: 5, friendId: 3 },
      { userId: 5, friendId: 4 },
    ],
  });
};

const getUsers = async () => {
  return await prisma.user.findMany();
};

const updateUserBio = async ({ id, bio }: { id: number; bio: string }) => {
  return await prisma.user.update({
    where: {
      id,
    },
    data: {
      bio,
    },
  });
};

const updateUserName = async ({ id, name }: { id: number; name: string }) => {
  return await prisma.user.update({
    where: {
      id,
    },
    data: {
      name,
    },
  });
};

const getFriendIds = async (id: number) => {
  const userFriendRelationship = await prisma.friend_relationship.findMany({
    where: {
      userId: id,
    },
  });

  return userFriendRelationship.map((r) => r.friendId);
};

const getUserProfile = async (id: number) => {
  const user = await prisma.user.findFirstOrThrow({
    where: {
      id,
    },
  });

  const idsOfUserFriends = await getFriendIds(id);

  const userFriends = await prisma.user.findMany({
    where: {
      id: {
        in: idsOfUserFriends,
      },
    },
  });

  const friendsString = `Friends with ${userFriends.map((f) => f.name).join(", ")}`;

  return `\n${user.name}:\n~~ ${user.bio} ~~\n${friendsString}`;
};

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
      getInvalidatorArgs: async (id: number) => {
        return {
          getDoubleAge: [
            [5, 3],
            [9, 8],
          ],
          getName: ["jaw", "knee"],
        };
      },
      primaryFn: (id) => {
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
      primaryFn: getStringifiedUser,
      genKey: (id) => `user-${id}`,
      invalidatorFns: profileInvalidators,
      getInvalidatorArgs: async (id) => {
        return { updateName: [[id, "new name"]] };
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

// pick your primary fn
// pick your invalidators
// getInvalidatorArgs implementation

const smartModeDoomExample = async () => {
  await redisClient.connect();
  await redisClient.clear();
  await resetDB();

  const profileInvalidators = {
    updateName: {
      fn: updateUserName,
      genSetKey: (...args: Parameters<typeof updateUserName>) =>
        `updateName-${args[0].id}`,
    },
    updateBio: {
      fn: updateUserBio,
      genSetKey: (...args: Parameters<typeof updateUserBio>) => `updateBio-${args[0].id}`,
    },
  };

  // LOL it is such a PITA to get this typed correctly
  const { gussiedUp, invalidatorFns } = makeCacheAware(
    {
      primaryFn: getUserProfile,
      genKey: (id) => `userProfile-${id}`,
      invalidatorFns: profileInvalidators,
      getInvalidatorArgs: async (id) => {
        // need args for both user, and friends of user
        const friendIds = await getFriendIds(id);
        const friendIdArgs: [{ id: number; name: string }][] = friendIds.map((id) => [
          { id, name: "pls" },
        ]);

        // const updateNameArgs: [{ id: number; bio: string }][] = [
        const updateNameArgs: Parameters<
          (typeof profileInvalidators)["updateName"]["genSetKey"]
        >[] = [[{ id, name: "pls" }], ...friendIdArgs];

        // now for updateBio: only need the primary ID, since the user's
        // profile doesn't include friends' bios
        const updateBioArgs: Parameters<
          (typeof profileInvalidators)["updateBio"]["genSetKey"]
        >[] = [[{ id, bio: "pls" }]];
        console.log("\nall generated invalidator args: ", {
          updateNameArgs,
          updateBioArgs,
        });

        return { updateName: updateNameArgs, updateBio: updateBioArgs };
      },
    },
    redisClient,
  );

  console.log("**********");
  console.log("**********");
  console.log("**********");
  const doomguyProf1 = await gussiedUp(1);
  // console.log(doomguyProf1);

  const doomguyProf2 = await gussiedUp(1);

  await invalidatorFns.updateName({ id: 1, name: "DOOOOM SLAYER" });
  // // should be from cache
  // console.log(doomguyProf2);

  // const masterChiefProf1 = await gussiedUp(2);
  // console.log(masterChiefProf1);

  // // await invalidatorFns.updateName({ id: 1, name: "DOOOOM SLAYER" });
  // // should invalidate doomguy's profile cache
  // const doomguyProf3 = await gussiedUp(1);
  // console.log(doomguyProf3);
  // // the master chief cache should have been invalidated when updating doomguy's name
  // const masterChiefProf2 = await gussiedUp(2);
  // console.log(masterChiefProf2);
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

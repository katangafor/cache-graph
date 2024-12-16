import { redisClient } from "./redis-client";

const randoNum = async ({
  name,
  age,
}: {
  name: string;
  age: number;
}): Promise<number> => {
  return new Promise((resolve) => {
    const delay = Math.floor(Math.random() * 2000); // Random delay up to 2 seconds
    setTimeout(() => {
      const randomNumber = Math.random(); // Random number between 0 and 1
      resolve(randomNumber);
    }, delay);
  });
};

// need to detangle how the HOC fits in. I guess I give users an HOC generator?
// or instead of cacheInterface I could just give em a "set" function.
// then the result of the HOC is what the register in the graph?
type FetchFunction<TArgs extends unknown[], TReturn> = (
  ...args: TArgs
) => Promise<TReturn>;

// ok fetch function is actually a thunk. And genKey should be too, with the same type but returns string
type FetchFunctionThunk<TArgs extends unknown[], TReturn> = () => FetchFunction<
  TArgs,
  TReturn
>;

// JK there is not really a way for the HOC to force the genKey args to match the fetch args.
// Since the fetch func itself is a thunk, the guts of the function call (where the args are)
// don't appear in the type signature. So you can't infer them. They're an implementation detail of
// () =>

export type withCacheArgs<TArgs extends unknown[], TReturn> = {
  fetchFn: FetchFunction<TArgs, TReturn>;
  funcArgs: TArgs;
  genKey: (...args: TArgs) => string;
  set: ({ key, value }: { key: string; value: string }) => Promise<any>;
  get: (key: string) => Promise<string | null>;
  // not sure if this is necessary but feels important
  tag: string;
};

const withCache = async <TArgs extends unknown[], TReturn>({
  fetchFn,
  funcArgs,
  genKey,
  get,
  set,
  tag,
}: withCacheArgs<TArgs, TReturn>) => {
  const cacheKey = genKey(...funcArgs);
  const rawValue = await get(cacheKey);

  if (rawValue) {
    console.log("got from cache");
    return JSON.parse(rawValue) as TReturn;
  }

  const newVal = await fetchFn(...funcArgs);
  console.log("gonna set ");
  console.log({ key: cacheKey, value: JSON.stringify(newVal) });
  await set({ key: cacheKey, value: JSON.stringify(newVal) });
  return newVal;
};

// a function that takes everything except args, and then returns a function
// that lets the user provide args
// just takes everything... except the args?
export const cachify = <TArgs extends unknown[], TReturn>(
  withCacheArgs: Omit<withCacheArgs<TArgs, TReturn>, "funcArgs">,
) => {
  return async (...funcArgs: TArgs) => {
    return withCache({
      ...withCacheArgs,
      funcArgs,
    });
  };
};

// maybe with cache needs to return another function after all, so args can be passed in??
const test = async () => {
  const thing = await withCache({
    fetchFn: randoNum,
    funcArgs: [
      {
        age: 10,
        name: "me",
      },
    ],
    genKey: ({ name, age }) => `${name}-${age}`,
    set: async ({ key, value }) => {
      // Implement your set function here
    },
    get: async (key) => {
      // Implement your get function here
      return null;
    },
    tag: "exampleTag",
  });

  // ok now try generating that withCache function
  const cachedRandoNumber = cachify({
    fetchFn: randoNum,
    genKey: ({ name, age }) => `${name}-${age}`,
    set: async ({ key, value }) => {
      // Implement your set function here
    },
    get: async (key) => {
      // Implement your get function here
      return null;
    },
    tag: "exampleTag",
  });

  const plsMang = await cachedRandoNumber({ age: 100, name: "johnny" });
};

const withCacheIdentity = <TArgs extends unknown[], TReturn>() => {};

// I guess each function node has an async function, and children.
// children are just any other nodes
// if you actually want to infer the correct types of the whole tree for whatever reason,
// you'll probs have to use mapped types with infer (to avoid passing any to the children generic)
type FancyFunctionNode<TArgs extends unknown[], TReturn> = {
  func: (...args: TArgs) => Promise<TReturn>;
  genKey: (args: TArgs) => string;
  children?: FancyFunctionNode<any, any>[];
};

const fancyFuncIdentity = <TArgs extends unknown[], TReturn>(
  funcNode: FancyFunctionNode<TArgs, TReturn>,
) => {
  return funcNode;
};

// looks like this works
// fancyFuncIdentity({
// func: randoNum,
// genKey: ([hello]) => hello,
// })

// https://stackoverflow.com/questions/72370457/generic-type-for-args

// but maybe I can go dumb all the way:
// FunctionNode isn't responsible for making sure the args to stringify are the same as the actual function args,
// I just have another function that does that part

type FunctionNode = {};

// how could you use something like this?

const updateProfileNameNode = {
  func: async (name: string) => {
    console.log(`Updated profile name to ${name}`);
  },
  children: [
    {
      func: async () => {
        console.log("Invalidating profile HTML");
      },
    },
    {
      func: async () => {
        console.log("Refreshing related data");
      },
      children: [
        {
          func: async () => {
            console.log("Recalculating user stats");
          },
        },
      ],
    },
  ],
};

// const funcNodeIdentity = <TNode extends

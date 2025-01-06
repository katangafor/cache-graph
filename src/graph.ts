export type withCacheArgs<TArgs extends unknown[], TReturn> = {
  fetchFn: (...args: TArgs) => Promise<TReturn>;
  funcArgs: TArgs;
  genKey: (...args: TArgs) => string;
  set: ({ key, value }: { key: string; value: string }) => Promise<any>;
  get: (key: string) => Promise<string | null>;
};

const withCache = async <TArgs extends unknown[], TReturn>({
  fetchFn,
  funcArgs,
  genKey,
  get,
  set,
}: withCacheArgs<TArgs, TReturn>) => {
  const cacheKey = genKey(...funcArgs);
  const rawValue = await get(cacheKey);

  if (rawValue) {
    return JSON.parse(rawValue) as TReturn;
  }

  const newVal = await fetchFn(...funcArgs);
  await set({ key: cacheKey, value: JSON.stringify(newVal) });
  return newVal;
};

// takes get and set, return cachify
export const genCachify = <TArgs extends unknown[], TReturn>({
  get,
  set,
}: Pick<withCacheArgs<TArgs, TReturn>, "get" | "set">) => {
  return <TArgs extends unknown[], TReturn>(
    withCacheArgs: Omit<withCacheArgs<TArgs, TReturn>, "funcArgs" | "get" | "set">,
  ) => {
    return async (...funcArgs: TArgs) => {
      return withCache({
        ...withCacheArgs,
        funcArgs,
        get,
        set,
      });
    };
  };
};

// trying to make a non-recursive version to share on SO for help
// part of the issue is how to actually format the parent functions' args?
// like if you have two parent functions, are they all just in a tuple?
// are they smushed together into the same args list? (no, how would you combine objects and regular params)
// I feel like maybe you have to provide the name of the function as an obj property, then the arguments array as its value

// so an MVP for this type would be:
// you have two properties: a function called "fn" and a list (tuple or object? maybe try both) of parent functions called "parentFns"

// ok first we need to see if TS can infer the types of multiple things in an array at once

// ok so you can infer a whole union of stuff. So it must be possible to infer the function arguments of an object full of functions??
type funcObj = {
  [key: string]: (...args: any) => any;
};

type funcObjArgs<T extends funcObj> = {
  [K in keyof T]: Parameters<T[K]>;
};

type dumbNode<T extends funcObj> = {
  parentFns: T;
  fn: (parentFnArgs: funcObjArgs<T>) => any;
};

const makeFunctionNode = <T extends funcObj>(dumbNode: dumbNode<T>) => dumbNode;

const exampleFuncs = {
  getName: (name: string, lastName: string) => name,
  getDoubleAge: (age: number, multiplier: number) => age * 2,
};

const myDumbFuncNode = makeFunctionNode({
  parentFns: exampleFuncs,
  fn: (parentFuncSigs) => {
    // just giving em underscores to differentiate them from actual ones
    const { getDoubleAge: getDoubleAgeSig, getName: getNameSig } = parentFuncSigs;
    // I should be able to call those functions with the params I have in my tuples
    const doubleAge = exampleFuncs.getDoubleAge(...getDoubleAgeSig);
    //    ^?
    const name = exampleFuncs.getName(...getNameSig);
    //    ^?
  },
});

// we'll use these instead of functions in funcNodes. I don't think we'll have any raw functions? just these babies.
// OK I can't make the cacheable example work 1-to-1 with the dumbFuncNode since cacheable is generic, so imma
// remove the generic restriction FOR NOW to see what I can do
type cacheable = {
  fn: (...args: any) => any;
  genKey: (...args: any) => string;
};

type cacheableObj = {
  [key: string]: cacheable;
};

// difference between funcs and cacheables is that while the functions can be anything,
// the cacheable for fn needs to get its args from parentFns
type cacheableFnArg<T extends cacheableObj> = {
  [K in keyof T]: Parameters<T[K]["fn"]>;
};

type cacheableFnNode<T extends cacheableObj> = {
  parentFns: T;
  fn: (parentFnArgs: cacheableFnArg<T>) => any;
};

const makeCacheableFnNode = <T extends cacheableObj>(
  cacheableFnNode: cacheableFnNode<T>,
) => cacheableFnNode;

const exampleCacheables = {
  getName: {
    fn: (name: string, lastName: string) => name,
    genKey: (name: string, lastName: string) => `name:${name}:${lastName}`,
  },
  getDoubleAge: {
    fn: (age: number, multiplier: number) => age * 2,
    genKey: (age: number, multiplier: number) => `age:${age}:${multiplier}`,
  },
};

const myCacheableFuncNode = makeCacheableFnNode({
  parentFns: exampleCacheables,
  fn: (parentFuncSigs) => {
    const { getDoubleAge: getDoubleAgeSig, getName: getNameSig } = parentFuncSigs;
    const doubleAge = exampleCacheables.getDoubleAge.fn(...getDoubleAgeSig);
    const name = exampleCacheables.getName.fn(...getNameSig);
  },
});

// ok I can infer an object's worth of function arguments, and they're associated to the function by name.
// I think that the function nodes will need a keygen function specificied explicitly: a cachified function
// has the exact same signature as the func itself, just with extra side effects. So you can't figure out
// how to generate a cache key from the cachified function. The genkey needs to be provided so that children
// can correctly generate the cache keys for their parents.

// ## FUNCTION NODES ##
// each function node will have a cachified function, a list of parent nodes.
// when you call a function, you will also have to provide the args of the parent nodes'
// genCacheKey functions.

// I guess each function node has an async function, and children.
// children are just any other nodes
// if you actually want to infer the correct types of the whole tree for whatever reason,
// you'll probs have to use mapped types with infer (to avoid passing any to the children generic)

// https://stackoverflow.com/questions/72370457/generic-type-for-args

// but maybe I can go dumb all the way:
// FunctionNode isn't responsible for making sure the args to stringify are the same as the actual function args,
// I just have another function that does that part

// ok so I think that function node is more or less an instance of the HOF.
// you stick cachified function calls in the graph as nodes.

// ok you can't just clear downstream caches based on function deps alone, you
// have to consider the args used in the cache keys.
// For instance, if you re-pull ripcurl's data, then you've used
// getData({ clientName: "ripcurl" }), and you ONLY want to clear caches that
// have that segment of the key.
// But we can actually do that, as long as the cache keys are generated by the graph,
// and not JUST the function alone.
// For instance, every function dependent on getData({ clientName: "ripcurl" })
// includes it's prefixes, you can just clear on those prefixes.

// This gets more difficult when you have a function that's dependent on multiple upstream
// functions. Then you might even need to introduce an "or" condition that prefixes
// based on ALL upstream caches, and clears based on any of them.
// Might have to actually do a redis style serialization, where you can either have
// a simple upstream cache key, or an array tagged with * or something

// might be good to think about specific use cases with some example functions
// dataPull(clientId: number)
// => getAdset(adsetId: number)

// let's say you have a caching strategy that assumes all dependent caches
// are identifiable by parent cache keys. So you can assume that getAdset will be
// prefixed by something like dataPull:306
// that means
// - getAdset will ALWAYS need to know how to generate its parents cache keys.
//   For instance if you're calling getAdset(55), you'll also have to find
//   the client ID that corresponds to adset 55, and then get the cacheKey for
//   dataPull(306)

// this means the type of any function node would need to know the args of the parent
// function, so that could generate the cache key for the parent function.

// Obvi this makes things more complicated, because then
// 1. the cache key generator needs to be async
// 2. generating a cache key now an expensive operation, which kinda ruins the point
//    of caching it in the first place!
// 3. If your function is a dependent of multiple upstream functions, you need to
//    generate cache keys for each of them. So the more complicated and downstream
//    your function is, the more expensive it is to cache things.

// HOWEVER
// you don't ALWAYS need to fetch a bunch of shit *all the time*. You only have to fetch
// a bunch extra upstream cache params in the *worst* case. You might have everything,
// or at least some of what you need already.
// Like if you're caching getAdset, and you need a client name to create the upstream
// cache. But that doesn't necessarily mean that genKey needs to go fetch it: it's quite
// likely that you have it in scope already.
// You just need the genCache function to understand that it's inheriting the arg types
// of all upstream functions. Idk how the fuck to do that though lol

// ACTUALLY it's probably better if function nodes contain their parents, not their children??
// cause then you can recursively loop through parents, making sure that all of the args have been
// provided.

// Jan 6th
// so I have that dumbFuncNode. It forces fn to provide all of the necessary args required by each function in parentFns.
// But nobody wants to use that. So we have genCachify, which lets you curry the get/set in early, so all that's left is

// BRAINSTORM what's the deal with caching types?
// withCache takes a function, genKey function, AND func args (along with get/set cache methods).
// genCachify lets you curry the get/set funcs early, and RETURNS a cachify function.
// a cachify function is one that takes a fetchFn and a genKey.

// in retrospect, that is indeed exactly what we need to provide to the function nodes.
// you won't be providing a cachified function, you'll be providing the same args that cachify takes:
// a fetchFn and a genKey

// so how do we get from a dumbFuncNode to one using genKey n shit?
// do I actually need to get a full withCache function working to try out these types?
// I don't THINK I do: the guts of a withCache function doesn't really matter yet.
// As long as function nodes have a fn and genKey, I can get the types working. You wouldn't actually
// be caching anything without the withCache usage, but I'm not hooking the caching/prefixing up
// yet anyway.

// I'll start by trying to define a new type: an object (called cacheable?) that has both a fn and a genKey (which obvi take the same args).
// Then I'll need to get a funcNode working that only has cacheables, instead of functions.

// NOTE the idea might be easier to explain using dumbFuncNode, so keep it around for SO posts n such

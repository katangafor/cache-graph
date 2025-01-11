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

// type cacheableFnNode<T extends cacheableObj> = {
//   parentFns: T;
//   fn: (parentFnArgs: cacheableFnArg<T>) => any;
// };

// const makeCacheableFnNode = <T extends cacheableObj>(
//   cacheableFnNode: cacheableFnNode<T>,
// ) => cacheableFnNode;

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

// const myCacheableFuncNode = makeCacheableFnNode({
//   parentFns: exampleCacheables,
//   fn: (parentFuncSigs) => {
//     const { getDoubleAge: getDoubleAgeSig, getName: getNameSig } = parentFuncSigs;
//     const doubleAge = exampleCacheables.getDoubleAge.fn(...getDoubleAgeSig);
//     const name = exampleCacheables.getName.fn(...getNameSig);
//   },
// });

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

// OK LOL this whole time I was thinking about cache trees that only depend on prefixes, but there are
// tons (maybe most) instances where a side-effect is invalidating a cache, and has nothing to do with cache keys.

// what does the current setup even solve? just that literal direct descendants could be invalidated? doesn't
// that assume redundant caching in the first place?

// you need to include functions that only have side effects in the graph. Like "setName" needs to invalidate "getName".
// So... how does that work? Is setName a parent of getName? and it has a genKey function?

// Or does it have to work the other way around? setName needs to depend on getName so that it can generate a key.

// OK TURNS OUT I TOTALLY LOST THE PLOT and idk what I was even thinking about
// you don't usually need a graph. maybe ever.
// the primary use case is this:
// ---
// a cache could be made invalid by side effects of other functions.
// pretend that shopify generates html for its storefronts.

// getProfile gets your user profile, and shows a list of your best friends
// if any of your friends change their names, your cache is invalidated.

// I guess if the cache key included the IDs of your best friends... you could

// ok let's think through a whole scenario
// getUserProfile depends on
// user name
// bio
// profile picture
// best friend records
// names of best friends

// I guess the idea is that you would encode ALL of that information into the cache key. You're making
// the explicit arguments implicit.

// So if the args are different, do you even have to invalidate it? Like if you're fetching
// profile-4:bestfriends-4,6,3, then you won't retrieve the cached profile-4:bestfriends-1,2,3 by accident.
// But then you have to re-grab ALL of that data anytime you want to set OR get a profile. Which is slow as fuck and
// ruins the point.

// I think that was basically my original idea: make the implicit arguments explicit. It would probably work for
// my client -> adset example, since clientId is a pretty mf basic implicit dep of adset. And the cost of fetching
// a client ID from an adset ID is negligible compared to the cost of calculating an adset CPR or something.

// So you'd say dataPull(clientId) invalidates getAdset(adsetId). So keys need to be constructed in a way
// where when I clear clientId, adset is also cleared. So the key will be client-4:adset-5

// So maybe the easy-mode version is: help devs turn implicit deps to explicit deps in cache keys.
// It probably works fine for simple cases where the cost of getting the extra args together is tiny compared
// to the cost of getting the data.

// Although maybe you don't actually need to

// or maybe you just map an arg from each function to the ID of the cache key idk

// it's SETS
// if a function can be invalidated by a parent fn, then it's in the parent fn's set
// if it can be invalidated by two functions, then its in TWO sets
// so how do you store everything? make a key normally, but then also put that generated
// key in a set of keys?
// like:
// adsetId-6 is the cache key
// clientId-7 is a set of [adsetId-6]
// when you call dataPull(clientId = 7), you know you need to clear everything in that set
// how do you come up with the set though? that has to happen when you cache things in the first place

// so you check for a cache hit, and if it doesn't hit, when you write to the cache you also have to
// write to all your sets.

// when you call a side effect fn, you find its set name, and invalidate everything in the set.

// ---
// let's simulate a cache in action
// getAdset(5). The genKey function knows that dataPull(clientId) is a dep, so it
// forces you to also provide clientId, which is 9
// getAdset(5) result is cached => adset-5
// at the same time, this entry now belongs *in the set of all entries
// that can be invalidated by someone calling dataPull(9). This is recorded
// with an entry idk like purgeableDataPull(9) => [adset-5]. I guess the parent
// functions are required to have a genKey as well, so that the primary function they can decide on their
// set names.

// you fetch some more adsets, and you're cache ends up lookin like this:
// adset-5   => stuff
// adset-12  => stuff
// adset-53  => stuff
// purgeableDataPull(9)  => [adset-5, adset-12]
// purgeableDataPull(12) => [adset-53]

// so now you have three cached adsets, and they're all recorded in purgeable sets.
// When you're checking for cache hits, you can just check using the genKey of your primary function.
// When you run dataPull(12), (which has been re-exported, and given the extra cache-clearing side-effect), it
// runs its genKey function to find the entries in purgeableDataPull(12), and proceeds to remove both the set
// and the keys from the set. Leaving you with:

// adset-5   => stuff
// adset-12  => stuff
// purgeableDataPull(9)  => [adset-5, adset-12]
// ---

// I THINK THAT'S IT
// if you have multiple parent fns, when you delete a set, the OTHER set will end up with keys that
// don't point to anything. I think that's probably fine, since you don't read via these keys. It's
// just a list of keys to delete anyway.

// WAIT FUCK
// you do need to provide the parent fn arguments in case of a cache miss, but you DON'T need to provide them otherwise.
// So you need to provide a function that will fetch the rest of the arguments. Then in the generated parent fn with the injected extra
// shit, you conditionally run that func.

// So the primary fn needs to have a function can that can fill in the
// args of the parent fns. How do you provide this? it must be required by funcNode.
// What exactly is it?
// an function that takes the args of primary, and returns the args of the funcs??

type cacheableFnNode2<
  TParentFns extends cacheableObj,
  TFnArgs extends unknown[],
  TFnReturn,
> = {
  parentFns: TParentFns;
  // instead of providing the args, it needs to return the args.
  // The args of fn are now their own
  getParentArgs: (...args: TFnArgs) => cacheableFnArg<TParentFns>;
  fn: (...args: TFnArgs) => TFnReturn;
  genKey: (...args: TFnArgs) => string;
};

const makeCacheableFnNode2 = <T extends cacheableObj, K extends unknown[], J>(
  cacheableFnNode: cacheableFnNode2<T, K, J>,
) => cacheableFnNode;

const myCacheableFuncNode2 = makeCacheableFnNode2({
  parentFns: exampleCacheables,
  // this only works with the annotation
  getParentArgs: (id: number): cacheableFnArg<typeof exampleCacheables> => {
    return { getDoubleAge: [5, 3], getName: ["jaw", "knee"] };
  },
  fn: (id) => {
    console.log("idk do something");
  },
  genKey: (id) => id.toString(),
});

// ok it sucks but for now we need the type annotation. Probs SO can help.
// Moving on, this describes the information that we need from a function node.
// But a function node is really just the argument for the actual function!

// we need to make a function that takes a function node, and implements all the fancy shit
// - make a logic'd-up version of the

// let's see if we can make a function that takes a func node and does something with it
const doStuff = <TParentFns extends cacheableObj, TFnArgs extends unknown[], TFnReturn>(
  funcNode: cacheableFnNode2<TParentFns, TFnArgs, TFnReturn>,
) => {
  // takes the same args as the regular function, but also gets args for
  // the parent fns
  const gussiedUp = (...args: TFnArgs) => {
    // I guess... get the parent args??
    const parentArgs = funcNode.getParentArgs(...args);
    return parentArgs;
  };
  return { gussiedUp };
};

export const { gussiedUp } = doStuff(myCacheableFuncNode2);

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

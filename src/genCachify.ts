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

export const genCachify = <TArgs extends unknown[], TReturn>(
  outerArgs: Pick<withCacheArgs<TArgs, TReturn>, "get" | "set">,
) => {
  return <TArgs extends unknown[], TReturn>(
    innerArgs: Pick<withCacheArgs<TArgs, TReturn>, "fetchFn" | "genKey">,
  ) => {
    return async (...funcArgs: TArgs) => {
      //
      return withCache({
        ...innerArgs,
        ...outerArgs,
        funcArgs,
      });
    };
  };
};

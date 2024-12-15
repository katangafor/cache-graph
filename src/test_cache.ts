export type cacheInterface = {
  get: (prefixes: string[], key: string) => Promise<string | null>;
  set: (args: {
    prefixes: string[];
    key: string;
    value: string;
    expireTime: number | null;
  }) => Promise<string | null>;
  deleteByPrefix: (prefixes: string[]) => Promise<void>;
  open: () => Promise<void>;
};

export const formatKey = (prefixes: string[], key: string) => {
  return [...prefixes, key].join(":");
};

export const genTestRedisState = (): Record<string, any> => {
  return {};
};

export const testCache = (
  testRedisState: Record<string, any>
): cacheInterface => ({
  async get(prefixes: string[], key: string) {
    const prefixedKey = formatKey(prefixes, key);
    return testRedisState[prefixedKey];
  },
  async set(args: {
    prefixes: string[];
    key: string;
    value: string;
    expireTime: number | null;
  }) {
    const { prefixes, key, value } = args;
    const prefixedKey = formatKey(prefixes, key);
    testRedisState[prefixedKey] = value;
    return value;
  },
  async deleteByPrefix(prefixes: string[]) {
    for (const key in testRedisState) {
      if (key.startsWith(prefixes.join(":"))) {
        delete testRedisState[key];
      }
    }
  },
  async open() {
    return;
  },
});

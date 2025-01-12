export type cacheInterface = {
  connect: () => Promise<void>;
  set: (args: { key: string; value: string }) => Promise<string | null>;
  get: (key: string) => Promise<string | null>;
  sadd: (args: { set: string; value: string }) => Promise<string>;
  clear: () => Promise<void>;
};

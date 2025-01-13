export type cacheInterface = {
  connect: () => Promise<void>;
  set: (args: { key: string; value: string }) => Promise<string | null>;
  del: (key: string) => Promise<any>;
  smembers: (key: string) => Promise<string[]>;
  get: (key: string) => Promise<string | null>;
  sadd: (args: { set: string; value: string }) => Promise<string>;
  clear: () => Promise<void>;
};

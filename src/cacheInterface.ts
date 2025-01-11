export type cacheInterface = {
  connect: () => Promise<void>;
  set: (args: { key: string; value: string }) => Promise<string | null>;
  get: (key: string) => Promise<string | null>;
  clear: () => Promise<void>;
};

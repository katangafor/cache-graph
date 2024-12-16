import { createClient } from "redis";

const client = createClient({
  url: "redis://localhost:6379",
});

export const redisClient = {
  async connect() {
    await client.connect();
  },
  async set({ key, value }: { key: string; value: string }) {
    return await client.set(key, value);
  },
  async get(key: string) {
    return await client.get(key);
  },
  async clear() {
    return await client.flushAll();
  },
};

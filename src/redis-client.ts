import { createClient } from "redis";
import { cacheInterface } from "./cacheInterface";

const client = createClient({
  url: "redis://localhost:6379",
});

export const redisClient: cacheInterface = {
  async connect() {
    await client.connect();
  },
  async set({ key, value }: { key: string; value: string }) {
    return await client.set(key, value);
  },
  async smembers(key: string) {
    return await client.sMembers(key);
  },
  async del(key: string) {
    return await client.del(key);
  },
  async get(key: string) {
    return await client.get(key);
  },
  async sadd({ set, value }) {
    return await client.SADD(set, value);
  },
  async clear() {
    return await client.flushAll();
  },
};

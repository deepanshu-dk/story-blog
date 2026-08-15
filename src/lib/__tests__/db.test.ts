import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("connectToDatabase", () => {
  it("reuses the cached connection on a second call rather than opening a new one", async () => {
    const first = await connectToDatabase();
    const second = await connectToDatabase();
    expect(second).toBe(first);
  });
});

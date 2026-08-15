import { MongoMemoryServer } from "mongodb-memory-server";

// A single shared in-memory MongoDB instance for the whole test run, instead of one per
// test file - avoids the port-binding/resource-contention flakiness of many concurrent
// MongoMemoryServer instances under parallel test execution.
export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  return async () => {
    await mongod.stop();
  };
}

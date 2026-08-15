import mongoose from "mongoose";

// The shared in-memory MongoDB instance and its URI are set up once for the whole run by
// globalSetup.ts (see vitest.config.mts) - this just connects/disconnects mongoose's
// default connection against that single instance, per test file.
export async function connectTestDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI not set - globalSetup should have configured it");
  }
  await mongoose.connect(uri);
}

export async function disconnectTestDb() {
  await mongoose.disconnect();
}

export async function clearTestDb() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

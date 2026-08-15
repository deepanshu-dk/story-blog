import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Single-document collection: exactly one SessionConfig row exists, holding the
// current session-secret version. Bumping it (on password rotation) invalidates
// every previously-issued session cookie on their next Node-side check, without
// requiring a redeploy (see docs/plans - Key Technical Decisions: Auth).
const sessionConfigSchema = new Schema({
  sessionSecretVersion: { type: Number, required: true, default: 1 },
});

export type SessionConfigDocument = InferSchemaType<typeof sessionConfigSchema>;

const SessionConfig = (mongoose.models.SessionConfig as Model<SessionConfigDocument>) ??
  mongoose.model<SessionConfigDocument>("SessionConfig", sessionConfigSchema);

export async function getSessionSecretVersion(): Promise<number> {
  let doc = await SessionConfig.findOne();
  if (!doc) {
    doc = await SessionConfig.create({ sessionSecretVersion: 1 });
  }
  return doc.sessionSecretVersion;
}

export async function bumpSessionSecretVersion(): Promise<number> {
  let doc = await SessionConfig.findOne();
  if (!doc) {
    doc = await SessionConfig.create({ sessionSecretVersion: 1 });
  } else {
    doc.sessionSecretVersion += 1;
    await doc.save();
  }
  return doc.sessionSecretVersion;
}

export default SessionConfig;

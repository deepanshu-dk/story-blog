/**
 * Converts a Mongoose document (or anything containing one, e.g. ObjectId/Date fields)
 * into a plain JSON-safe object. Server Actions invoked from Client Components can only
 * return plain objects and a few built-ins - a raw Mongoose document is a class instance
 * and crashes with "Only plain objects... can be passed to Client Components" the moment
 * a client-invoked action returns one directly.
 */
export function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

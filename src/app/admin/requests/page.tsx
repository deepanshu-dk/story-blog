import { listStoryRequests } from "@/actions/requests";
import { RequestInbox } from "./RequestInbox";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const requestsRaw = await listStoryRequests();
  const requests = requestsRaw.map((r) => ({
    _id: r._id.toString(),
    message: r.message,
    reviewed: r.reviewed,
    createdAt: new Date(r.createdAt).toISOString(),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Story Requests</h1>
      <RequestInbox requests={requests} />
    </div>
  );
}

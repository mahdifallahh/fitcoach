import { withRoute } from "@/server/http/route";
import { getAdmin } from "@/server/container";
import { subscriptionActionSchema } from "@/server/admin/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Grant N days of access or expire immediately (owner-only). */
export const POST = withRoute(
  ({ params, body }) =>
    body.action === "grant"
      ? getAdmin().grantSubscription(params.id, body.days)
      : getAdmin().expireSubscription(params.id),
  { role: "ADMIN", bodySchema: subscriptionActionSchema },
);

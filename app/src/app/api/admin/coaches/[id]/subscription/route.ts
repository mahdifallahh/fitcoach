import { withRoute } from "@/server/http/route";
import { getAdmin } from "@/server/container";
import { setTierSchema } from "@/server/admin/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Set the coach's capability tier — FREE/ECONOMY/NORMAL/PRO (owner-only). */
export const POST = withRoute(
  ({ params, body }) => getAdmin().setCoachTier(params.id, body.tier),
  { role: "ADMIN", bodySchema: setTierSchema },
);

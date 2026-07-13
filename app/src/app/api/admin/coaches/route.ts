import { withRoute } from "@/server/http/route";
import { getAdmin } from "@/server/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(
  ({ req }) => {
    const search = new URL(req.url).searchParams.get("search") ?? undefined;
    return getAdmin().listCoaches(search);
  },
  { role: "ADMIN" },
);

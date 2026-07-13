import { withRoute } from "@/server/http/route";
import { getAdmin } from "@/server/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(() => getAdmin().overview(), { role: "ADMIN" });

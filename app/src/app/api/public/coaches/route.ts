import { withRoute } from "@/server/http/route";
import { getPublicCoach } from "@/server/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // per-request DB lookup

/** Public coach directory shown on the landing page. No auth. */
export const GET = withRoute(() => getPublicCoach().listPublic(), { public: true });

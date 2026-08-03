/**
 * One-time repair for links stored before `externalUrl()` existed.
 *
 * Until that validator landed, `socialLinks[].url` and `Exercise.videoUrl` were
 * plain strings, so a coach could save `javascript:…` and it would be rendered
 * as an `<a href>` on the public coach page, in the student's viewer and in the
 * PDF. New writes are rejected now; these are the rows already in the table.
 *
 * Scheme-less values are repaired the same way the validator repairs them
 * ("instagram.com/x" → "https://instagram.com/x"). Anything that is still not an
 * http(s) URL is dropped rather than guessed at — a link nobody can follow is
 * better than one that runs.
 *
 * Idempotent: a clean database produces no writes. Reports before it changes
 * anything, so a dry run is just Ctrl-C at the prompt.
 *
 *   docker compose exec app npx ts-node scripts/sanitize-stored-urls.ts
 *   docker compose exec app npx ts-node scripts/sanitize-stored-urls.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import { externalUrl } from "../src/server/utils/url";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();
const url = externalUrl();

/** The validator's own verdict — never a second, drifting implementation. */
function repair(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const result = url.safeParse(raw);
  return result.success ? result.data : null;
}

interface SocialLink {
  type: string;
  label?: string;
  url: string;
}

async function sanitizeSocialLinks(): Promise<number> {
  const profiles = await prisma.coachProfile.findMany({
    select: { userId: true, handle: true, socialLinks: true },
  });

  let changed = 0;
  for (const profile of profiles) {
    const links = profile.socialLinks as unknown as SocialLink[] | null;
    if (!Array.isArray(links) || links.length === 0) continue;

    const kept: SocialLink[] = [];
    for (const link of links) {
      const repaired = repair(link?.url);
      if (repaired === null) {
        console.log(`  drop  /c/${profile.handle ?? profile.userId}: ${link?.url}`);
        continue;
      }
      if (repaired !== link.url) {
        console.log(`  fix   /c/${profile.handle ?? profile.userId}: ${link.url} → ${repaired}`);
      }
      kept.push({ ...link, url: repaired });
    }

    if (kept.length === links.length && kept.every((l, i) => l.url === links[i].url)) continue;
    changed++;
    if (APPLY) {
      await prisma.coachProfile.update({
        where: { userId: profile.userId },
        data: { socialLinks: kept as unknown as object[] },
      });
    }
  }
  return changed;
}

async function sanitizeVideoUrls(): Promise<number> {
  const exercises = await prisma.exercise.findMany({
    where: { videoUrl: { not: null } },
    select: { id: true, name: true, videoUrl: true },
  });

  let changed = 0;
  for (const exercise of exercises) {
    const repaired = repair(exercise.videoUrl);
    if (repaired === exercise.videoUrl) continue;
    changed++;
    console.log(
      repaired === null
        ? `  drop  exercise "${exercise.name}": ${exercise.videoUrl}`
        : `  fix   exercise "${exercise.name}": ${exercise.videoUrl} → ${repaired}`,
    );
    if (APPLY) {
      await prisma.exercise.update({
        where: { id: exercise.id },
        data: { videoUrl: repaired },
      });
    }
  }
  return changed;
}

async function main() {
  console.log(APPLY ? "Applying changes.\n" : "Dry run — pass --apply to write.\n");

  console.log("Coach social links:");
  const links = await sanitizeSocialLinks();
  console.log(`  ${links} profile(s) affected\n`);

  console.log("Exercise video links:");
  const videos = await sanitizeVideoUrls();
  console.log(`  ${videos} exercise(s) affected\n`);

  if (!APPLY && links + videos > 0) {
    console.log("Re-run with --apply to persist the changes above.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

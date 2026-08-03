/**
 * Server-rendered HTML for the program PDF. Kept dependency-free (plain string)
 * so Puppeteer can render it directly — and so the same markup can be served to a
 * browser to print when the host has no Chromium (see `print-response.ts`).
 *
 * Supersets are visually boxed; direction, labels and the date's calendar all
 * switch by locale. GIFs are intentionally omitted (print-oriented).
 */

interface PdfExercise {
  sets: number;
  reps: string;
  notes: string | null;
  supersetGroupId: string | null;
  exercise: {
    name: string;
    description: string | null;
    videoUrl: string | null;
  };
}
interface PdfDay {
  dayIndex: number;
  title: string | null;
  exercises: PdfExercise[];
}
export interface PdfProgram {
  name: string;
  daysPerWeek: number;
  studentAge: number | null;
  studentHeightCm: number | null;
  studentWeightKg: number | null;
  student: { phone: string | null; email: string | null };
  days: PdfDay[];
}

type Locale = "fa" | "en";

const LABELS: Record<Locale, Record<string, string>> = {
  fa: {
    coach: "مربی",
    student: "شاگرد",
    age: "سن",
    height: "قد",
    weight: "وزن",
    day: "روز",
    superset: "سوپرست",
    sets: "ست",
    reps: "تکرار",
    generated: "تاریخ تولید",
    empty: "تمرینی ثبت نشده",
    daysPerWeek: "روز در هفته",
    cm: "سانتی‌متر",
    kg: "کیلوگرم",
    watch: "ویدیوی آموزشی",
    note: "یادداشت مربی",
    movements: "حرکت",
    madeWith: "ساخته‌شده با fitlo",
  },
  en: {
    coach: "Coach",
    student: "Student",
    age: "Age",
    height: "Height",
    weight: "Weight",
    day: "Day",
    superset: "Superset",
    sets: "Sets",
    reps: "Reps",
    generated: "Generated",
    empty: "No exercises",
    daysPerWeek: "days/week",
    cm: "cm",
    kg: "kg",
    watch: "Demo video",
    note: "Coach's note",
    movements: "movements",
    madeWith: "Made with fitlo",
  },
};

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The generation date in the reader's own calendar: Jalali for Persian, Gregorian
 * for English. `Intl` does this natively — `fa-IR` defaults to the Persian
 * calendar — so no date library is needed for the one date this document shows.
 */
function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * ASCII digits → Persian-Indic, for `fa` only.
 *
 * Without this the document mixes scripts: `Intl` writes the date as ۷ مرداد ۱۴۰۵
 * while every set count, age and day number stays 4, 27, 1. Applied to the free-text
 * `reps` too, which is why it rewrites digits in place instead of formatting a
 * number — "8-12" has to survive as "۸-۱۲".
 */
function digits(value: string | number, locale: Locale): string {
  const s = String(value);
  return locale === "fa"
    ? s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
    : s;
}

interface Row {
  type: "single" | "superset";
  items: PdfExercise[];
}

function toRows(exercises: PdfExercise[]): Row[] {
  const rows: Row[] = [];
  const groups = new Map<string, Row>();
  for (const ex of exercises) {
    if (ex.supersetGroupId) {
      let row = groups.get(ex.supersetGroupId);
      if (!row) {
        row = { type: "superset", items: [] };
        groups.set(ex.supersetGroupId, row);
        rows.push(row);
      }
      row.items.push(ex);
    } else {
      rows.push({ type: "single", items: [ex] });
    }
  }
  // A "superset" of one collapses to a single visual row.
  return rows.map((r) =>
    r.items.length === 1 ? { type: "single", items: r.items } : r,
  );
}

/**
 * One exercise. `index` numbers it within its day so a coach and student reading
 * over the phone can say "number four" instead of describing the movement.
 * Supersets pass `null`: their members are lettered by CSS instead, because the
 * pair is one step of the day, not two.
 */
function itemHtml(
  ex: PdfExercise,
  t: Record<string, string>,
  locale: Locale,
  index: number | null,
): string {
  const desc = ex.exercise.description
    ? `<p class="desc">${esc(ex.exercise.description)}</p>`
    : "";
  const notes = ex.notes
    ? `<p class="notes"><span class="tag">${t.note}</span>${esc(ex.notes)}</p>`
    : "";
  // The bare URL used to be printed next to the link. On paper it was a line of
  // unreadable noise, and on screen the link already carries it.
  const video = ex.exercise.videoUrl
    ? `<p class="video"><a href="${esc(ex.exercise.videoUrl)}">${t.watch}</a></p>`
    : "";
  const num =
    index !== null ? `<span class="num">${digits(index, locale)}</span>` : "";
  return `
    <div class="item">
      <div class="item-head">
        ${num}
        <span class="name">${esc(ex.exercise.name)}</span>
        <span class="setsreps">${digits(ex.sets, locale)} × <bdi>${digits(esc(ex.reps), locale)}</bdi></span>
      </div>
      ${desc}${video}${notes}
    </div>`;
}

/** Brand palette, sampled from the fitlo logo. */
const BRAND = { navy: "#003169", blue: "#0068C7" } as const;

/**
 * Inlined logo images. Puppeteer renders this HTML via `setContent`, which has no
 * base URL — a relative `/brand/logo.png` would never load, so the caller passes
 * base64 data URIs instead.
 */
export interface PdfLogo {
  mark: string;
  wordmark: string;
}

export function renderProgramHtml(
  program: PdfProgram,
  coachName: string,
  locale: Locale = "fa",
  logo?: PdfLogo,
  /** Injectable so the output is deterministic under test. */
  now: Date = new Date(),
): string {
  const t = LABELS[locale];
  const dir = locale === "en" ? "ltr" : "rtl";
  const contact = program.student.email ?? program.student.phone ?? "";

  const stats = [
    program.studentAge != null
      ? `${t.age}: ${digits(program.studentAge, locale)}`
      : null,
    program.studentHeightCm != null
      ? `${t.height}: ${digits(program.studentHeightCm, locale)} ${t.cm}`
      : null,
    program.studentWeightKg != null
      ? `${t.weight}: ${digits(program.studentWeightKg, locale)} ${t.kg}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const daysHtml = program.days
    .map((day) => {
      const rows = toRows(day.exercises);
      // Numbering counts visual steps, so a superset takes one slot, not two.
      let step = 0;
      const body = rows.length
        ? rows
            .map((row) => {
              step += 1;
              return row.type === "superset"
                ? `<div class="superset">
                     <div class="superset-label"><span class="num">${digits(step, locale)}</span>${t.superset}</div>
                     ${row.items.map((it) => itemHtml(it, t, locale, null)).join("")}
                   </div>`
                : itemHtml(row.items[0], t, locale, step);
            })
            .join("")
        : `<p class="empty">${t.empty}</p>`;
      const title = day.title ? `<span class="day-title">${esc(day.title)}</span>` : "";
      const count = day.exercises.length;
      return `<section class="day">
        <h2>
          <span class="day-no">${t.day} ${digits(day.dayIndex, locale)}</span>
          ${title}
          <span class="day-count">${digits(count, locale)} ${t.movements}</span>
        </h2>
        ${body}
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Vazirmatn, "Noto Naskh Arabic", "Noto Sans Arabic", "Liberation Sans", Arial, sans-serif;
    color: #0f172a; background: #fff; margin: 0; padding: 28px 30px; font-size: 13px; line-height: 1.6;
  }

  /* ── header ── */
  header { border-bottom: 3px solid ${BRAND.blue}; padding-bottom: 12px; margin-bottom: 18px; }
  .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
  /* Tight gap: the mark is the "f", the wordmark is "itlo" — together they read fitlo. */
  .brand { display: flex; align-items: center; gap: 3px; direction: ltr; }
  .brand img.mark { height: 24px; width: auto; }
  .brand img.word { height: 13px; width: auto; }
  .generated { font-size: 10.5px; color: #64748b; text-align: ${locale === "fa" ? "left" : "right"}; white-space: nowrap; }
  .generated strong { display: block; color: #334155; font-weight: 600; }
  h1 { font-size: 22px; margin: 0 0 6px; color: ${BRAND.navy}; }
  .meta { color: #475569; font-size: 12px; display: flex; flex-wrap: wrap; gap: 2px 10px; }
  .meta .sep { color: #cbd5e1; }
  .meta strong { color: #0f172a; }

  /* ── day ── */
  .day { margin-bottom: 16px; break-inside: avoid; }
  .day h2 {
    font-size: 14px; color: ${BRAND.navy}; margin: 0 0 8px;
    background: #eff6ff; padding: 7px 11px; border-radius: 6px;
    display: flex; align-items: baseline; gap: 8px;
  }
  .day-no { font-weight: 700; }
  .day-title { font-weight: 500; color: #334155; }
  .day-title::before { content: "—"; color: #cbd5e1; margin-inline-end: 8px; }
  .day-count { margin-inline-start: auto; font-size: 11px; font-weight: 500; color: #64748b; }

  /* ── exercise ── */
  .item { padding: 8px 11px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 6px; break-inside: avoid; }
  .item-head { display: flex; align-items: baseline; gap: 8px; }
  .num {
    flex: none; min-width: 18px; height: 18px; border-radius: 4px;
    background: ${BRAND.blue}; color: #fff; font-size: 10.5px; font-weight: 700;
    display: inline-flex; align-items: center; justify-content: center; padding: 0 4px;
    align-self: center;
  }
  .name { font-weight: 600; }
  .setsreps { margin-inline-start: auto; font-weight: 700; color: ${BRAND.blue}; white-space: nowrap; }

  /* The description is the whole point of a written program — it is what the
     student reads when the coach is not there. Give it real contrast, not the
     muted grey it used to share with metadata. */
  .desc {
    margin: 6px 0 0; color: #334155; font-size: 12px; line-height: 1.65;
    border-inline-start: 2px solid #dbeafe; padding-inline-start: 8px;
    white-space: pre-line;
  }
  .video { margin: 5px 0 0; font-size: 11px; }
  .video a { color: ${BRAND.blue}; text-decoration: none; font-weight: 600; }
  .video a::before { content: "▶ "; }
  .notes { margin: 5px 0 0; color: #475569; font-size: 11px; }
  .tag {
    display: inline-block; margin-inline-end: 6px; padding: 0 5px; border-radius: 3px;
    background: #f1f5f9; color: #64748b; font-size: 10px; font-weight: 600;
  }

  /* ── superset ── */
  .superset {
    border: 1.5px solid #93c5fd; background: #f0f7ff; border-radius: 8px;
    padding: 8px 8px 2px; margin-bottom: 8px; break-inside: avoid;
  }
  .superset-label {
    font-size: 11px; font-weight: 700; color: ${BRAND.blue}; margin-bottom: 6px;
    display: flex; align-items: center; gap: 6px;
  }
  .superset .item { background: #fff; }
  /* Members are lettered, not numbered: the pair is one step of the day. */
  .superset .item .item-head::before {
    content: counter(ss, upper-alpha);
    counter-increment: ss;
    flex: none; color: ${BRAND.blue}; font-weight: 700; font-size: 11px; min-width: 12px;
  }
  .superset { counter-reset: ss; }
  .empty { color: #94a3b8; font-style: italic; }

  /* ── footer ── */
  footer {
    margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0;
    text-align: center; font-size: 10px; color: #94a3b8;
  }
</style>
</head>
<body>
  <header>
    <div class="top">
      ${
        logo
          ? `<div class="brand">
               <img class="mark" src="${logo.mark}" alt="" />
               <img class="word" src="${logo.wordmark}" alt="fitlo" />
             </div>`
          : "<span></span>"
      }
      <div class="generated">
        <strong>${t.generated}</strong>
        ${esc(formatDate(now, locale))}
      </div>
    </div>
    <h1>${esc(program.name)}</h1>
    <div class="meta">
      <span><strong>${t.coach}:</strong> ${esc(coachName)}</span>
      <span class="sep">·</span>
      <!-- bdi: a phone like +98912… is a left-to-right run inside a right-to-left
           line, and without isolation the bidi algorithm moves the "+" to the
           wrong end — it printed as 98912…0000+ -->
      <span><strong>${t.student}:</strong> <bdi dir="ltr">${esc(contact)}</bdi></span>
      ${stats ? `<span class="sep">·</span><span>${esc(stats)}</span>` : ""}
      <span class="sep">·</span>
      <span>${digits(program.daysPerWeek, locale)} ${t.daysPerWeek}</span>
    </div>
  </header>
  ${daysHtml}
  <footer>${t.madeWith}</footer>
</body>
</html>`;
}

/**
 * Server-rendered HTML for the program PDF. Kept dependency-free (plain string)
 * so Puppeteer can render it directly. Supersets are visually boxed; direction
 * and labels switch by locale. GIFs are intentionally omitted (print-oriented).
 */

interface PdfExercise {
  sets: number;
  reps: string;
  notes: string | null;
  supersetGroupId: string | null;
  exercise: { name: string; description: string | null; videoUrl: string | null };
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

type Locale = 'fa' | 'en';

const LABELS: Record<Locale, Record<string, string>> = {
  fa: {
    coach: 'مربی',
    student: 'شاگرد',
    age: 'سن',
    height: 'قد',
    weight: 'وزن',
    day: 'روز',
    superset: 'سوپرست',
    sets: 'ست',
    reps: 'تکرار',
    generated: 'تاریخ تولید',
    empty: 'تمرینی ثبت نشده',
    daysPerWeek: 'روز در هفته',
    watch: 'مشاهده تمرین',
  },
  en: {
    coach: 'Coach',
    student: 'Student',
    age: 'Age',
    height: 'Height',
    weight: 'Weight',
    day: 'Day',
    superset: 'Superset',
    sets: 'Sets',
    reps: 'Reps',
    generated: 'Generated',
    empty: 'No exercises',
    daysPerWeek: 'days/week',
    watch: 'Watch',
  },
};

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Row {
  type: 'single' | 'superset';
  items: PdfExercise[];
}

function toRows(exercises: PdfExercise[]): Row[] {
  const rows: Row[] = [];
  const groups = new Map<string, Row>();
  for (const ex of exercises) {
    if (ex.supersetGroupId) {
      let row = groups.get(ex.supersetGroupId);
      if (!row) {
        row = { type: 'superset', items: [] };
        groups.set(ex.supersetGroupId, row);
        rows.push(row);
      }
      row.items.push(ex);
    } else {
      rows.push({ type: 'single', items: [ex] });
    }
  }
  // A "superset" of one collapses to a single visual row.
  return rows.map((r) => (r.items.length === 1 ? { type: 'single', items: r.items } : r));
}

function itemHtml(ex: PdfExercise, t: Record<string, string>): string {
  const desc = ex.exercise.description ? `<p class="desc">${esc(ex.exercise.description)}</p>` : '';
  const notes = ex.notes ? `<p class="notes">${esc(ex.notes)}</p>` : '';
  const video = ex.exercise.videoUrl
    ? `<p class="video">🎥 <a href="${esc(ex.exercise.videoUrl)}">${t.watch}</a> — <span dir="ltr">${esc(ex.exercise.videoUrl)}</span></p>`
    : '';
  return `
    <div class="item">
      <div class="item-head">
        <span class="name">${esc(ex.exercise.name)}</span>
        <span class="setsreps">${ex.sets} × ${esc(ex.reps)}</span>
      </div>
      ${desc}${video}${notes}
    </div>`;
}

export function renderProgramHtml(program: PdfProgram, coachName: string, locale: Locale = 'fa'): string {
  const t = LABELS[locale];
  const dir = locale === 'en' ? 'ltr' : 'rtl';
  const contact = program.student.email ?? program.student.phone ?? '';

  const stats = [
    program.studentAge != null ? `${t.age}: ${program.studentAge}` : null,
    program.studentHeightCm != null ? `${t.height}: ${program.studentHeightCm}cm` : null,
    program.studentWeightKg != null ? `${t.weight}: ${program.studentWeightKg}kg` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const daysHtml = program.days
    .map((day) => {
      const rows = toRows(day.exercises);
      const body = rows.length
        ? rows
            .map((row) =>
              row.type === 'superset'
                ? `<div class="superset"><div class="superset-label">${t.superset}</div>${row.items
                    .map((it) => itemHtml(it, t))
                    .join('')}</div>`
                : itemHtml(row.items[0], t),
            )
            .join('')
        : `<p class="empty">${t.empty}</p>`;
      const title = day.title ? ` — ${esc(day.title)}` : '';
      return `<section class="day"><h2>${t.day} ${day.dayIndex}${title}</h2>${body}</section>`;
    })
    .join('');

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
  header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 18px; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1e3a8a; }
  .meta { color: #475569; font-size: 12px; display: flex; flex-wrap: wrap; gap: 2px 10px; }
  .meta .sep { color: #cbd5e1; }
  .meta strong { color: #0f172a; }
  .day { margin-bottom: 18px; break-inside: avoid; }
  .day h2 {
    font-size: 15px; color: #1d4ed8; margin: 0 0 8px;
    background: #eff6ff; padding: 6px 10px; border-radius: 6px;
  }
  .item { padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 6px; break-inside: avoid; }
  .item-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .name { font-weight: 600; }
  .setsreps { font-weight: 700; color: #2563eb; white-space: nowrap; }
  .desc { margin: 4px 0 0; color: #64748b; font-size: 12px; }
  .video { margin: 3px 0 0; font-size: 11px; }
  .video a { color: #2563eb; text-decoration: none; }
  .notes { margin: 2px 0 0; color: #94a3b8; font-size: 11px; font-style: italic; }
  .superset {
    border: 1.5px solid #93c5fd; background: #f0f7ff; border-radius: 8px;
    padding: 8px 8px 2px; margin-bottom: 8px; break-inside: avoid;
  }
  .superset-label { font-size: 11px; font-weight: 700; color: #2563eb; margin-bottom: 6px; }
  .superset .item { background: #fff; }
  .empty { color: #94a3b8; font-style: italic; }
</style>
</head>
<body>
  <header>
    <h1>${esc(program.name)}</h1>
    <div class="meta">
      <span><strong>${t.coach}:</strong> ${esc(coachName)}</span>
      <span class="sep">·</span>
      <span><strong>${t.student}:</strong> ${esc(contact)}</span>
      ${stats ? `<span class="sep">·</span><span>${esc(stats)}</span>` : ''}
      <span class="sep">·</span>
      <span>${program.daysPerWeek} ${t.daysPerWeek}</span>
    </div>
  </header>
  ${daysHtml}
</body>
</html>`;
}

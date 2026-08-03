import { renderProgramHtml, type PdfProgram } from './template';

const program: PdfProgram = {
  name: 'Test Program',
  daysPerWeek: 1,
  studentAge: 27,
  studentHeightCm: 181,
  studentWeightKg: 78.5,
  student: { phone: '+989120000000', email: null },
  days: [
    {
      dayIndex: 1,
      title: 'Day 1',
      exercises: [
        {
          sets: 3,
          reps: '8-12',
          notes: 'Add 2.5kg next week',
          order: 0,
          supersetGroupId: null,
          supersetOrder: null,
          exercise: { name: 'Deadlift', description: 'Keep your back neutral', videoUrl: 'https://youtu.be/abc123' },
        },
      ],
    },
  ],
} as unknown as PdfProgram;

/** Fixed so the date assertions don't drift with the clock. */
const AT = new Date('2026-07-29T09:00:00Z');

describe('renderProgramHtml', () => {
  it('includes the exercise description, the coach note and the video link', () => {
    const html = renderProgramHtml(program, 'Coach Reza', 'en', undefined, AT);
    expect(html).toContain('Keep your back neutral');
    expect(html).toContain('Add 2.5kg next week');
    expect(html).toContain('https://youtu.be/abc123');
    expect(html).toContain('Demo video');
  });

  it('links the video without printing the raw URL as body text', () => {
    const html = renderProgramHtml(program, 'Coach', 'en', undefined, AT);
    // The href still carries it; what was removed is the unreadable copy beside it.
    expect(html).toContain('href="https://youtu.be/abc123"');
    expect(html).not.toContain('>https://youtu.be/abc123<');
  });

  it('omits the video block when there is no link', () => {
    const noVideo = JSON.parse(JSON.stringify(program));
    noVideo.days[0].exercises[0].exercise.videoUrl = null;
    const html = renderProgramHtml(noVideo, 'Coach', 'fa', undefined, AT);
    expect(html).not.toContain('youtu.be');
  });

  it('dates the document in each locale calendar', () => {
    expect(renderProgramHtml(program, 'C', 'fa', undefined, AT)).toContain('۷ مرداد ۱۴۰۵');
    expect(renderProgramHtml(program, 'C', 'en', undefined, AT)).toContain('29 July 2026');
  });

  it('writes Persian digits throughout the fa document, not just the date', () => {
    const html = renderProgramHtml(program, 'Coach', 'fa', undefined, AT);
    expect(html).toContain('۳ × <bdi>۸-۱۲</bdi>'); // sets × reps
    expect(html).toContain('روز ۱');
    expect(html).toContain('سن: ۲۷');
    expect(html).toContain('۱۸۱ سانتی‌متر');
    // …and leaves the English document in ASCII.
    const en = renderProgramHtml(program, 'Coach', 'en', undefined, AT);
    expect(en).toContain('Day 1');
    expect(en).toContain('Age: 27');
  });

  it('isolates the phone number so bidi cannot move the leading +', () => {
    const html = renderProgramHtml(program, 'Coach', 'fa', undefined, AT);
    expect(html).toContain('<bdi dir="ltr">+989120000000</bdi>');
  });

  it('numbers a superset as one step and letters its members', () => {
    const withSuperset = JSON.parse(JSON.stringify(program));
    const [first] = withSuperset.days[0].exercises;
    withSuperset.days[0].exercises = [
      first,
      { ...first, supersetGroupId: 'g1', exercise: { ...first.exercise, name: 'Dip' } },
      { ...first, supersetGroupId: 'g1', exercise: { ...first.exercise, name: 'Pushdown' } },
    ];
    const html = renderProgramHtml(withSuperset, 'Coach', 'en', undefined, AT);
    // Step 1 is the single exercise, step 2 is the whole superset — not 2 and 3.
    expect(html).toContain('<span class="num">2</span>Superset');
    expect(html).toContain('2 movements'.replace('2', '3')); // all three still counted
  });

  it('renders every label in both locales (no undefined leaking into the page)', () => {
    for (const locale of ['fa', 'en'] as const) {
      expect(renderProgramHtml(program, 'Coach', locale, undefined, AT)).not.toContain('undefined');
    }
  });
});

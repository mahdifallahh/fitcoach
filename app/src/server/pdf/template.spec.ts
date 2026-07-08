import { renderProgramHtml, type PdfProgram } from './template';

const program: PdfProgram = {
  name: 'Test Program',
  daysPerWeek: 1,
  student: { phone: '09120000000', email: null },
  days: [
    {
      dayIndex: 1,
      title: 'Day 1',
      exercises: [
        {
          sets: 3,
          reps: '5',
          notes: null,
          order: 0,
          supersetGroupId: null,
          supersetOrder: null,
          exercise: { name: 'Deadlift', description: 'Keep your back neutral', videoUrl: 'https://youtu.be/abc123' },
        },
      ],
    },
  ],
} as unknown as PdfProgram;

describe('renderProgramHtml', () => {
  it('includes the exercise description and the video link when present', () => {
    const html = renderProgramHtml(program, 'Coach Reza', 'en');
    expect(html).toContain('Keep your back neutral');
    expect(html).toContain('https://youtu.be/abc123');
    expect(html).toContain('Watch');
  });

  it('omits the video block when there is no link', () => {
    const noVideo = JSON.parse(JSON.stringify(program));
    noVideo.days[0].exercises[0].exercise.videoUrl = null;
    const html = renderProgramHtml(noVideo, 'Coach', 'fa');
    expect(html).not.toContain('youtu.be');
  });
});

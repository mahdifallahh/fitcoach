import { ExercisesService } from './service';

const PRESET = [
  { id: '1', name: 'Barbell Bench Press', categoryId: 'c1', category: { id: 'c1', name: 'Chest' }, gifUrl: null },
  { id: '2', name: 'Back Squat', categoryId: 'c2', category: { id: 'c2', name: 'Legs' }, gifUrl: null },
  { id: '3', name: 'Incline Press', categoryId: 'c1', category: { id: 'c1', name: 'Chest' }, gifUrl: null },
];

describe('ExercisesService', () => {
  let prisma: any;
  let storage: any;
  let service: ExercisesService;

  beforeEach(() => {
    prisma = {
      exercise: {
        findMany: jest.fn().mockResolvedValue(PRESET),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'new' }),
      },
      exerciseCategory: { findFirst: jest.fn() },
    };
    storage = { createUploadTarget: jest.fn(), deleteByPublicUrl: jest.fn() };
    service = new ExercisesService(prisma, storage);
  });

  it('filters by case-insensitive name search', async () => {
    const res = await service.list('coach1', { search: 'press' });
    expect(res.map((e) => e.id)).toEqual(['1', '3']);
  });

  it('matches the category name in search too', async () => {
    const res = await service.list('coach1', { search: 'chest' });
    expect(res.map((e) => e.id)).toEqual(['1', '3']);
  });

  it('filters by categoryId', async () => {
    const res = await service.list('coach1', { categoryId: 'c2' });
    expect(res.map((e) => e.id)).toEqual(['2']);
  });

  it('returns everything with no filters', async () => {
    const res = await service.list('coach1', {});
    expect(res).toHaveLength(3);
  });

  it('persists a new exercise on create', async () => {
    await service.create('coach1', { name: 'Deadlift' });
    expect(prisma.exercise.create).toHaveBeenCalled();
  });

  it('rejects a category not owned by the coach on create', async () => {
    prisma.exerciseCategory.findFirst.mockResolvedValue(null);
    await expect(service.create('coach1', { name: 'X', categoryId: 'nope' })).rejects.toThrow();
    expect(prisma.exercise.create).not.toHaveBeenCalled();
  });
});

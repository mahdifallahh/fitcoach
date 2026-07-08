import { ProgramStatus } from '@prisma/client';
import { ProgramsService } from './service';
import { BadRequestException } from '../http/errors';
import type { CreateProgramDto } from './schemas';

function baseDto(): CreateProgramDto {
  return {
    studentContact: '09120000000',
    name: 'Hypertrophy',
    daysPerWeek: 1,
    age: 28,
    days: [
      {
        dayIndex: 1,
        title: 'Push',
        exercises: [
          { exerciseId: 'e1', sets: 4, reps: '8-12', order: 0 },
          // a superset of two exercises sharing order 1
          { exerciseId: 'e2', sets: 3, reps: '12', order: 1, supersetGroupId: 'g1', supersetOrder: 0 },
          { exerciseId: 'e3', sets: 3, reps: '12', order: 1, supersetGroupId: 'g1', supersetOrder: 1 },
        ],
      },
    ],
  };
}

describe('ProgramsService.create', () => {
  let prisma: any;
  let students: any;
  let service: ProgramsService;
  let tx: any;

  beforeEach(() => {
    tx = { program: { create: jest.fn().mockResolvedValue({ id: 'p1' }) } };
    prisma = {
      exercise: { count: jest.fn() },
      program: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', days: [] }) },
      $transaction: jest.fn((cb: any) => cb(tx)),
    };
    students = { findOrCreateForProgram: jest.fn().mockResolvedValue({ id: 's1', age: 28 }) };
    service = new ProgramsService(prisma, students);
  });

  it('rejects exercises not owned by the coach', async () => {
    prisma.exercise.count.mockResolvedValue(2); // only 2 of 3 unique ids owned
    await expect(service.create('coach1', baseDto())).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a program with nested days, supersets and student link', async () => {
    prisma.exercise.count.mockResolvedValue(3); // all 3 owned
    await service.create('coach1', baseDto());

    expect(students.findOrCreateForProgram).toHaveBeenCalledWith(
      'coach1',
      '09120000000',
      { age: 28, heightCm: undefined, weightKg: undefined },
      tx,
    );
    const data = tx.program.create.mock.calls[0][0].data;
    expect(data.studentProfileId).toBe('s1');
    expect(data.status).toBe(ProgramStatus.DRAFT);
    const day = data.days.create[0];
    expect(day.dayIndex).toBe(1);
    const ex = day.exercises.create;
    expect(ex).toHaveLength(3);
    // superset rows share order + supersetGroupId
    expect(ex[1].order).toBe(1);
    expect(ex[2].order).toBe(1);
    expect(ex[1].supersetGroupId).toBe('g1');
    expect(ex[2].supersetGroupId).toBe('g1');
  });
});

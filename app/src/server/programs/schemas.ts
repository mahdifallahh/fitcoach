import { z } from 'zod';
import { ProgramStatus } from '@prisma/client';

export const programExerciseInputSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(50),
  reps: z.string().min(1).max(40),
  notes: z.string().max(500).optional(),
  order: z.number().int().min(0),
  supersetGroupId: z.string().max(64).optional(),
  supersetOrder: z.number().int().min(0).optional(),
});

export const programDayInputSchema = z.object({
  dayIndex: z.number().int().min(1),
  title: z.string().max(120).optional(),
  exercises: z.array(programExerciseInputSchema).max(100),
});

const studentStats = {
  age: z.number().int().min(1).max(120).optional(),
  heightCm: z.number().min(50).max(300).optional(),
  weightKg: z.number().min(10).max(400).optional(),
};

export const createProgramSchema = z.object({
  ...studentStats,
  studentContact: z.string().min(3),
  name: z.string().min(1).max(120),
  daysPerWeek: z.number().int().min(1).max(14),
  status: z.nativeEnum(ProgramStatus).optional(),
  days: z.array(programDayInputSchema).max(14),
  requestId: z.string().optional(),
});

export const updateProgramSchema = z.object({
  ...studentStats,
  name: z.string().min(1).max(120).optional(),
  daysPerWeek: z.number().int().min(1).max(14).optional(),
  status: z.nativeEnum(ProgramStatus).optional(),
  days: z.array(programDayInputSchema).max(14).optional(),
});

export const setStatusSchema = z.object({ status: z.nativeEnum(ProgramStatus) });

export type ProgramDayInputDto = z.infer<typeof programDayInputSchema>;
export type CreateProgramDto = z.infer<typeof createProgramSchema>;
export type UpdateProgramDto = z.infer<typeof updateProgramSchema>;

import { z } from "zod";
import { ProgramStatus } from "@prisma/client";
import {
  programDayInputSchema,
  programExerciseInputSchema,
} from "../programs/schemas";

// Templates reuse the exact day/exercise/superset shape of programs — only the
// student-specific meta differs (a template has none).
export { programDayInputSchema, programExerciseInputSchema };

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  daysPerWeek: z.number().int().min(1).max(14),
  days: z.array(programDayInputSchema).max(14),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  daysPerWeek: z.number().int().min(1).max(14).optional(),
  days: z.array(programDayInputSchema).max(14).optional(),
});

export const listTemplatesQuerySchema = z.object({
  search: z.string().max(120).optional(),
});

// Materialize a program from a template for one student. Mirrors the student
// meta accepted by the program builder; `name` optionally overrides the
// template's name for this particular student.
export const assignTemplateSchema = z.object({
  studentContact: z.string().min(3),
  name: z.string().min(1).max(120).optional(),
  age: z.number().int().min(1).max(120).optional(),
  heightCm: z.number().min(50).max(300).optional(),
  weightKg: z.number().min(10).max(400).optional(),
  status: z.nativeEnum(ProgramStatus).optional(),
  requestId: z.string().optional(),
});

export type CreateTemplateDto = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateDto = z.infer<typeof updateTemplateSchema>;
export type ListTemplatesQueryDto = z.infer<typeof listTemplatesQuerySchema>;
export type AssignTemplateDto = z.infer<typeof assignTemplateSchema>;

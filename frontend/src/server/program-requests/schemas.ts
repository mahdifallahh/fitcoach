import { z } from 'zod';

export const createProgramRequestSchema = z.object({
  handle: z.string().min(1).max(40),
  fullName: z.string().min(1).max(120),
  age: z.number().int().min(5).max(120).optional(),
  weightKg: z.number().min(20).max(400).optional(),
  heightCm: z.number().min(80).max(260).optional(),
  trainingYears: z.number().int().min(0).max(80).optional(),
  trainingMonths: z.number().int().min(0).max(11).optional(),
  medicalHistory: z.string().max(2000).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  photoFrontKey: z.string().max(200).optional(),
  photoSideKey: z.string().max(200).optional(),
  photoBackKey: z.string().max(200).optional(),
  receiptKey: z.string().max(200).optional(),
});

export const updateRequestStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
  declineReason: z.string().max(1000).optional(),
});

export type CreateProgramRequestDto = z.infer<typeof createProgramRequestSchema>;
export type UpdateRequestStatusDto = z.infer<typeof updateRequestStatusSchema>;

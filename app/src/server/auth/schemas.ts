import { z } from "zod";

/** Shared password policy — enforced on the server, mirrored in the UI form. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const checkIdentifierSchema = z.object({
  identifier: z.string().min(1),
});

export const passwordLoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1), // never reveal the policy on login
});

export const setPasswordSchema = z.object({
  password: passwordSchema,
});

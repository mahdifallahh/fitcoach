import type { FieldError } from "react-hook-form";
import { fieldErrorText } from "@/lib/form-errors";

/** Inline red text under a form field, shown when RHF/Zod validation rejects it. */
export function FieldErrorText({
  error,
  t,
}: {
  error?: FieldError;
  t: (key: "fieldRequired" | "fieldInvalid") => string;
}) {
  const message = fieldErrorText(t, error);
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

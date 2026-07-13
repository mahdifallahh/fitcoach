import type { FieldError } from 'react-hook-form';

type FormErrorKey = 'fieldRequired' | 'fieldInvalid';

/**
 * Maps an RHF/Zod field error to a localized, generic reason. Zod's own
 * `.message` text is English-only and not meant for end users, so we bucket
 * every validation failure into "required" vs. "invalid format" instead of
 * surfacing the raw message.
 */
export function fieldErrorText(t: (key: FormErrorKey) => string, error?: Pick<FieldError, 'type'>): string | undefined {
  if (!error) return undefined;
  if (error.type === 'too_small' || error.type === 'invalid_type' || error.type === 'required') {
    return t('fieldRequired');
  }
  return t('fieldInvalid');
}

import { SetMetadata } from '@nestjs/common';

export const REQUIRES_SUB_KEY = 'requiresActiveSubscription';

/**
 * Marks a write endpoint that requires an active (trial or paid) coach
 * subscription. Reads stay open so an expired coach keeps view-only access.
 */
export const RequiresActiveSubscription = () => SetMetadata(REQUIRES_SUB_KEY, true);

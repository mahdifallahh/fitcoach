import { api } from './client';
import type { BillingSummary, PaymentGateway, SubscriptionPlan } from './types';

export const billingApi = {
  get: () => api.get<BillingSummary>('/coach/billing'),
  checkout: (plan: SubscriptionPlan, gateway: PaymentGateway, locale: 'fa' | 'en') =>
    api.post<{ redirectUrl: string }>('/coach/billing/checkout', { plan, gateway, locale }),
  devComplete: (paymentId: string) =>
    api.post<unknown>(`/coach/billing/dev/complete/${paymentId}`),
};

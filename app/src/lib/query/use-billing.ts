'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '@/lib/api/billing';
import type { PaymentGateway, SubscriptionPlan } from '@/lib/api/types';
import { ME_QUERY_KEY } from './use-auth';

export const BILLING_KEY = ['coach', 'billing'] as const;

export function useBilling() {
  return useQuery({ queryKey: BILLING_KEY, queryFn: () => billingApi.get() });
}

export function useActivateTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.activateTrial(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BILLING_KEY });
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: ({ plan, gateway, locale }: { plan: SubscriptionPlan; gateway: PaymentGateway; locale: 'fa' | 'en' }) =>
      billingApi.checkout(plan, gateway, locale),
  });
}

export function useDevComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => billingApi.devComplete(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BILLING_KEY });
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

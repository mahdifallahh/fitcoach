import { FullIntlProvider } from '@/components/providers/full-intl-provider';

export default function CoachSegmentLayout({ children }: { children: React.ReactNode }) {
  return <FullIntlProvider>{children}</FullIntlProvider>;
}

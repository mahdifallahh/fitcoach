import { FullIntlProvider } from '@/components/providers/full-intl-provider';

export default function StudentSegmentLayout({ children }: { children: React.ReactNode }) {
  return <FullIntlProvider>{children}</FullIntlProvider>;
}

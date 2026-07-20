import { FullIntlProvider } from '@/components/providers/full-intl-provider';

export default function AdminSegmentLayout({ children }: { children: React.ReactNode }) {
  return <FullIntlProvider>{children}</FullIntlProvider>;
}

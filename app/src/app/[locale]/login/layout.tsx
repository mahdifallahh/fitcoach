import { FullIntlProvider } from '@/components/providers/full-intl-provider';

export default function LoginSegmentLayout({ children }: { children: React.ReactNode }) {
  return <FullIntlProvider>{children}</FullIntlProvider>;
}

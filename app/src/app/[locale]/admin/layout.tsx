import { AppSegmentProviders } from '@/components/providers/app-segment-providers';

export default function AdminSegmentLayout({ children }: { children: React.ReactNode }) {
  return <AppSegmentProviders>{children}</AppSegmentProviders>;
}

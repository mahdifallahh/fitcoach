import { AppSegmentProviders } from '@/components/providers/app-segment-providers';

export default function CoachSegmentLayout({ children }: { children: React.ReactNode }) {
  return <AppSegmentProviders>{children}</AppSegmentProviders>;
}

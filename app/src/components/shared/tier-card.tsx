import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * One pricing-tier card, shared by the landing pricing section and the coach
 * billing panel (identical markup, different translation sources — one is a
 * server component, the other client — so this takes plain resolved strings).
 *
 * The "popular" badge sits inline in the header instead of absolutely
 * positioned above the border: on a narrow mobile card, an absolute badge at
 * `-top-2.5` reads as clipped/overlapping. Inline never clips.
 */
export function TierCard({
  name,
  studentsLine,
  highlight,
  popularLabel,
  comingSoonLabel,
}: {
  name: string;
  studentsLine: string;
  highlight?: boolean;
  popularLabel: string;
  comingSoonLabel: string;
}) {
  return (
    <Card className={cn('flex flex-col', highlight && 'border-primary shadow-sm')}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-lg">{name}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{studentsLine}</p>
        </div>
        {highlight && (
          <Badge className="shrink-0">
            <Sparkles className="me-1 size-3" />
            {popularLabel}
          </Badge>
        )}
      </CardHeader>
      {/* A single "coming soon" pill — showing the same word again as a giant
          price line AND a disabled button was redundant clutter on mobile. */}
      <CardContent className="mt-auto pt-0">
        <Badge variant="secondary" className="font-normal">
          {comingSoonLabel}
        </Badge>
      </CardContent>
    </Card>
  );
}

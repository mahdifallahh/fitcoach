'use client';

import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The exercise's demo video, as a link the coach pastes (YouTube, Aparat, or
 * anything else). It lands in the same `videoUrl` the program viewer and the PDF
 * already read, so nothing downstream cares where the link came from.
 *
 * Uploading a clip was removed deliberately: transcoding needs ffmpeg on the
 * host, and shipping the binaries inside node_modules cost ~140 MB on every
 * deploy. A link does the same job for the student at no infrastructure cost.
 *
 * Controlled on a single string — the parent form owns `videoUrl`.
 */
export function ExerciseVideoField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('exercises');

  return (
    <div className="space-y-2">
      <Label htmlFor="ex-video">{t('videoUrl')}</Label>

      <div className="flex gap-2">
        <Input
          id="ex-video"
          dir="ltr"
          className="flex-1"
          placeholder={t('videoUrlPlaceholder')}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange('')}
            disabled={disabled}
            aria-label={t('videoRemove')}
            title={t('videoRemove')}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">{t('videoLinkHint')}</p>
    </div>
  );
}

'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FileDown, Loader2 } from 'lucide-react';
import { programsApi } from '@/lib/api/programs';
import { Button } from '@/components/ui/button';

export function DownloadPdfButton({
  programId,
  variant = 'ghost',
  withLabel = false,
}: {
  programId: string;
  variant?: 'ghost' | 'outline';
  withLabel?: boolean;
}) {
  const t = useTranslations('programs');
  const locale = useLocale();
  const [loading, setLoading] = React.useState(false);

  async function download() {
    setLoading(true);
    try {
      const { url } = await programsApi.pdf(programId, locale === 'en' ? 'en' : 'fa');
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error(t('pdfError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={withLabel ? 'sm' : 'icon'}
      onClick={download}
      disabled={loading}
      aria-label={t('pdf')}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      {withLabel && t('pdf')}
    </Button>
  );
}

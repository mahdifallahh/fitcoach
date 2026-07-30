"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { programsApi } from "@/lib/api/programs";
import { Button } from "@/components/ui/button";

/**
 * The two ways to get one program's document. They always travel together, so
 * they are one prop: a caller that swapped the fetch to the student endpoint but
 * left the coach print URL behind would only find out when the fallback fired.
 */
export interface PdfSource {
  pdf: (
    id: string,
    locale: "fa" | "en",
  ) => Promise<{ url: string; cached: boolean }>;
  printHref: (id: string, locale: "fa" | "en") => string;
}

const COACH_SOURCE: PdfSource = {
  pdf: programsApi.pdf,
  printHref: programsApi.printHref,
};

export function DownloadPdfButton({
  programId,
  variant = "ghost",
  withLabel = false,
  source = COACH_SOURCE,
}: {
  programId: string;
  variant?: "ghost" | "outline";
  withLabel?: boolean;
  /** Override the document source (e.g. the student endpoints). */
  source?: PdfSource;
}) {
  const t = useTranslations("programs");
  const locale = useLocale();
  const [loading, setLoading] = React.useState(false);

  async function download() {
    // Generating the PDF takes seconds, and by then the click gesture has expired —
    // a `window.open` after the await is treated as an unsolicited popup and blocked,
    // so the download silently never happens. Claim the tab synchronously *inside*
    // the gesture, then point it at the file once we have the URL.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null; // same protection `noopener` would have given
    const show = (url: string) =>
      tab ? tab.location.replace(url) : window.location.assign(url);

    const lang = locale === "en" ? "en" : "fa";
    setLoading(true);
    try {
      const { url } = await source.pdf(programId, lang);
      show(url);
    } catch (err) {
      // The server has no Chromium to render with (a managed Node host cannot
      // install one). Hand the reader the same document as HTML and let their own
      // browser print it — the feature degrades, it doesn't disappear.
      if (err instanceof ApiError && err.code === "PDF_UNAVAILABLE") {
        show(source.printHref(programId, lang));
        return;
      }
      tab?.close(); // don't strand the user on a blank tab
      toast.error(t("pdfError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={withLabel ? "sm" : "icon"}
      onClick={download}
      disabled={loading}
      aria-label={t("pdf")}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileDown className="size-4" />
      )}
      {withLabel && t("pdf")}
    </Button>
  );
}

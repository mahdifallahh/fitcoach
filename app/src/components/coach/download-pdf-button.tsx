"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { programsApi } from "@/lib/api/programs";
import { Button } from "@/components/ui/button";

export function DownloadPdfButton({
  programId,
  variant = "ghost",
  withLabel = false,
  fetcher,
}: {
  programId: string;
  variant?: "ghost" | "outline";
  withLabel?: boolean;
  /** Override the PDF source (e.g. the student endpoint). Defaults to the coach endpoint. */
  fetcher?: (
    id: string,
    locale: "fa" | "en",
  ) => Promise<{ url: string; cached: boolean }>;
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

    setLoading(true);
    try {
      const get = fetcher ?? programsApi.pdf;
      const { url } = await get(programId, locale === "en" ? "en" : "fa");
      if (tab) tab.location.replace(url);
      else window.location.assign(url); // popup blocked entirely → navigate instead
    } catch {
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

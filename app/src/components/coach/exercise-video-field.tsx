"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2, Upload, Video } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  ACCEPTED_VIDEO_EXTENSIONS,
  ACCEPTED_VIDEO_TYPES,
  MAX_VIDEO_MB,
  checkVideoFile,
  uploadExerciseVideo,
  type VideoRejection,
} from "@/lib/api/video-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

/** What the field is doing right now — drives the whole status area. */
type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; percent: number }
  | { kind: "processing" }
  | { kind: "error"; message: string };

/**
 * The exercise's demo video: either an uploaded clip (streamed to the API,
 * transcoded server-side) or a pasted external link. Both end up in the same
 * `videoUrl` field, so the program viewer and the PDF need no special case.
 *
 * Deliberately a controlled component over a single string value — the parent
 * form owns `videoUrl` and this only reports changes.
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
  const t = useTranslations("exercises");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });

  // An in-flight upload must not outlive the dialog that started it.
  React.useEffect(() => () => abortRef.current?.abort(), []);

  const busy = phase.kind === "uploading" || phase.kind === "processing";
  const isUploadedClip = value.startsWith("http") && value.includes("/videos/");

  /** Client-side rejection reasons, as sentences that say what to do about it. */
  function rejectionMessage(reason: VideoRejection): string {
    if (reason === "size") return t("videoTooLarge", { max: MAX_VIDEO_MB });
    if (reason === "extension") return t("videoExtensionMismatch");
    return t("videoTypeNotAllowed", {
      formats: ACCEPTED_VIDEO_EXTENSIONS.join("، "),
    });
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after a failure
    if (!file) return;

    // Check before uploading: sending 100 MB only to be told the format is wrong
    // wastes the coach's mobile data.
    const rejection = checkVideoFile(file);
    if (rejection) {
      setPhase({ kind: "error", message: rejectionMessage(rejection) });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: "uploading", percent: 0 });
    try {
      const result = await uploadExerciseVideo(file, {
        signal: controller.signal,
        onProgress: (fraction) =>
          setPhase({ kind: "uploading", percent: Math.round(fraction * 100) }),
        onProcessingStart: () => setPhase({ kind: "processing" }),
      });
      onChange(result.url);
      setPhase({ kind: "idle" });
    } catch (err) {
      if (controller.signal.aborted) return; // dialog closed mid-upload
      setPhase({ kind: "error", message: uploadErrorMessage(err, t) });
    } finally {
      abortRef.current = null;
    }
  }

  function clear() {
    abortRef.current?.abort();
    onChange("");
    setPhase({ kind: "idle" });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="ex-video">{t("videoUrl")}</Label>

      <div className="flex gap-2">
        <Input
          id="ex-video"
          dir="ltr"
          className="flex-1"
          placeholder={t("videoUrlPlaceholder")}
          value={value}
          disabled={busy}
          onChange={(e) => {
            onChange(e.target.value);
            if (phase.kind === "error") setPhase({ kind: "idle" });
          }}
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clear}
            disabled={disabled}
            aria-label={t("videoRemove")}
            title={t("videoRemove")}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_VIDEO_EXTENSIONS].join(",")}
        className="hidden"
        onChange={onPick}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {t("videoUpload")}
      </Button>

      {/* Status: progress while bytes are in flight, then an indeterminate bar
          while the server transcodes — the coach always knows why they're waiting. */}
      {phase.kind === "uploading" && (
        <div className="space-y-1">
          <Progress value={phase.percent} />
          <p className="text-xs text-muted-foreground">
            {t("videoUploading", { percent: phase.percent })}
          </p>
        </div>
      )}
      {phase.kind === "processing" && (
        <div className="space-y-1">
          <Progress indeterminate />
          <p className="text-xs text-muted-foreground">{t("videoProcessing")}</p>
        </div>
      )}
      {phase.kind === "error" && (
        <p className="text-xs text-destructive">{phase.message}</p>
      )}
      {phase.kind === "idle" && (
        <p className="text-xs text-muted-foreground">
          {t("videoHint", {
            max: MAX_VIDEO_MB,
            formats: ACCEPTED_VIDEO_EXTENSIONS.join("، "),
          })}
        </p>
      )}

      {isUploadedClip && !busy && (
        <video
          src={value}
          controls
          preload="metadata"
          className="mt-1 max-h-48 w-full rounded-md bg-black"
        >
          <Video className="size-4" />
        </video>
      )}
    </div>
  );
}

/**
 * Server failures carry a `VIDEO_*` code; translate those, and fall back to the
 * generic message for anything else (network drop, proxy limit, unexpected 500).
 */
function uploadErrorMessage(
  err: unknown,
  t: ReturnType<typeof useTranslations<"exercises">>,
): string {
  if (!(err instanceof ApiError)) return t("videoUploadFailed");
  switch (err.code) {
    case "VIDEO_TOO_LARGE":
      return t("videoTooLarge", { max: MAX_VIDEO_MB });
    case "VIDEO_TYPE_NOT_ALLOWED":
      return t("videoTypeNotAllowed", {
        formats: ACCEPTED_VIDEO_EXTENSIONS.join("، "),
      });
    case "VIDEO_EXTENSION_MISMATCH":
      return t("videoExtensionMismatch");
    case "VIDEO_CORRUPT":
      return t("videoCorrupt");
    case "VIDEO_TIMEOUT":
      return t("videoTimeout");
    case "VIDEO_TOOLING_UNAVAILABLE":
      return t("videoUnavailable");
    case "VIDEO_ENCODING_FAILED":
      return t("videoEncodingFailed");
    default:
      return t("videoUploadFailed");
  }
}

"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import type { CoachProfile } from "@/lib/api/types";
import { coachProfileApi } from "@/lib/api/coach-profile";
import { useUpdateCoachProfile } from "@/lib/query/use-coach-profile";
import { useWriteAccess } from "@/lib/hooks/use-write-access";
import { ApiError, apiErrorMessage } from "@/lib/api/client";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  uploadFile,
} from "@/lib/api/upload";
import { downscaleImage } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FieldErrorText } from "@/components/shared/field-error";
import { PublicPageCard } from "./public-page-card";

const schema = z.object({
  handle: z
    .string()
    .regex(/^[a-z0-9-]{3,30}$/)
    .or(z.literal("")),
  name: z.string().min(1).max(120),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().nullable().optional(),
  socialLinks: z.array(
    z.object({
      type: z.string().min(1).max(40),
      label: z.string().max(120).optional(),
      url: z.string().min(1).max(500),
    }),
  ),
  tags: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm({ profile }: { profile: CoachProfile }) {
  const t = useTranslations("profile");
  const tf = useTranslations("forms");
  const tb = useTranslations("billing");
  const { canWrite } = useWriteAccess();
  const update = useUpdateCoachProfile();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      handle: profile.handle ?? "",
      name: profile.name,
      bio: profile.bio ?? "",
      avatarUrl: profile.avatarUrl,
      socialLinks: profile.socialLinks ?? [],
      tags: profile.tags ?? [],
    },
  });
  const { register, control, handleSubmit, watch, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "socialLinks",
  });

  const avatarUrl = watch("avatarUrl");
  const tags = watch("tags");
  const handle = watch("handle");

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
      return toast.error(t("invalidFile"));
    if (file.size > MAX_UPLOAD_BYTES) return toast.error(t("fileTooLarge"));
    setUploading(true);
    try {
      // Downscale before the presigned PUT: the avatar renders at ≤96px on the
      // public page but is uploaded straight to S3 with no server resize, so a
      // full-size phone photo would otherwise ship as the page's LCP image.
      const optimized = await downscaleImage(file);
      const url = await uploadFile(coachProfileApi.avatarUploadUrl, optimized);
      setValue("avatarUrl", url, { shouldDirty: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, t("saveError")));
    } finally {
      setUploading(false);
    }
  }

  function addTag() {
    const v = tagInput.trim();
    if (v && !tags.includes(v))
      setValue("tags", [...tags, v], { shouldDirty: true });
    setTagInput("");
  }

  function onSubmit(values: FormValues) {
    update.mutate(
      {
        // only send handle when set + changed (avoid clearing it with '')
        ...(values.handle && values.handle !== profile.handle
          ? { handle: values.handle }
          : {}),
        name: values.name,
        bio: values.bio?.trim() ? values.bio : null,
        avatarUrl: values.avatarUrl ?? null,
        socialLinks: values.socialLinks,
        tags: values.tags,
      },
      {
        onSuccess: () => toast.success(t("saved")),
        onError: (err) =>
          toast.error(
            err instanceof ApiError && err.code === "HANDLE_TAKEN"
              ? t("handleTaken")
              : apiErrorMessage(err, t("saveError")),
          ),
      },
    );
  }

  function onInvalid() {
    toast.error(tf("hasErrors"));
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="max-w-2xl space-y-6"
    >
      {/* Public page — what it is, a live preview, and what's still missing */}
      <PublicPageCard
        profile={profile}
        typedHandle={handle}
        handleInput={
          <div className="space-y-1.5">
            <Label htmlFor="handle">{t("handle")}</Label>
            <div className="flex items-center gap-1 rounded-md border bg-background ps-3 text-sm">
              <span className="shrink-0 text-muted-foreground" dir="ltr">
                /c/
              </span>
              <Input
                id="handle"
                dir="ltr"
                className="border-0 px-1 shadow-none focus-visible:ring-0"
                placeholder="my-handle"
                {...register("handle")}
              />
            </div>
            <FieldErrorText error={formState.errors.handle} t={tf} />
            <p className="text-xs text-muted-foreground">{t("handleHint")}</p>
          </div>
        }
      />

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="size-20 overflow-hidden rounded-full bg-muted">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <div>
          <Label className="mb-1 block">{t("avatar")}</Label>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={onPickAvatar}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploading ? t("uploading") : t("changeAvatar")}
          </Button>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" {...register("name")} />
        <FieldErrorText error={formState.errors.name} t={tf} />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">{t("bio")}</Label>
        <Textarea
          id="bio"
          placeholder={t("bioPlaceholder")}
          {...register("bio")}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>{t("tags")}</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() =>
                  setValue(
                    "tags",
                    tags.filter((x) => x !== tag),
                    { shouldDirty: true },
                  )
                }
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          value={tagInput}
          placeholder={t("tagsPlaceholder")}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
        />
      </div>

      {/* Social links */}
      <div className="space-y-3">
        <Label>{t("socialLinks")}</Label>
        {fields.map((field, i) => (
          <Card key={field.id}>
            <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
              <div className="sm:w-32">
                <Input
                  placeholder={t("linkType")}
                  {...register(`socialLinks.${i}.type`)}
                />
                <FieldErrorText
                  error={formState.errors.socialLinks?.[i]?.type}
                  t={tf}
                />
              </div>
              <Input
                className="sm:w-36"
                placeholder={t("linkLabel")}
                {...register(`socialLinks.${i}.label`)}
              />
              <div className="flex-1">
                <Input
                  dir="ltr"
                  placeholder={t("linkUrl")}
                  {...register(`socialLinks.${i}.url`)}
                />
                <FieldErrorText
                  error={formState.errors.socialLinks?.[i]?.url}
                  t={tf}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ type: "", label: "", url: "" })}
        >
          <Plus className="size-4" /> {t("addLink")}
        </Button>
      </div>

      <Button
        type="submit"
        disabled={update.isPending || !canWrite}
        title={canWrite ? undefined : tb("lockedTitle")}
      >
        {update.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {update.isPending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

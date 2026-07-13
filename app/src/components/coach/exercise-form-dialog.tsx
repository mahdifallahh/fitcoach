"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Save, Upload } from "lucide-react";
import type { Exercise } from "@/lib/api/types";
import { exercisesApi } from "@/lib/api/exercises";
import { apiErrorMessage } from "@/lib/api/client";
import {
  useCreateExercise,
  useUpdateExercise,
} from "@/lib/query/use-exercises";
import { useCategories } from "@/lib/query/use-categories";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  uploadFile,
} from "@/lib/api/upload";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FieldErrorText } from "@/components/shared/field-error";

const schema = z.object({
  name: z.string().min(1).max(120),
  categoryId: z.string().optional(),
  defaultSets: z.coerce.number().int().min(1).max(50),
  defaultReps: z.string().min(1).max(40),
  description: z.string().max(2000).optional(),
  videoUrl: z.string().max(500).optional(),
  gifUrl: z.string().nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ExerciseFormDialog({
  open,
  onOpenChange,
  exercise,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
}) {
  const t = useTranslations("exercises");
  const tf = useTranslations("forms");
  const { data: categories } = useCategories();
  const create = useCreateExercise();
  const update = useUpdateExercise();
  const isEdit = !!exercise;
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      categoryId: "",
      defaultSets: 3,
      defaultReps: "10",
      description: "",
      videoUrl: "",
      gifUrl: null,
    },
  });
  const { register, handleSubmit, reset, watch, setValue, formState } = form;
  const gifUrl = watch("gifUrl");

  // Sync form whenever the dialog opens (for create vs edit).
  React.useEffect(() => {
    if (!open) return;
    reset({
      name: exercise?.name ?? "",
      categoryId: exercise?.categoryId ?? "",
      defaultSets: exercise?.defaultSets ?? 3,
      defaultReps: exercise?.defaultReps ?? "10",
      description: exercise?.description ?? "",
      videoUrl: exercise?.videoUrl ?? "",
      gifUrl: exercise?.gifUrl ?? null,
    });
  }, [open, exercise, reset]);

  async function onPickGif(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
      return toast.error(t("invalidFile"));
    if (file.size > MAX_UPLOAD_BYTES) return toast.error(t("fileTooLarge"));
    setUploading(true);
    try {
      const url = await uploadFile(exercisesApi.gifUploadUrl, file);
      setValue("gifUrl", url, { shouldDirty: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, t("saveError")));
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(values: FormValues) {
    const input = {
      name: values.name,
      categoryId: values.categoryId || null,
      defaultSets: values.defaultSets,
      defaultReps: values.defaultReps,
      description: values.description?.trim() ? values.description : null,
      videoUrl: values.videoUrl?.trim() ? values.videoUrl : null,
      gifUrl: values.gifUrl ?? null,
    };
    const opts = {
      onSuccess: () => {
        toast.success(isEdit ? t("updated") : t("created"));
        onOpenChange(false);
      },
      onError: (err: unknown) =>
        toast.error(apiErrorMessage(err, t("saveError"))),
    };
    if (isEdit && exercise) update.mutate({ id: exercise.id, input }, opts);
    else create.mutate(input, opts);
  }

  function onInvalid() {
    toast.error(tf("hasErrors"));
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("edit") : t("new")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="space-y-4"
        >
          <div className="flex gap-4">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {gifUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gifUrl} alt="" className="size-full object-cover" />
              ) : (
                <Upload className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col justify-center">
              <Label className="mb-1 block">{t("gif")}</Label>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={onPickGif}
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
                {uploading ? t("uploading") : t("uploadGif")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ex-name">{t("name")}</Label>
            <Input
              id="ex-name"
              placeholder={t("namePlaceholder")}
              {...register("name")}
            />
            <FieldErrorText error={formState.errors.name} t={tf} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ex-cat">{t("category")}</Label>
            <Select id="ex-cat" {...register("categoryId")}>
              <option value="">{t("noCategory")}</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {/* An empty dropdown otherwise just looks broken — say why and where to fix it. */}
            <p className="text-xs text-muted-foreground">
              {categories && categories.length === 0
                ? t("categoryHintEmpty")
                : t("categoryHint")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ex-sets">{t("sets")}</Label>
              <Input
                id="ex-sets"
                type="number"
                min={1}
                max={50}
                {...register("defaultSets", { valueAsNumber: true })}
              />
              <FieldErrorText error={formState.errors.defaultSets} t={tf} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-reps">{t("reps")}</Label>
              <Input
                id="ex-reps"
                dir="ltr"
                placeholder={t("repsPlaceholder")}
                {...register("defaultReps")}
              />
              <FieldErrorText error={formState.errors.defaultReps} t={tf} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ex-desc">{t("description")}</Label>
            <Textarea id="ex-desc" {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ex-video">{t("videoUrl")}</Label>
            <Input
              id="ex-video"
              dir="ltr"
              placeholder={t("videoUrlPlaceholder")}
              {...register("videoUrl")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || uploading}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isEdit ? t("saveChanges") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

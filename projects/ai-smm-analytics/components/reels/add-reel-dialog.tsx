"use client";

import { useId } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionDialog } from "@/hooks/use-action-dialog";
import { createReel } from "@/lib/actions/reels";
import { REEL_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Подпись ошибки под полем. Возвращает null, когда ошибки нет. */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-destructive text-sm">
      {message}
    </p>
  );
}

/**
 * Кнопка "Добавить видео" и модальное окно с формой.
 *
 * Форма отправляется через server action (createReel), поэтому работает даже
 * с выключенным JavaScript. useActionState добавляет к этому индикатор
 * загрузки и разбор ошибок по полям.
 */
export function AddReelDialog() {
  const { open, setOpen, state, formAction, isPending } =
    useActionDialog(createReel);

  // useId даёт стабильные id для связки label↔input — важно, потому что на
  // странице может оказаться несколько таких форм.
  const formId = useId();
  const field = (name: string) => `${formId}-${name}`;

  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Добавить видео
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новое видео</DialogTitle>
          <DialogDescription>
            Метрики пока вводятся вручную — автоматический сбор появится
            в следующем спринте.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={field("url")}>Ссылка на видео</Label>
            <Input
              id={field("url")}
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://www.instagram.com/reel/..."
              required
              aria-invalid={Boolean(errors.url)}
              aria-describedby={errors.url ? field("url-error") : undefined}
            />
            <FieldError id={field("url-error")} message={errors.url} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={field("plays")}>Просмотры</Label>
            <Input
              id={field("plays")}
              name="plays"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={0}
              aria-invalid={Boolean(errors.plays)}
              aria-describedby={errors.plays ? field("plays-error") : undefined}
            />
            <FieldError id={field("plays-error")} message={errors.plays} />
          </div>

          {/*
            Охват, лайки и сохранения в ТЗ Спринта 1 не значились, но колонки
            в базе есть, а второй раз открывать форму ради них — лишний шаг.
            Поля необязательные: пустое значение сохранится как 0.
          */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor={field("reach")}>Охват</Label>
              <Input
                id={field("reach")}
                name="reach"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={0}
                aria-invalid={Boolean(errors.reach)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={field("likes")}>Лайки</Label>
              <Input
                id={field("likes")}
                name="likes"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={0}
                aria-invalid={Boolean(errors.likes)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={field("saved")}>Сохранения</Label>
              <Input
                id={field("saved")}
                name="saved"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={0}
                aria-invalid={Boolean(errors.saved)}
              />
            </div>
          </div>
          <FieldError
            id={field("metrics-error")}
            message={errors.reach ?? errors.likes ?? errors.saved}
          />

          {/*
            Радиокнопки вместо <select>: вариантов всего два, и оба видны сразу
            без лишнего клика. Компонент radio-group из shadcn/ui не ставили,
            чтобы не тянуть зависимость ради одного поля.
          */}
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm leading-none font-medium">
              Тип видео
            </legend>
            <div className="flex gap-2">
              {(["my", "competitor"] as const).map((value, index) => (
                <Label
                  key={value}
                  htmlFor={field(`type-${value}`)}
                  className={cn(
                    "border-input hover:bg-accent flex-1 cursor-pointer justify-center rounded-md border px-3 py-2 font-normal transition-colors",
                    "has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
                    "has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[3px]",
                  )}
                >
                  <input
                    id={field(`type-${value}`)}
                    type="radio"
                    name="type"
                    value={value}
                    defaultChecked={index === 0}
                    className="sr-only"
                  />
                  {REEL_TYPE_LABELS[value]}
                </Label>
              ))}
            </div>
            <FieldError id={field("type-error")} message={errors.type} />
          </fieldset>

          {/* Общая ошибка: сеть, RLS, дубль ссылки. */}
          {state.status === "error" && state.message && (
            <p
              role="alert"
              className="border-destructive/50 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {state.message}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isPending ? "Сохраняем…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

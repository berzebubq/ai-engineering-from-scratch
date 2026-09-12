"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { syncInstagramReels } from "@/app/actions/instagram";
import { initialSyncState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";

/** Человеческая сводка по результату синхронизации. */
function summarize(created: number, updated: number): string {
  const parts: string[] = [];
  if (created > 0) parts.push(`добавлено ${created}`);
  if (updated > 0) parts.push(`обновлено ${updated}`);
  return parts.length > 0 ? parts.join(", ") : "новых данных нет";
}

/**
 * Кнопка «Синхронизировать статистику».
 *
 * Форма с server action, а не fetch из обработчика клика: после записи в базу
 * экшен зовёт revalidatePath('/'), и Next в том же ответе присылает заново
 * отрендеренную страницу. Таблица, график и топ обновляются без перезагрузки и
 * без клиентского состояния, которое пришлось бы синхронизировать руками.
 *
 * @param configured заданы ли INSTAGRAM_ACCOUNT_ID и META_ACCESS_TOKEN
 */
export function SyncButton({ configured }: { configured: boolean }) {
  const [state, formAction, isPending] = useActionState(
    syncInstagramReels,
    initialSyncState,
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={formAction}>
        <Button
          type="submit"
          variant="outline"
          disabled={isPending || !configured}
          title={
            configured
              ? undefined
              : "Добавьте INSTAGRAM_ACCOUNT_ID и META_ACCESS_TOKEN в .env.local"
          }
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw />
          )}
          {isPending ? "Синхронизируем…" : "Синхронизировать статистику"}
        </Button>
      </form>

      {!configured && (
        <p className="text-muted-foreground max-w-xs text-right text-xs">
          Нет доступа к Graph API: заполните INSTAGRAM_ACCOUNT_ID
          и META_ACCESS_TOKEN в .env.local
        </p>
      )}

      {state.status === "success" && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CheckCircle2 className="size-3.5" aria-hidden />
          {state.message ?? summarize(state.created ?? 0, state.updated ?? 0)}
        </p>
      )}

      {state.status === "partial" && (
        <div className="max-w-sm text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs">
            <AlertTriangle className="size-3.5" aria-hidden />
            {summarize(state.created ?? 0, state.updated ?? 0)}, но{" "}
            {state.failed?.length} видео не удалось обновить
          </p>
          {/* Первая причина обычно объясняет и все остальные. */}
          <p className="text-muted-foreground mt-1 text-xs">
            {state.failed?.[0]?.reason}
          </p>
        </div>
      )}

      {state.status === "error" && (
        <p
          role="alert"
          className="border-destructive/50 text-destructive max-w-sm rounded-md border px-3 py-2 text-left text-xs whitespace-pre-line"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}

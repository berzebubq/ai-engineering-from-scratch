"use server";

import { revalidatePath } from "next/cache";

import type { SyncState } from "@/app/actions/types";
import {
  InstagramApiError,
  fetchAccountReels,
  fetchMediaInsights,
  metricsFromMedia,
} from "@/lib/instagram/client";
import { InstagramConfigError, getInstagramConfig } from "@/lib/instagram/env";
import { normalizeReelUrl } from "@/lib/instagram/url";
import { createClient } from "@/lib/supabase/server";
import type { ReelInsert } from "@/types/database";

/**
 * Сколько запросов к Graph API выполняем одновременно.
 *
 * Insights запрашиваются отдельно по каждому видео, так что 30 рилсов — это 30
 * запросов. Последовательно это минуты, а без ограничения Meta отвечает
 * лимитом на частоту. Четыре — компромисс, проверенный практикой.
 */
const CONCURRENCY = 4;

/** Выполняет задачи пачками по limit штук, сохраняя порядок результатов. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await task(items[index]);
      }
    })(),
  );

  await Promise.all(workers);
  return results;
}

/**
 * Тянет последние рилсы из Instagram и обновляет таблицу reels.
 *
 * Видео сопоставляются по нормализованной ссылке: если запись уже есть —
 * обновляются метрики, если нет — создаётся новая с type = 'my'.
 *
 * Сигнатура под useActionState: (prevState, formData).
 */
export async function syncInstagramReels(
  _prevState: SyncState,
  _formData: FormData,
): Promise<SyncState> {
  let config;
  try {
    config = getInstagramConfig();
  } catch (error) {
    if (error instanceof InstagramConfigError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  // 1. Список рилсов.
  let media;
  try {
    media = await fetchAccountReels(config);
  } catch (error) {
    if (error instanceof InstagramApiError) {
      return { status: "error", message: error.humanMessage };
    }
    throw error;
  }

  if (media.length === 0) {
    return {
      status: "success",
      created: 0,
      updated: 0,
      message: "В аккаунте не нашлось ни одного рилса.",
      finishedAt: new Date().toISOString(),
    };
  }

  // 2. Метрики по каждому. Провал одного видео не роняет всю синхронизацию.
  const failed: Array<{ url: string; reason: string }> = [];
  const syncedAt = new Date().toISOString();

  const rows = await mapWithConcurrency(media, CONCURRENCY, async (item) => {
    const url = normalizeReelUrl(item.permalink);
    const { likes, comments } = metricsFromMedia(item);

    try {
      const insights = await fetchMediaInsights(config, item.id);
      return {
        instagram_id: item.id,
        url,
        caption: item.caption ?? null,
        thumbnail_url: item.thumbnail_url ?? item.media_url ?? null,
        published_at: item.timestamp,
        type: "my" as const,
        likes,
        comments,
        reach: insights.reach,
        plays: insights.plays,
        saved: insights.saved,
        shares: insights.shares,
        synced_at: syncedAt,
      } satisfies ReelInsert & { instagram_id: string; synced_at: string };
    } catch (error) {
      const reason =
        error instanceof InstagramApiError
          ? error.humanMessage
          : error instanceof Error
            ? error.message
            : String(error);
      failed.push({ url, reason });
      return null;
    }
  });

  const payload = rows.filter((row) => row !== null);

  if (payload.length === 0) {
    return {
      status: "error",
      message: "Ни по одному видео не удалось получить метрики.",
      failed,
      finishedAt: syncedAt,
    };
  }

  // 3. Считаем, что из этого новое, — до записи, иначе уже не различить.
  const supabase = await createClient();
  const urls = payload.map((row) => row.url);

  const { data: existing, error: lookupError } = await supabase
    .from("reels")
    .select("url")
    .in("url", urls);

  if (lookupError) {
    return {
      status: "error",
      message: `Не удалось прочитать текущие записи: ${lookupError.message}`,
      finishedAt: syncedAt,
    };
  }

  const known = new Set((existing ?? []).map((row) => row.url));
  const created = urls.filter((url) => !known.has(url)).length;
  const updated = urls.length - created;

  // 4. Upsert по url: он есть и у записей, заведённых руками, поэтому
  //    синхронизация подхватит их, а не создаст дубль.
  const { error: upsertError } = await supabase
    .from("reels")
    .upsert(payload, { onConflict: "url" });

  if (upsertError) {
    return {
      status: "error",
      message: `Не удалось сохранить метрики: ${upsertError.message}`,
      failed,
      finishedAt: syncedAt,
    };
  }

  revalidatePath("/");

  return {
    status: failed.length > 0 ? "partial" : "success",
    created,
    updated,
    failed: failed.length > 0 ? failed : undefined,
    finishedAt: syncedAt,
  };
}

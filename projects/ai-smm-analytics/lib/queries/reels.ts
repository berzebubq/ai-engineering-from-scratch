import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Reel, ReelWithTags, Tag, TagSource } from "@/types/database";

/**
 * Чтение данных для серверных компонентов.
 *
 * Держим запросы отдельно от мутаций (lib/actions): у них разные правила —
 * запросы рендерятся, мутации проверяют вход и инвалидируют кеш.
 */

/** Все видео, новые сверху. */
export async function getReels(): Promise<Reel[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // Пробрасываем наверх: пустой список и упавший запрос — разные вещи,
    // и страница должна показать ошибку, а не "видео пока нет".
    throw new Error(`Не удалось загрузить список видео: ${error.message}`);
  }

  return data ?? [];
}

/** Форма строки, которую отдаёт вложенный select ниже. */
type ReelTagJoinRow = {
  source: TagSource;
  confidence: number | null;
  tags: Tag | null;
};

/**
 * Одно видео вместе с тегами. Возвращает null, если записи нет —
 * решение о 404 принимает страница.
 */
export async function getReelWithTags(id: string): Promise<ReelWithTags | null> {
  const supabase = await createClient();

  // Вложенный select идёт по внешним ключам и делает один запрос вместо трёх.
  const { data, error } = await supabase
    .from("reels")
    .select(
      `
        *,
        reel_tags (
          source,
          confidence,
          tags ( id, name, category, created_at )
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Не удалось загрузить видео: ${error.message}`);
  }

  if (!data) return null;

  const { reel_tags: reelTags, ...reel } = data as unknown as Reel & {
    reel_tags: ReelTagJoinRow[] | null;
  };

  return {
    ...reel,
    tags: (reelTags ?? [])
      // tags может быть null, если тег удалили гонкой между запросами.
      .filter((row): row is ReelTagJoinRow & { tags: Tag } => row.tags !== null)
      .map((row) => ({
        ...row.tags,
        source: row.source,
        confidence: row.confidence,
      })),
  };
}

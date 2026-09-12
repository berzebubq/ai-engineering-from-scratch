import type { Reel } from "@/types/database";

/**
 * Производные показатели дашборда.
 *
 * Вынесено из компонентов: это правила предметной области, а не разметка, и их
 * нужно применять одинаково в таблице, карточках и на странице видео.
 */

/**
 * Engagement rate как ДОЛЯ: (лайки + сохранения) / охват.
 *
 * Формула зафиксирована продактом. Ровно её же считает generated-колонка
 * reels.engagement_rate в базе — но поле приходит из Postgres типом numeric,
 * то есть строкой, и на свежедобавленных строках может быть null. Эта функция
 * — единственное место, где значение приводится к числу.
 *
 * Возвращает null, когда охват нулевой: «не знаем» и «ноль» — разные вещи.
 */
export function engagementRate(reel: Pick<Reel, "likes" | "saved" | "reach">): number | null {
  if (!reel.reach || reel.reach <= 0) return null;
  return (reel.likes + reel.saved) / reel.reach;
}

/** Точка графика: сутки и суммарные проигрывания за них. */
export interface PlaysPoint {
  /** ISO-дата YYYY-MM-DD — ключ сортировки и оси X. */
  date: string;
  plays: number;
  /** Сколько видео попало в этот день — показываем в подсказке. */
  reels: number;
}

/**
 * Динамика проигрываний по датам.
 *
 * За дату берём публикацию, а при её отсутствии — добавление в базу: у видео,
 * заведённых руками, published_at пустой, и терять их на графике незачем.
 * Несколько роликов за один день суммируются — это и есть «проигрывания за день».
 */
export function playsByDate(reels: Reel[]): PlaysPoint[] {
  const buckets = new Map<string, PlaysPoint>();

  for (const reel of reels) {
    const source = reel.published_at ?? reel.created_at;
    const date = new Date(source);
    if (Number.isNaN(date.getTime())) continue;

    // toISOString даёт UTC — одинаково на сервере и в браузере, без расхождений
    // гидрации из-за таймзоны пользователя.
    const key = date.toISOString().slice(0, 10);

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.plays += reel.plays;
      bucket.reels += 1;
    } else {
      buckets.set(key, { date: key, plays: reel.plays, reels: 1 });
    }
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Топ видео по engagement rate.
 *
 * Ролики с нулевым охватом отбрасываем: у них ER не определён, и попадание
 * такого видео в топ было бы артефактом деления, а не результатом.
 */
export function topReelsByEngagement(reels: Reel[], limit = 3): Reel[] {
  return reels
    .filter((reel) => engagementRate(reel) !== null)
    .sort((a, b) => (engagementRate(b) ?? 0) - (engagementRate(a) ?? 0))
    .slice(0, limit);
}

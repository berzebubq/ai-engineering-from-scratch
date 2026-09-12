/**
 * Типы ответов Instagram Graph API.
 *
 * Описывают то, что API ОБЕЩАЕТ вернуть. Проверку того, что он действительно
 * это вернул, делают zod-схемы в ./schemas.ts — типы стираются при компиляции
 * и от сломанного ответа не защищают.
 */

/** Элемент рёбра /{ig-user-id}/media. */
export interface GraphMedia {
  id: string;
  /** Тип медиа: IMAGE | VIDEO | CAROUSEL_ALBUM. */
  media_type: string;
  /** Где опубликовано: REELS | FEED | STORY | AD. Именно по нему отбираем рилсы. */
  media_product_type?: string;
  permalink: string;
  caption?: string;
  /** У видео обложка лежит здесь; media_url — это сам файл. */
  thumbnail_url?: string;
  media_url?: string;
  /** ISO 8601 с таймзоной, например 2026-09-01T10:00:00+0000. */
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

/** Одно значение метрики. Для lifetime-метрик массив всегда из одного элемента. */
export interface GraphInsightValue {
  value: number;
  end_time?: string;
}

/** Элемент ответа /{media-id}/insights. */
export interface GraphInsight {
  name: string;
  period: string;
  values: GraphInsightValue[];
  title?: string;
  description?: string;
  id?: string;
}

/** Курсоры постраничной выдачи. */
export interface GraphPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
  previous?: string;
}

export interface GraphListResponse<T> {
  data: T[];
  paging?: GraphPaging;
}

/**
 * Ошибка Graph API. Приходит с HTTP 400 и не только — Meta отдаёт 200 с телом
 * ошибки в некоторых пограничных случаях, поэтому проверяем наличие поля error,
 * а не только статус.
 */
export interface GraphErrorBody {
  error: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/** Нормализованные метрики одного рилса — то, что мы кладём в базу. */
export interface ReelMetrics {
  reach: number;
  plays: number;
  likes: number;
  saved: number;
  comments: number;
  shares: number;
}

/** Рилс из Instagram, приведённый к форме нашей предметной области. */
export interface InstagramReel {
  instagramId: string;
  url: string;
  caption: string | null;
  thumbnailUrl: string | null;
  publishedAt: string;
  metrics: ReelMetrics;
}

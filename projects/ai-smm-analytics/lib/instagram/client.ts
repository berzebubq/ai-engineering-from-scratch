import "server-only";

import type { z } from "zod";

import type { InstagramConfig } from "./env";
import {
  graphErrorSchema,
  graphInsightsListSchema,
  graphMediaListSchema,
} from "./schemas";
import type { GraphMedia, ReelMetrics } from "./types";

/** Ошибка Graph API с сохранённым кодом — по нему подбираем понятный текст. */
export class InstagramApiError extends Error {
  readonly code?: number;
  readonly subcode?: number;

  constructor(message: string, code?: number, subcode?: number) {
    super(message);
    this.name = "InstagramApiError";
    this.code = code;
    this.subcode = subcode;
  }

  /**
   * Статистики по этому конкретному видео нет — это не поломка.
   * Так бывает у свежих публикаций и у рилсов, опубликованных до того, как
   * аккаунт стал бизнес-аккаунтом.
   */
  get isInsightsUnavailable(): boolean {
    return (
      this.subcode === 2108006 ||
      /not available|no data|unsupported get request for insights/i.test(
        this.message,
      )
    );
  }

  /** Текст для пользователя вместо сырого сообщения Meta. */
  get humanMessage(): string {
    if (this.isInsightsUnavailable) {
      return "Instagram пока не отдаёт статистику по этому видео — обычно так у свежих публикаций.";
    }

    switch (this.code) {
      case 190:
        return "Токен доступа истёк или отозван. Выпустите новый в Meta Business и обновите META_ACCESS_TOKEN.";
      case 4:
      case 17:
      case 32:
      case 613:
        return "Meta временно ограничила частоту запросов. Попробуйте через несколько минут.";
      case 100:
        return `Graph API отклонил запрос: ${this.message}. Обычно это неверный INSTAGRAM_ACCOUNT_ID или нехватка прав у токена.`;
      case 10:
      case 200:
        return "У токена не хватает прав. Нужны instagram_basic и instagram_manage_insights.";
      default:
        return `Graph API вернул ошибку: ${this.message}`;
    }
  }
}

/**
 * Один запрос к Graph API с проверкой ответа.
 *
 * Meta умеет отдавать тело с полем error и на HTTP 200, поэтому смотрим на
 * содержимое, а не только на статус.
 */
async function graphFetch<T>(
  config: InstagramConfig,
  path: string,
  params: Record<string, string>,
  schema: z.ZodType<T>,
): Promise<T> {
  const url = new URL(
    `${config.baseUrl.replace(/\/$/, "")}/${config.apiVersion}/${path}`,
  );
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", config.accessToken);

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      // Синхронизация не должна висеть вечно, если Meta не отвечает.
      signal: AbortSignal.timeout(20_000),
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new InstagramApiError(`сеть недоступна (${reason})`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new InstagramApiError(
      `ответ не является JSON (HTTP ${response.status})`,
    );
  }

  const asError = graphErrorSchema.safeParse(body);
  if (asError.success) {
    const { message, code, error_subcode } = asError.data.error;
    throw new InstagramApiError(message, code, error_subcode);
  }

  if (!response.ok) {
    throw new InstagramApiError(`HTTP ${response.status}`);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Схема API изменилась — это стоит увидеть в логах целиком.
    console.error("Неожиданная форма ответа Graph API:", parsed.error.issues);
    throw new InstagramApiError(
      "ответ Graph API не соответствует ожидаемой структуре (подробности в логах сервера)",
    );
  }

  return parsed.data;
}

/** Поля медиа, которые нам нужны. */
const MEDIA_FIELDS = [
  "id",
  "media_type",
  "media_product_type",
  "permalink",
  "caption",
  "thumbnail_url",
  "media_url",
  "timestamp",
  "like_count",
  "comments_count",
].join(",");

/**
 * Лестница наборов метрик.
 *
 * Meta регулярно переименовывает метрики Instagram Insights: счётчик
 * проигрываний по очереди звался video_views, plays, а затем views. Какая
 * версия API у вас настроена — знает только ваш токен, поэтому вместо жёсткого
 * имени пробуем наборы по порядку и берём первый, который API принял.
 *
 * Последняя ступень — минимум, поддерживаемый всеми версиями: если не сработает
 * и он, проблема не в именах метрик.
 */
const METRIC_LADDER: readonly (readonly string[])[] = [
  ["views", "reach", "saved", "shares"],
  ["plays", "reach", "saved", "shares"],
  ["video_views", "reach", "saved"],
  ["reach", "saved"],
];

/** Имена, под которыми в разных версиях API живёт счётчик проигрываний. */
const PLAY_METRIC_NAMES = new Set(["views", "plays", "video_views"]);

/**
 * Метрики одного рилса.
 *
 * likes и comments берём не отсюда, а из полей самого медиа (like_count,
 * comments_count): они стабильны между версиями API, в отличие от insights.
 */
export async function fetchMediaInsights(
  config: InstagramConfig,
  mediaId: string,
): Promise<{ reach: number; plays: number; saved: number; shares: number }> {
  let lastError: InstagramApiError | null = null;

  for (const metrics of METRIC_LADDER) {
    try {
      const result = await graphFetch(
        config,
        `${mediaId}/insights`,
        { metric: metrics.join(",") },
        graphInsightsListSchema,
      );

      const values = new Map<string, number>();
      for (const insight of result.data) {
        const raw = insight.values[0]?.value ?? 0;
        values.set(insight.name, Math.max(0, Math.round(raw)));
      }

      let plays = 0;
      for (const name of PLAY_METRIC_NAMES) {
        const value = values.get(name);
        if (value !== undefined) {
          plays = value;
          break;
        }
      }

      return {
        reach: values.get("reach") ?? 0,
        plays,
        saved: values.get("saved") ?? 0,
        shares: values.get("shares") ?? 0,
      };
    } catch (error) {
      if (!(error instanceof InstagramApiError)) throw error;

      // Эти ошибки сменой набора метрик не лечатся — нет смысла перебирать
      // оставшиеся ступени, только зря тратить квоту запросов.
      const hopeless =
        error.code === 190 || // токен истёк
        error.code === 10 ||
        error.code === 200 || // не хватает прав
        [4, 17, 32, 613].includes(error.code ?? 0) || // лимит частоты
        error.isInsightsUnavailable; // у этого видео статистики просто нет

      if (hopeless) throw error;

      lastError = error;
    }
  }

  throw lastError ?? new InstagramApiError("не удалось получить insights");
}

/**
 * Список медиа аккаунта с постраничной выдачей.
 *
 * Graph API отдаёт всё подряд — фото, карусели, сторис. Отбор рилсов делаем
 * здесь, по media_product_type.
 */
export async function fetchAccountReels(
  config: InstagramConfig,
): Promise<GraphMedia[]> {
  const collected: GraphMedia[] = [];
  let after: string | undefined;

  // Жёсткий потолок страниц — страховка от бесконечного цикла, если Meta
  // вернёт курсор, указывающий сам на себя.
  for (let page = 0; page < 10; page += 1) {
    const params: Record<string, string> = {
      fields: MEDIA_FIELDS,
      limit: String(Math.min(50, config.maxMedia)),
    };
    if (after) params.after = after;

    const result = await graphFetch(
      config,
      `${config.accountId}/media`,
      params,
      graphMediaListSchema,
    );

    collected.push(...result.data);

    after = result.paging?.cursors?.after;
    const hasNext = Boolean(result.paging?.next) && Boolean(after);
    if (!hasNext || collected.length >= config.maxMedia) break;
  }

  return collected
    .filter(
      (media) =>
        media.media_product_type === "REELS" ||
        // У части аккаунтов media_product_type не приходит вовсе —
        // тогда ориентируемся на тип медиа.
        (media.media_product_type === undefined && media.media_type === "VIDEO"),
    )
    .slice(0, config.maxMedia);
}

/** Метрики из полей медиа — те, что не зависят от версии insights. */
export function metricsFromMedia(media: GraphMedia): Pick<
  ReelMetrics,
  "likes" | "comments"
> {
  return {
    likes: media.like_count ?? 0,
    comments: media.comments_count ?? 0,
  };
}

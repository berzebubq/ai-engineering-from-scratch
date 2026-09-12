import { z } from "zod";

/**
 * Рантайм-валидация ответов Graph API.
 *
 * Ответ внешнего API — это недоверенные данные. TypeScript-типы стираются при
 * компиляции, и если Meta пришлёт null там, где обещала число, узнаем мы об
 * этом падением где-то в разметке дашборда. Поэтому проверяем на границе.
 *
 * Схемы намеренно нестрогие к ЛИШНИМ полям (Meta добавляет их регулярно) и
 * строгие к обязательным.
 */

export const graphMediaSchema = z.object({
  id: z.string().min(1),
  media_type: z.string(),
  media_product_type: z.string().optional(),
  permalink: z.string(),
  caption: z.string().optional(),
  thumbnail_url: z.string().optional(),
  media_url: z.string().optional(),
  timestamp: z.string(),
  // Meta отдаёт счётчики числом, но у скрытых лайков поле просто отсутствует.
  like_count: z.number().int().nonnegative().optional(),
  comments_count: z.number().int().nonnegative().optional(),
});

export const graphMediaListSchema = z.object({
  data: z.array(graphMediaSchema),
  paging: z
    .object({
      cursors: z
        .object({ before: z.string().optional(), after: z.string().optional() })
        .optional(),
      next: z.string().optional(),
      previous: z.string().optional(),
    })
    .optional(),
});

export const graphInsightSchema = z.object({
  name: z.string(),
  period: z.string().optional(),
  values: z.array(
    z.object({
      // Некоторые метрики приходят дробными; к целому приводим сами.
      value: z.number(),
      end_time: z.string().optional(),
    }),
  ),
});

export const graphInsightsListSchema = z.object({
  data: z.array(graphInsightSchema),
});

export const graphErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.number().optional(),
    error_subcode: z.number().optional(),
    fbtrace_id: z.string().optional(),
  }),
});

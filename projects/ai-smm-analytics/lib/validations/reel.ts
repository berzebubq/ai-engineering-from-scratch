import { z } from "zod";

/**
 * Схемы валидации для видео.
 *
 * Эти же схемы используются в server actions. Валидация на сервере
 * обязательна: server action — это обычный HTTP-эндпоинт, в него можно
 * послать что угодно в обход формы.
 */

export const REEL_TYPES = ["my", "competitor"] as const;

/**
 * Разрешённые хосты для ссылки на видео.
 *
 * Осознанное ограничение: инструмент про Instagram, и опечатка в ссылке
 * должна ловиться на вводе, а не всплывать через месяц пустой аналитикой.
 * Если понадобится складывать сюда TikTok или YouTube Shorts — допишите хост
 * в этот массив, менять больше ничего не нужно.
 */
const ALLOWED_HOSTS = ["instagram.com", "www.instagram.com"];

const reelUrl = z
  .string()
  .trim()
  .min(1, "Укажите ссылку на видео")
  .refine(
    (value) => {
      try {
        const { protocol, hostname } = new URL(value);
        return protocol === "https:" && ALLOWED_HOSTS.includes(hostname);
      } catch {
        return false;
      }
    },
    { message: "Нужна https-ссылка на Instagram, например https://www.instagram.com/reel/ABC123/" },
  );

/**
 * Счётчик просмотров/лайков/охвата.
 *
 * Из FormData всё приходит строками, поэтому число получаем явным Number(),
 * а не z.coerce: coerce глотает null и undefined, превращая пропущенное поле
 * в 0 вместо ошибки.
 */
const metric = (label: string) =>
  z
    .string({ message: `${label}: введите число` })
    .trim()
    // Пустое поле считаем нулём: необязательные метрики можно не заполнять.
    .transform((value) => (value === "" ? 0 : Number(value)))
    .refine((value) => Number.isFinite(value), `${label}: введите число`)
    .refine((value) => Number.isInteger(value), `${label}: только целое число`)
    .refine((value) => value >= 0, `${label}: не может быть отрицательным`)
    // Верхняя граница — предел postgres integer, дальше вставка упадёт в БД.
    .refine((value) => value <= 2_147_483_647, `${label}: слишком большое число`);

export const createReelSchema = z.object({
  url: reelUrl,
  reach: metric("Охват"),
  plays: metric("Просмотры"),
  likes: metric("Лайки"),
  saved: metric("Сохранения"),
  type: z.enum(REEL_TYPES, { message: "Выберите тип видео" }),
});

export type CreateReelInput = z.infer<typeof createReelSchema>;

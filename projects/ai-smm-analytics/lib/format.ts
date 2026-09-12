/**
 * Форматирование чисел и дат для интерфейса.
 *
 * Локаль ru-RU задана явно, а не взята из браузера: иначе сервер отрендерит
 * "1 234" с неразрывным пробелом, клиент — "1,234", и React сообщит о
 * рассинхроне гидрации.
 */

const NUMBER_FORMAT = new Intl.NumberFormat("ru-RU");

const COMPACT_FORMAT = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** 1234567 → "1 234 567" */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return NUMBER_FORMAT.format(value);
}

/** 1234567 → "1,2 млн". Для плотных мест вроде ячеек таблицы. */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return COMPACT_FORMAT.format(value);
}

/** ISO-строка из Postgres → "12 сент. 2026 г." */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FORMAT.format(date);
}

/** 0.0834 → "8,34%". База отдаёт numeric строкой, поэтому принимаем и string. */
export function formatEngagementRate(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numeric)) return "—";
  return `${(numeric * 100).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Короткий код видео из ссылки: .../reel/ABC123/ → "ABC123".
 * Нужен, чтобы в таблице не растягивать колонку полным URL.
 */
export function reelShortCode(url: string): string {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return segments.at(-1) ?? url;
  } catch {
    return url;
  }
}

export const REEL_TYPE_LABELS = {
  my: "Моё",
  competitor: "Конкурент",
} as const;

export const TAG_CATEGORY_LABELS = {
  character: "Персонаж",
  vibe: "Вайб",
  structure: "Структура",
  other: "Прочее",
} as const;

export const TAG_SOURCE_LABELS = {
  manual: "вручную",
  vision: "Vision",
  whisper: "Whisper",
  llm: "LLM",
} as const;

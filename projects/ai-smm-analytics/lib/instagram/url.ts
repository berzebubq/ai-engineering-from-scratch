/**
 * Нормализация ссылок на рилсы.
 *
 * url — ключ, по которому синхронизация находит уже существующую запись. Если
 * вы завели видео руками со ссылкой с "?igsh=..." на хвосте, а Graph API
 * вернул её же без параметров, без нормализации получатся две строки вместо
 * одной. Поэтому обе стороны прогоняют ссылку через эту функцию.
 *
 * Приводим к виду https://www.instagram.com/reel/<code>/
 */
export function normalizeReelUrl(raw: string): string {
  const trimmed = raw.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Не ссылка — отдаём как есть, пусть ругается валидация формы.
    return trimmed;
  }

  // Параметры и якорь к идентификации видео отношения не имеют.
  parsed.search = "";
  parsed.hash = "";
  parsed.protocol = "https:";

  if (parsed.hostname === "instagram.com") {
    parsed.hostname = "www.instagram.com";
  }

  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }

  return parsed.toString();
}

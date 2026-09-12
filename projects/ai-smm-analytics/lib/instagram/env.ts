import "server-only";

/**
 * Доступ к настройкам Graph API.
 *
 * Ни одна из переменных не имеет префикса NEXT_PUBLIC_ — и не должна иметь.
 * META_ACCESS_TOKEN даёт доступ к аккаунту, в браузер ему нельзя. Импорт
 * "server-only" делает случайную утечку ошибкой сборки, а не инцидентом.
 */

export interface InstagramConfig {
  accountId: string;
  accessToken: string;
  /** Базовый URL. Переопределяется в тестах, чтобы не ходить в живой Meta. */
  baseUrl: string;
  apiVersion: string;
  /** Сколько медиа тянуть максимум за одну синхронизацию. */
  maxMedia: number;
}

export class InstagramConfigError extends Error {
  constructor(missing: string[]) {
    super(
      `Не заданы переменные окружения: ${missing.join(", ")}.\n` +
        `Добавьте их в .env.local — см. .env.example.`,
    );
    this.name = "InstagramConfigError";
  }
}

export function getInstagramConfig(): InstagramConfig {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  const missing: string[] = [];
  if (!accountId) missing.push("INSTAGRAM_ACCOUNT_ID");
  if (!accessToken) missing.push("META_ACCESS_TOKEN");
  if (missing.length > 0) throw new InstagramConfigError(missing);

  const maxMedia = Number(process.env.META_MAX_MEDIA ?? 50);

  return {
    accountId: accountId!,
    accessToken: accessToken!,
    baseUrl: process.env.META_GRAPH_API_BASE_URL ?? "https://graph.facebook.com",
    apiVersion: process.env.META_GRAPH_API_VERSION ?? "v21.0",
    maxMedia: Number.isFinite(maxMedia) && maxMedia > 0 ? maxMedia : 50,
  };
}

/** Есть ли настройки вообще — чтобы UI мог не показывать кнопку синхронизации. */
export function hasInstagramConfig(): boolean {
  return Boolean(
    process.env.INSTAGRAM_ACCOUNT_ID && process.env.META_ACCESS_TOKEN,
  );
}

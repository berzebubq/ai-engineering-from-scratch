/**
 * Чтение переменных Supabase с понятной ошибкой вместо "undefined is not a
 * valid URL" где-то в глубине supabase-js.
 *
 * Обращение строго по полному имени process.env.NEXT_PUBLIC_*: Next.js
 * подставляет значения на этапе сборки текстовой заменой, поэтому
 * process.env[key] с вычисляемым ключом в браузере вернёт undefined.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Не задана переменная окружения ${name}.\n` +
        `Скопируйте .env.example в .env.local и заполните значения из ` +
        `Supabase Dashboard → Project Settings → API.`,
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
}

export function getSupabaseAnonKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

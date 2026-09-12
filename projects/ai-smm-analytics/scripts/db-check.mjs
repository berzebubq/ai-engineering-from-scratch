/**
 * Проверяет, что база готова к работе: таблицы на месте, RLS пускает,
 * generated-колонка считает.
 *
 *     npm run db:check
 *
 * Ходит тем же anon-ключом, что и приложение, — то есть проверяет ровно тот
 * путь, по которому пойдёт дашборд, а не привилегированный доступ.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Не заданы NEXT_PUBLIC_SUPABASE_URL и/или NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "Скопируйте .env.example в .env.local и заполните.",
  );
  process.exit(1);
}

const supabase = createClient(url, key);
const results = [];
const ok = (name, passed, note = "") =>
  results.push({ name, passed, note }) && passed;

const PROBE_URL = "https://www.instagram.com/reel/__db_check__/";

// 1. Таблицы существуют и читаются anon-ключом.
for (const table of ["reels", "tags", "reel_tags"]) {
  const { error, count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  // count === null означает, что ответ пришёл не от PostgREST (например,
  // прокси отдал заглушку) — считать это успехом нельзя.
  ok(
    `таблица ${table} читается`,
    !error && count !== null,
    error ? error.message : `строк: ${count}`,
  );
}

// 2. Стартовые теги засеяны.
const { data: tags } = await supabase.from("tags").select("id").limit(50);
ok(
  "стартовые теги на месте",
  (tags?.length ?? 0) >= 15,
  `найдено ${tags?.length ?? 0}, ожидали 15+`,
);

// 3. Запись проходит, и generated-колонка считает ER.
await supabase.from("reels").delete().eq("url", PROBE_URL); // на случай прошлого прогона
const { data: inserted, error: insertError } = await supabase
  .from("reels")
  .insert({
    url: PROBE_URL,
    reach: 1000, plays: 1200, likes: 80, saved: 10, comments: 5, shares: 5,
  })
  .select("id, engagement_rate")
  .single();

// 42501 = отказ по RLS. После перехода на раздел 6b это ОЖИДАЕМОЕ поведение:
// анонимный посетитель не должен уметь писать. Поэтому отказ по RLS — не
// провал проверки, а признак того, что база настроена по-боевому.
const rlsBlockedWrite = insertError?.code === "42501";
const canWrite = !insertError;

if (rlsBlockedWrite) {
  ok("запись закрыта для anon (prod-политики, раздел 6b)", true, "");
} else {
  ok(
    "anon может писать (dev-политики, раздел 6a)",
    !insertError,
    insertError ? `${insertError.code ?? ""} ${insertError.message}`.trim() : "",
  );
}

if (canWrite && inserted) {
  ok(
    "engagement_rate считается базой",
    Number(inserted.engagement_rate) === 0.1,
    `получили ${inserted.engagement_rate}, ожидали 0.1`,
  );
  const { error: delError } = await supabase
    .from("reels")
    .delete()
    .eq("id", inserted.id);
  ok("тестовая строка удалена", !delError, delError?.message ?? "");
}

// Отчёт
console.log("");
for (const r of results) {
  console.log(
    `${r.passed ? "OK  " : "FAIL"}  ${r.name}${r.note ? "  — " + r.note : ""}`,
  );
}

const failed = results.filter((r) => !r.passed);
if (failed.length === 0) {
  console.log("\nБаза готова. Запускайте: npm run dev");
  if (canWrite) {
    console.log(
      "\nНапоминание: anon-ключ сейчас может писать и удалять — это раздел 6a\n" +
        "(DEV ONLY) в supabase-schema.sql. Перед публичным деплоем замените его\n" +
        "на раздел 6b.",
    );
  }
  if (rlsBlockedWrite) {
    console.log(
      "\nЗапись для anon закрыта — значит, включён раздел 6b. Форма «Добавить\n" +
        "видео» при этом работать не будет, пока в приложении нет авторизации.",
    );
  }
} else {
  console.log(
    `\n${failed.length} проверок не прошло. Скорее всего не применена схема:\n` +
      "npm run db:push  (или вставьте supabase-schema.sql в SQL Editor).",
  );
  process.exit(1);
}

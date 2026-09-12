/**
 * Применяет supabase-schema.sql к базе из DATABASE_URL.
 *
 *     npm run db:push
 *
 * Нужен psql в PATH. Если его нет — скрипт скажет, что делать вместо этого.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = join(root, "supabase-schema.sql");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL не задан.\n" +
      "Добавьте его в .env.local — строка из Supabase Dashboard → Connect.\n" +
      "Это единственное, для чего он нужен; само приложение работает на anon-ключе.",
  );
  process.exit(1);
}

if (!existsSync(schema)) {
  console.error(`Не найден ${schema}`);
  process.exit(1);
}

const psql = spawnSync("psql", ["--version"], { encoding: "utf8" });
if (psql.error) {
  console.error(
    "psql не найден в PATH.\n\n" +
      "Либо установите его (macOS: brew install libpq), либо примените схему руками:\n" +
      "Supabase Dashboard → SQL Editor → New query → вставить supabase-schema.sql → Run.",
  );
  process.exit(1);
}

console.log("Применяем supabase-schema.sql…\n");

// ON_ERROR_STOP=1 — иначе psql проглотит ошибку в середине и отрапортует успех.
const result = spawnSync(
  "psql",
  [url, "-v", "ON_ERROR_STOP=1", "-f", schema],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  console.error(
    "\nСхема не применилась.\n\n" +
      "Частая причина — прямое подключение db.<ref>.supabase.co работает только\n" +
      "по IPv6. Если у вашего провайдера его нет, возьмите строку пулера\n" +
      "(Dashboard → Connect → Session pooler) — она по IPv4.",
  );
  process.exit(result.status ?? 1);
}

console.log("\nГотово. Теперь: npm run db:check");

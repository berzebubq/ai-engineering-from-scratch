"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Не сбой данных, а устаревшая вкладка: после выкатки новой версии имена
 * js-чанков меняются, и открытая до деплоя страница просит файл, которого уже
 * нет. Лечится перезагрузкой, а не правкой конфигурации, — и говорить про
 * .env.local в этом случае значило бы отправить человека не туда.
 */
function isStaleBuildError(error: Error): boolean {
  return /loading chunk|failed to load chunk|ChunkLoadError|dynamically imported module/i.test(
    `${error.name} ${error.message}`,
  );
}

/**
 * Граница ошибок для всего приложения.
 *
 * Сюда прилетают, в частности, ошибки Supabase из серверных компонентов:
 * не заданы переменные окружения, не применена схема, RLS не пускает.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // В Спринте 1 — просто в консоль. Sentry или аналог подключим позже.
    console.error(error);
  }, [error]);

  const stale = isStaleBuildError(error);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {stale ? "Страница устарела" : "Что-то сломалось"}
      </h1>

      <p className="text-muted-foreground mt-2">
        {stale
          ? "Вышла новая версия приложения, пока вкладка была открыта. Перезагрузите страницу."
          : "Чаще всего причина — не заполненный .env.local или не применённый supabase-schema.sql."}
      </p>

      <pre className="bg-muted text-muted-foreground mt-4 max-w-full overflow-x-auto rounded-md p-3 text-left text-xs">
        {error.message}
      </pre>

      <Button
        onClick={stale ? () => window.location.reload() : reset}
        className="mt-6"
      >
        {stale ? "Перезагрузить" : "Попробовать снова"}
      </Button>
    </main>
  );
}

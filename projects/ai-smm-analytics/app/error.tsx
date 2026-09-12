"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

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

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Что-то сломалось</h1>
      <p className="text-muted-foreground mt-2">
        Чаще всего причина — не заполненный .env.local или не применённый
        supabase-schema.sql.
      </p>
      <pre className="bg-muted text-muted-foreground mt-4 max-w-full overflow-x-auto rounded-md p-3 text-left text-xs">
        {error.message}
      </pre>
      <Button onClick={reset} className="mt-6">
        Попробовать снова
      </Button>
    </main>
  );
}

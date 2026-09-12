import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Страница не найдена
      </h1>
      <p className="text-muted-foreground mt-2">
        Возможно, видео удалили или ссылка содержит опечатку.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">К списку видео</Link>
      </Button>
    </main>
  );
}

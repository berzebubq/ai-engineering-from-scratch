"use client";

import { useState } from "react";
import { Film } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Превью видео.
 *
 * Клиентский компонент ради одного: обработки onError.
 *
 * Ссылки на обложки, которые отдаёт Graph API, подписаны и живут ограниченное
 * время. Через несколько дней после синхронизации они начинают отдавать 403, и
 * без этой обработки в таблице вместо картинок расползался бы alt-текст.
 * Настоящее решение — складывать обложки в Supabase Storage, это Спринт 3;
 * до тех пор просто аккуратно откатываемся на заглушку.
 *
 * alt пустой намеренно: рядом всегда стоит название и подпись видео, так что
 * для скринридера картинка декоративная, а дублирование только мешает.
 */
export function ReelThumbnail({
  url,
  className,
}: {
  url?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(url) && !failed;

  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border",
        className,
      )}
    >
      {showImage ? (
        // Обычный <img>, а не next/image: домены Instagram CDN меняются от
        // аккаунта к аккаунту, и настраивать remotePatterns имеет смысл, когда
        // обложки начнут храниться у нас.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url!}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Film className="size-4" aria-hidden />
      )}
    </div>
  );
}

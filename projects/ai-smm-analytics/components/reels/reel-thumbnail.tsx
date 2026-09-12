import { Film } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Превью видео.
 *
 * Заглушка Спринта 1: колонка thumbnail_url в базе уже есть, но заполнять её
 * будет парсер Instagram. Пока картинки нет — рисуем плейсхолдер в пропорции
 * 9:16, чтобы верстка не прыгала, когда превью появятся.
 */
export function ReelThumbnail({
  url,
  alt,
  className,
}: {
  url?: string | null;
  alt?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border",
        className,
      )}
    >
      {url ? (
        // Обычный <img>, а не next/image: домены Instagram CDN меняются, и
        // настраивать remotePatterns имеет смысл, когда появится парсер.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt ?? ""}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <Film className="size-4" aria-hidden />
      )}
    </div>
  );
}

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { ReelThumbnail } from "@/components/reels/reel-thumbnail";
import { ReelTypeBadge } from "@/components/reels/reel-type-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompact, formatNumber, reelShortCode } from "@/lib/format";
import type { Reel } from "@/types/database";

/** Пустое состояние — отдельно, чтобы не городить тернарники в разметке. */
function EmptyState() {
  return (
    <div className="text-muted-foreground px-6 py-16 text-center">
      <p className="text-foreground font-medium">Пока ни одного видео</p>
      <p className="mt-1 text-sm">
        Нажмите «Добавить видео», чтобы завести первую запись.
      </p>
    </div>
  );
}

/**
 * Таблица со списком видео.
 *
 * Серверный компонент: интерактивности нет, поэтому в браузер не уезжает
 * ни килобайта JS.
 */
export function ReelsTable({ reels }: { reels: Reel[] }) {
  if (reels.length === 0) {
    return <EmptyState />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[72px]">Превью</TableHead>
          <TableHead>Видео</TableHead>
          <TableHead className="text-right">Просмотры</TableHead>
          <TableHead className="text-right">Охват</TableHead>
          <TableHead>Тип</TableHead>
          <TableHead className="w-[40px]" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {reels.map((reel) => (
          <TableRow key={reel.id}>
            <TableCell>
              <ReelThumbnail
                url={reel.thumbnail_url}
                className="h-16 w-9"
              />
            </TableCell>

            <TableCell className="max-w-[280px]">
              {/*
                Вся строка ведёт на карточку видео, а не на Instagram:
                внутренняя страница — основной сценарий, внешняя ссылка
                вынесена отдельной иконкой справа.
              */}
              <Link
                href={`/reels/${reel.id}`}
                className="hover:underline focus-visible:ring-ring/50 rounded-sm font-medium focus-visible:ring-[3px] focus-visible:outline-none"
              >
                {reelShortCode(reel.url)}
              </Link>
              {reel.caption && (
                <p className="text-muted-foreground truncate text-sm">
                  {reel.caption}
                </p>
              )}
            </TableCell>

            {/* tabular-nums — чтобы цифры в колонке выстраивались по разрядам. */}
            <TableCell
              className="text-right tabular-nums"
              title={formatNumber(reel.plays)}
            >
              {formatCompact(reel.plays)}
            </TableCell>
            <TableCell
              className="text-muted-foreground text-right tabular-nums"
              title={formatNumber(reel.reach)}
            >
              {formatCompact(reel.reach)}
            </TableCell>

            <TableCell>
              <ReelTypeBadge type={reel.type} />
            </TableCell>

            <TableCell>
              <a
                href={reel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex p-1"
              >
                <ExternalLink className="size-4" />
                <span className="sr-only">Открыть в Instagram</span>
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

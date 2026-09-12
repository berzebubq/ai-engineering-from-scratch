import Link from "next/link";
import { Trophy } from "lucide-react";

import { ReelThumbnail } from "@/components/reels/reel-thumbnail";
import { ReelTypeBadge } from "@/components/reels/reel-type-badge";
import { Card, CardContent } from "@/components/ui/card";
import { engagementRate } from "@/lib/analytics";
import {
  formatCompact,
  formatEngagementRate,
  reelShortCode,
} from "@/lib/format";
import type { Reel } from "@/types/database";

/**
 * Тройка лучших видео по engagement rate.
 *
 * Серверный компонент: ничего интерактивного, кроме обычных ссылок.
 */
export function TopReels({ reels }: { reels: Reel[] }) {
  if (reels.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          <Trophy className="mx-auto mb-2 size-5" aria-hidden />
          <p className="text-foreground font-medium">Топ пока не собрать</p>
          <p className="mt-1">
            Engagement rate считается от охвата — нужно хотя бы одно видео
            с ненулевым охватом.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reels.map((reel, index) => (
        <Card key={reel.id} className="gap-0 py-4">
          <CardContent className="flex gap-3 px-4">
            <div className="relative">
              <ReelThumbnail
                url={reel.thumbnail_url}
                className="h-24 w-[54px]"
              />
              {/* Место в рейтинге — цифрой: порядок карточек на узком экране
                  перестаёт читаться, когда они встают в столбец. */}
              <span className="bg-foreground text-background absolute -top-2 -left-2 flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
                {index + 1}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/reels/${reel.id}`}
                  className="focus-visible:ring-ring/50 truncate rounded-sm font-medium hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  {reelShortCode(reel.url)}
                </Link>
                <ReelTypeBadge type={reel.type} />
              </div>

              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatEngagementRate(engagementRate(reel))}
              </p>
              <p className="text-muted-foreground text-xs">
                engagement rate
              </p>

              <dl className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                <div className="flex gap-1">
                  <dt>охват</dt>
                  <dd className="text-foreground tabular-nums">
                    {formatCompact(reel.reach)}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt>лайки</dt>
                  <dd className="text-foreground tabular-nums">
                    {formatCompact(reel.likes)}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt>сохр.</dt>
                  <dd className="text-foreground tabular-nums">
                    {formatCompact(reel.saved)}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

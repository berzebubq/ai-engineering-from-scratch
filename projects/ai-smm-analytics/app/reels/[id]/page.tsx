import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";

import { ReelThumbnail } from "@/components/reels/reel-thumbnail";
import { ReelTypeBadge } from "@/components/reels/reel-type-badge";
import { StatCard } from "@/components/reels/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TAG_CATEGORY_LABELS,
  TAG_SOURCE_LABELS,
  formatDate,
  formatEngagementRate,
  formatNumber,
  reelShortCode,
} from "@/lib/format";
import { engagementRate } from "@/lib/analytics";
import { getReelWithTags } from "@/lib/queries/reels";
import type { ReelWithTags } from "@/types/database";
import type { TagCategory } from "@/types/database";

/** Порядок категорий на странице — от «что в кадре» к «как снято». */
const CATEGORY_ORDER: TagCategory[] = [
  "character",
  "vibe",
  "structure",
  "other",
];

function TagSection({ tags }: { tags: ReelWithTags["tags"] }) {
  if (tags.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed px-6 py-10 text-center">
        <Sparkles className="mx-auto mb-2 size-5" aria-hidden />
        <p className="text-foreground font-medium">Тегов пока нет</p>
        <p className="mt-1 text-sm">
          Ручная разметка и авторазметка через Vision API и Whisper появятся
          в следующем спринте.
        </p>
      </div>
    );
  }

  // Группируем по категориям один раз, а не фильтруем массив в каждой секции.
  const grouped = new Map<TagCategory, ReelWithTags["tags"]>();
  for (const tag of tags) {
    const bucket = grouped.get(tag.category) ?? [];
    bucket.push(tag);
    grouped.set(tag.category, bucket);
  }

  return (
    <div className="grid gap-5">
      {CATEGORY_ORDER.filter((category) => grouped.has(category)).map(
        (category) => (
          <div key={category}>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              {TAG_CATEGORY_LABELS[category]}
            </h3>
            <div className="flex flex-wrap gap-2">
              {grouped.get(category)!.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  // Машинную разметку подписываем источником, ручную — нет:
                  // иначе каждый тег тащил бы за собой бесполезное «вручную».
                  title={
                    tag.source === "manual"
                      ? undefined
                      : `${TAG_SOURCE_LABELS[tag.source]}${
                          tag.confidence === null
                            ? ""
                            : ` · ${Math.round(tag.confidence * 100)}%`
                        }`
                  }
                >
                  {tag.name}
                  {tag.source !== "manual" && (
                    <span className="text-muted-foreground">
                      {TAG_SOURCE_LABELS[tag.source]}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export default async function ReelPage({ params }: PageProps<"/reels/[id]">) {
  // В Next 16 params — промис, его нужно дождаться.
  const { id } = await params;

  const reel = await getReelWithTags(id);
  if (!reel) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/">
          <ArrowLeft />К списку видео
        </Link>
      </Button>

      <header className="mt-4 flex flex-wrap items-start gap-5">
        <ReelThumbnail
          url={reel.thumbnail_url}
          className="h-40 w-[90px]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {reelShortCode(reel.url)}
            </h1>
            <ReelTypeBadge type={reel.type} />
          </div>

          {reel.caption && (
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {reel.caption}
            </p>
          )}

          <dl className="text-muted-foreground mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt>Опубликовано:</dt>
              <dd className="text-foreground">
                {formatDate(reel.published_at)}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Добавлено:</dt>
              <dd className="text-foreground">{formatDate(reel.created_at)}</dd>
            </div>
          </dl>

          <Button asChild variant="outline" size="sm" className="mt-4">
            <a href={reel.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Открыть в Instagram
            </a>
          </Button>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="sr-only">Статистика</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Просмотры" value={formatNumber(reel.plays)} />
          <StatCard label="Охват" value={formatNumber(reel.reach)} />
          <StatCard label="Лайки" value={formatNumber(reel.likes)} />
          <StatCard label="Сохранения" value={formatNumber(reel.saved)} />
          <StatCard label="Комментарии" value={formatNumber(reel.comments)} />
          <StatCard label="Репосты" value={formatNumber(reel.shares)} />
        </div>

        <div className="mt-4">
          <StatCard
            label="Engagement rate"
            value={formatEngagementRate(engagementRate(reel))}
            hint="(лайки + сохранения) ÷ охват"
          />
        </div>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Теги</CardTitle>
          <CardDescription>
            Атрибуты, по которым будем искать закономерности между креативом
            и охватами.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TagSection tags={reel.tags} />
        </CardContent>
      </Card>
    </main>
  );
}

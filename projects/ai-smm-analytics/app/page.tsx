import { PlaysChart } from "@/components/dashboard/plays-chart";
import { SyncButton } from "@/components/dashboard/sync-button";
import { TopReels } from "@/components/dashboard/top-reels";
import { AddReelDialog } from "@/components/reels/add-reel-dialog";
import { ReelsTable } from "@/components/reels/reels-table";
import { StatCard } from "@/components/reels/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { playsByDate, topReelsByEngagement } from "@/lib/analytics";
import { formatCompact, formatDate } from "@/lib/format";
import { hasInstagramConfig } from "@/lib/instagram/env";
import { getReels } from "@/lib/queries/reels";

/**
 * Главная страница дашборда.
 *
 * Серверный компонент: один запрос к базе, из него считаются и плитки,
 * и график, и топ-3. Клиентскими остаются только график (recharts требует
 * браузерного API) и две кнопки.
 */
export default async function DashboardPage() {
  const reels = await getReels();

  const myReels = reels.filter((reel) => reel.type === "my");
  const competitorReels = reels.filter((reel) => reel.type === "competitor");
  const totalPlays = reels.reduce((sum, reel) => sum + reel.plays, 0);

  const chartData = playsByDate(reels);
  const topReels = topReelsByEngagement(reels, 3);

  // Когда была последняя синхронизация — берём максимум по synced_at.
  const lastSynced = reels
    .map((reel) => reel.synced_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            AI Pet-SMM Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Аналитика рилсов: свои ролики и конкуренты в одной таблице.
          </p>
          {lastSynced && (
            <p className="text-muted-foreground mt-1 text-xs">
              Данные из Instagram обновлялись {formatDate(lastSynced)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <SyncButton configured={hasInstagramConfig()} />
          <AddReelDialog />
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Всего видео" value={String(reels.length)} />
        <StatCard label="Моих" value={String(myReels.length)} />
        <StatCard label="Конкурентов" value={String(competitorReels.length)} />
        <StatCard
          label="Суммарные просмотры"
          value={formatCompact(totalPlays)}
        />
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Динамика проигрываний</CardTitle>
          <CardDescription>
            Сумма проигрываний по датам публикации. Видео, заведённые вручную,
            считаются по дате добавления.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <PlaysChart data={chartData} />
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">Топ-3 видео</h2>
        <p className="text-muted-foreground mt-1 mb-4 text-sm">
          По engagement rate: (лайки + сохранения) ÷ охват
        </p>
        <TopReels reels={topReels} />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Все видео
        </h2>
        <Card className="gap-0 overflow-hidden py-0">
          <CardContent className="px-0">
            <ReelsTable reels={reels} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

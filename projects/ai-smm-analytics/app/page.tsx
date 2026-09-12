import { AddReelDialog } from "@/components/reels/add-reel-dialog";
import { ReelsTable } from "@/components/reels/reels-table";
import { StatCard } from "@/components/reels/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { getReels } from "@/lib/queries/reels";
import { formatCompact } from "@/lib/format";

/**
 * Главная страница дашборда.
 *
 * Серверный компонент: данные читаются прямо здесь, без API-роута и без
 * состояния загрузки на клиенте.
 */
export default async function DashboardPage() {
  const reels = await getReels();

  const myReels = reels.filter((reel) => reel.type === "my");
  const competitorReels = reels.filter((reel) => reel.type === "competitor");
  const totalPlays = reels.reduce((sum, reel) => sum + reel.plays, 0);

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
        </div>
        <AddReelDialog />
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

      <Card className="mt-8 gap-0 overflow-hidden py-0">
        <CardContent className="px-0">
          <ReelsTable reels={reels} />
        </CardContent>
      </Card>
    </main>
  );
}

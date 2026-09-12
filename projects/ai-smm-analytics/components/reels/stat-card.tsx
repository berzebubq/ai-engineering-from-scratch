import { Card, CardContent, CardDescription } from "@/components/ui/card";

/** Плитка с одной метрикой. Используется на карточке видео и в шапке дашборда. */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <CardDescription>{label}</CardDescription>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}

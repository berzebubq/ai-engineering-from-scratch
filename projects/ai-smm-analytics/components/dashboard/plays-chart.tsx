"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PlaysPoint } from "@/lib/analytics";
import { formatCompact, formatNumber } from "@/lib/format";

/**
 * Подпись значения на пиковой точке.
 *
 * Ровно одна на график: цифра у каждой точки — это шум, который перестают
 * читать. Пик — единственное, ради чего в такой график обычно смотрят.
 * Запас сверху (margin.top) оставлен специально, чтобы подпись не обрезалась.
 */
function PeakLabel({
  x,
  y,
  value,
  index,
  peakIndex,
}: {
  x?: number;
  y?: number;
  value?: number;
  index?: number;
  peakIndex: number;
}) {
  if (index !== peakIndex || x === undefined || y === undefined) return null;

  return (
    <text
      x={x}
      y={y - 12}
      textAnchor="middle"
      className="fill-foreground text-xs font-medium tabular-nums"
    >
      {formatCompact(value ?? 0)}
    </text>
  );
}

/** Подпись оси X: 2026-09-01 → «1 сен». */
function formatAxisDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Подсказка при наведении.
 *
 * Своя, а не дефолтная из recharts: та рисуется белым прямоугольником, который
 * в тёмной теме выглядит дырой, и не знает про русские подписи.
 */
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PlaysPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{formatAxisDate(point.date)}</p>
      <p className="tabular-nums">{formatNumber(point.plays)} проигрываний</p>
      <p className="text-muted-foreground text-xs">
        {point.reels === 1 ? "1 видео" : `${point.reels} видео`}
      </p>
    </div>
  );
}

export function PlaysChart({ data }: { data: PlaysPoint[] }) {
  // Линия соединяет точки. Одной точки для неё недостаточно — честнее сказать
  // об этом, чем рисовать пустую сетку.
  if (data.length < 2) {
    return (
      <div className="text-muted-foreground flex h-[280px] items-center justify-center px-6 text-center text-sm">
        {data.length === 0
          ? "Нет данных для графика — добавьте видео или синхронизируйте статистику."
          : "Для графика нужно минимум два дня с публикациями. Пока есть только один."}
      </div>
    );
  }

  // Индекс пика считаем один раз: подпись рисуется только на нём.
  const peakIndex = data.reduce(
    (best, point, index) => (point.plays > data[best].plays ? index : best),
    0,
  );

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 28, right: 24, bottom: 8, left: 8 }}
        >
          {/* Сетка только горизонтальная и волосяная: она помогает считывать
              значения, но не должна спорить с данными за внимание. */}
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompact(value)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            width={52}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          />
          <Line
            // linear, а не monotone: сглаживание пририсовало бы между точками
            // плавные подъёмы и провалы, которых в данных нет. Каждая точка —
            // измеренная сумма за сутки, и соединять их надо прямо.
            type="linear"
            dataKey="plays"
            stroke="var(--viz-series-1)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            // Кольцо цветом поверхности отделяет точку от линии там,
            // где они накладываются.
            dot={{
              r: 4,
              fill: "var(--viz-series-1)",
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: "var(--viz-series-1)",
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
            label={<PeakLabel peakIndex={peakIndex} />}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

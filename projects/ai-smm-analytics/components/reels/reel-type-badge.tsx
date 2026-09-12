import { Badge } from "@/components/ui/badge";
import { REEL_TYPE_LABELS } from "@/lib/format";
import type { ReelType } from "@/types/database";

/** Цветовая метка "Моё" / "Конкурент". */
export function ReelTypeBadge({ type }: { type: ReelType }) {
  return (
    <Badge variant={type === "my" ? "default" : "secondary"}>
      {REEL_TYPE_LABELS[type]}
    </Badge>
  );
}

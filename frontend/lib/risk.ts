/**
 * Risk score → label/color mapping.
 *
 * Single source of truth for the frontend. Mirrors the same buckets as
 * `app/utils/risk_labels.py` on the backend — keep them in sync.
 *
 * Buckets:
 *   >= 70   Kritik   (red)
 *   50-69   Yüksek   (orange)
 *   30-49   Orta     (yellow)
 *   0-29    Düşük    (green)
 */

export type RiskLabel = "Kritik" | "Yüksek" | "Orta" | "Düşük";

export function riskLabel(score: number | null | undefined): RiskLabel {
  if (score == null || Number.isNaN(score)) return "Düşük";
  const s = Math.round(Number(score));
  if (s >= 70) return "Kritik";
  if (s >= 50) return "Yüksek";
  if (s >= 30) return "Orta";
  return "Düşük";
}

/** Hex color matching the label, identical to the backend palette. */
export function riskColor(score: number | null | undefined): string {
  return RISK_COLORS[riskLabel(score)];
}

export const RISK_COLORS: Record<RiskLabel, string> = {
  Kritik: "#EF4444",
  Yüksek: "#F97316",
  Orta: "#FBBF24",
  Düşük: "#22C55E",
};

/** Tailwind class triplet for badges/pills. */
export const RISK_TW: Record<RiskLabel, { color: string; bg: string; border: string }> = {
  Kritik: { color: "text-danger", bg: "bg-danger/10", border: "border-danger/30" },
  Yüksek: { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  Orta: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  Düşük: { color: "text-success", bg: "bg-success/10", border: "border-success/30" },
};

export function riskBarClass(score: number | null | undefined): string {
  const lbl = riskLabel(score);
  if (lbl === "Kritik") return "bg-danger";
  if (lbl === "Yüksek") return "bg-orange-400";
  if (lbl === "Orta") return "bg-yellow-400";
  return "bg-success";
}

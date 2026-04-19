"use client";

export function getTierFromRep(rep: number): { name: string; tier: "bronze" | "silver" | "gold" } {
  if (rep >= 20) return { name: "Gold", tier: "gold" };
  if (rep >= 5) return { name: "Silver", tier: "silver" };
  return { name: "Bronze", tier: "bronze" };
}

const TIER_STYLES = {
  bronze: "bg-amber-50 text-amber-700",
  silver: "bg-gray-100 text-gray-600",
  gold: "bg-brand-yellow/20 text-amber-700",
} as const;

export function TierBadge({ rep }: { rep: number }) {
  const { name, tier } = getTierFromRep(rep);
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TIER_STYLES[tier]}`}>
      {name}
    </span>
  );
}

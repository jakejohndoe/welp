"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { useEffect, useState } from "react";
import Link from "next/link";
import { type Address } from "viem";
import {
  ADDRESSES,
  REVIEW_REGISTRY_ABI,
  REWARDS_VAULT_ABI,
} from "@/lib/contracts";

function getTierInfo(rep: number) {
  if (rep >= 20)
    return {
      name: "Gold",
      emoji: "🥇",
      color: "text-amber-600",
      barColor: "from-amber-400 to-amber-500",
    };
  if (rep >= 5)
    return {
      name: "Silver",
      emoji: "🥈",
      color: "text-blue-600",
      barColor: "from-blue-400 to-blue-500",
    };
  return {
    name: "Bronze",
    emoji: "🟤",
    color: "text-[#A67C52]",
    barColor: "from-[#C9A27A] to-[#A67C52]",
  };
}

export function TierProgressCard({ address }: { address: Address }) {
  const { data: reputation } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "reputation",
    args: [address],
    query: { enabled: !!address },
  });

  const { data: tierData } = useReadContracts({
    contracts: [
      { address: ADDRESSES.RewardsVault, abi: REWARDS_VAULT_ABI, functionName: "tier2Threshold" },
      { address: ADDRESSES.RewardsVault, abi: REWARDS_VAULT_ABI, functionName: "tier3Threshold" },
    ],
  });

  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const r = Number(reputation || 0);
    const threshold =
      tierData?.[1]?.status === "success" ? Number(tierData[1].result) : 20;
    const target = Math.min(100, Math.max(2, (r / threshold) * 100));
    const raf = requestAnimationFrame(() => setBarWidth(target));
    return () => cancelAnimationFrame(raf);
  }, [reputation, tierData]);

  const rep = Number(reputation || 0);
  const tier = getTierInfo(rep);
  const t3Threshold =
    tierData?.[1]?.status === "success" ? Number(tierData[1].result) : 20;

  return (
    <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-lg">{tier.emoji}</span>
          <span className={`font-semibold ${tier.color}`}>{tier.name}</span>
          <div
            role="progressbar"
            aria-valuenow={rep}
            aria-valuemin={0}
            aria-valuemax={t3Threshold}
            aria-label="Earn XP when others upvote your reviews. Silver at 5 rep, Gold at 20. Upvotes +1, downvotes -1."
            title="Earn XP when others upvote your reviews. Silver at 5 rep, Gold at 20. Upvotes +1, downvotes -1."
            className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"
          >
            <div
              className={`h-full bg-gradient-to-r ${tier.barColor} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <span className="text-sm text-gray-500">
            {rep} Reputation / {t3Threshold}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {rep >= 20 ? "Elite Reviewer" : rep >= 5 ? "Rising Reviewer" : "New Reviewer"}
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Earn XP when others upvote your reviews.{" "}
        <Link
          href="/docs#tiers"
          className="text-brand-primary/80 hover:text-brand-primary hover:underline"
        >
          Learn more →
        </Link>
      </p>
    </div>
  );
}

export { getTierInfo };

"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import {
  ADDRESSES,
  REVIEW_REGISTRY_ABI,
  WELP_TOKEN_ABI,
  REWARDS_VAULT_ABI,
} from "@/lib/contracts";
import Link from "next/link";

const AVATARS = [
  "/avatars/basic-woman-avatar.png",
  "/avatars/blonde-male-avatar.png",
  "/avatars/boutique-owner-avatar.png",
  "/avatars/businessman-avatar.png",
  "/avatars/chef-avatar.png",
  "/avatars/gardener-avatar.png",
  "/avatars/headwrap-person-avatar.png",
  "/avatars/librarian-avatar.png",
  "/avatars/mechanic-avatar.png",
];

function getTierInfo(rep: number) {
  if (rep >= 20) return { name: "Gold", emoji: "🥇", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", xpMax: 999, barColor: "from-amber-400 to-amber-500" };
  if (rep >= 5) return { name: "Silver", emoji: "🥈", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", xpMax: 499, barColor: "from-blue-400 to-blue-500" };
  return { name: "Bronze", emoji: "🟤", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", xpMax: 499, barColor: "from-orange-400 to-orange-500" };
}

export default function Profile() {
  const { address, isConnected } = useAccount();

  const { data: welpBalance } = useReadContract({
    address: ADDRESSES.WelpToken,
    abi: WELP_TOKEN_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: reputation } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "reputation",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: nextReviewId } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "nextReviewId",
  });

  const { data: tierData } = useReadContracts({
    contracts: [
      { address: ADDRESSES.RewardsVault, abi: REWARDS_VAULT_ABI, functionName: "tier2Threshold" },
      { address: ADDRESSES.RewardsVault, abi: REWARDS_VAULT_ABI, functionName: "tier3Threshold" },
    ],
  });

  const reviewCount = Number(nextReviewId || 0);
  const { data: allReviews } = useReadContracts({
    contracts: Array.from({ length: reviewCount }, (_, i) => ({
      address: ADDRESSES.ReviewRegistry,
      abi: REVIEW_REGISTRY_ABI,
      functionName: "reviews" as const,
      args: [BigInt(i)],
    })),
    query: { enabled: reviewCount > 0 && !!address },
  });

  const { data: nextBusinessId } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "nextBusinessId",
  });

  const businessCount = Number(nextBusinessId || 0);
  const { data: businessesData } = useReadContracts({
    contracts: Array.from({ length: businessCount }, (_, i) => ({
      address: ADDRESSES.ReviewRegistry,
      abi: REVIEW_REGISTRY_ABI,
      functionName: "businesses" as const,
      args: [BigInt(i + 1)],
    })),
    query: { enabled: businessCount > 0 },
  });

  const businessNames: Record<string, string> = {};
  businessesData?.forEach((b) => {
    if (b.status === "success") {
      const [id, name] = b.result as unknown as [bigint, string, string, string, boolean];
      businessNames[id.toString()] = name;
    }
  });

  const userReviews =
    allReviews
      ?.filter((r) => r.status === "success")
      .map((r) => {
        const res = r.result as unknown as [bigint, bigint, string, number, string, bigint, bigint, bigint];
        const [id, businessId, reviewer, rating, ipfsHash, timestamp, upvotes, downvotes] = res;
        return { id, businessId, reviewer, rating, ipfsHash, timestamp, upvotes, downvotes };
      })
      .filter((r) => r.reviewer.toLowerCase() === address?.toLowerCase()) || [];

  if (!isConnected) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Dashboard
        </h1>
        <p className="text-gray-500 text-lg">
          Connect your wallet to view your dashboard.
        </p>
      </div>
    );
  }

  const rep = Number(reputation || 0);
  const tier = getTierInfo(rep);
  const balance = welpBalance ? formatUnits(welpBalance as bigint, 18) : "0";
  const balanceNum = Number(balance);

  const t2Threshold =
    tierData?.[0]?.status === "success" ? Number(tierData[0].result) : 5;
  const t3Threshold =
    tierData?.[1]?.status === "success" ? Number(tierData[1].result) : 20;

  // Pick a deterministic avatar based on address
  const avatarIndex = address ? parseInt(address.slice(2, 4), 16) % AVATARS.length : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          You&apos;ve earned {balanceNum.toFixed(0)} points. Keep exploring to earn more!
        </p>
      </div>

      {/* Tier Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-lg">{tier.emoji}</span>
          <span className={`font-semibold ${tier.color}`}>{tier.name}</span>
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${tier.barColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(2, (rep / t3Threshold) * 100))}%` }}
            />
          </div>
          <span className="text-sm text-gray-400">{rep} XP / {t3Threshold}</span>
        </div>
        <div className="text-sm text-gray-400">
          Badges: <span className="text-gray-300 italic">No badges yet</span>
        </div>
      </div>

      {/* 4 Stat Cards — matches v1 dashboard layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Visits */}
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">📍 Total Visits</span>
            <span className="ml-auto w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-[10px] text-green-600">✓</span>
          </div>
          <p className="text-3xl font-bold text-[#4A90E2]">{userReviews.length}</p>
          <p className="text-sm text-gray-400 mt-1">Places visited</p>
        </div>

        {/* Reviews Written */}
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">✏️ Reviews Written</span>
            <span className="ml-auto w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600">✓</span>
          </div>
          <p className="text-3xl font-bold text-[#4A90E2]">{userReviews.length}</p>
          <p className="text-sm text-gray-400 mt-1">Helpful reviews</p>
        </div>

        {/* Points Balance */}
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">🏅 Points Balance</span>
          </div>
          {/* Donut-style circle */}
          <div className="flex justify-center my-2">
            <div className="w-16 h-16 rounded-full border-4 border-gray-100 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-900">{balanceNum.toFixed(0)}</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 text-center mt-1">Reward unlocked!</p>
        </div>

        {/* Explore */}
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">🔍 Explore</span>
          </div>
          <Link href="/" className="text-xl font-semibold text-purple-600 hover:underline">
            Discover
          </Link>
          <p className="text-sm text-gray-400 mt-1">Find new businesses</p>
          <Link href="/" className="text-sm text-[#4A90E2] hover:underline mt-2 inline-block">
            Browse Local Businesses
          </Link>
        </div>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Recent Activity */}
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {userReviews.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl mb-3 block">📊</span>
              <p className="text-gray-500">No activity yet</p>
              <p className="text-sm text-gray-400 mt-1">Write reviews to start building your activity!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userReviews.slice(0, 5).map((review) => (
                <div key={Number(review.id)} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <Link href={`/business/${review.businessId}`} className="text-sm font-medium text-[#4A90E2] hover:underline">
                      {businessNames[review.businessId.toString()] || `Business #${review.businessId}`}
                    </Link>
                    <p className="text-xs text-gray-400">
                      {"★".repeat(review.rating)} · {new Date(Number(review.timestamp) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-gray-300">▲{Number(review.upvotes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#F5D033] hover:bg-[#E6C029] transition-all text-center"
            >
              <span className="text-lg">📱</span>
              <span className="text-sm font-semibold text-gray-900">Scan QR Code</span>
            </Link>
            <Link
              href="/"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#4A90E2] transition-all text-center"
            >
              <span className="text-lg">✍️</span>
              <span className="text-sm font-medium text-gray-700">Write Review</span>
            </Link>
            <Link
              href="/"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#4A90E2] transition-all text-center"
            >
              <span className="text-lg">📍</span>
              <span className="text-sm font-medium text-gray-700">Find Places</span>
            </Link>
            <button
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#4A90E2] transition-all text-center"
            >
              <span className="text-lg">⚙️</span>
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nearby Businesses */}
      <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Nearby Businesses</h2>
        <p className="text-sm text-gray-400 mb-4">Discover great places near you</p>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {businessesData?.slice(0, 4).map((b, i) => {
            if (b.status !== "success") return null;
            const [, name, category] = b.result as unknown as [bigint, string, string, string, boolean];
            const bizAvatar = AVATARS[(i + 3) % AVATARS.length];
            return (
              <Link
                key={i}
                href={`/business/${i + 1}`}
                className="flex-shrink-0 w-40 rounded-xl border-2 border-gray-100 p-3 hover:border-[#4A90E2] transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <img src={bizAvatar} alt="" className="w-8 h-8 rounded-full" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{category}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-500">★ 4.8</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">0.5 mi</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Wallet info */}
      <div className="mt-8 text-xs text-gray-400">
        Connected: <span className="font-mono text-gray-500">{address}</span>
      </div>
    </div>
  );
}

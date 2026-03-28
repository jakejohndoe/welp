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
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import toast from "react-hot-toast";

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
  if (rep >= 20) return { name: "Gold", emoji: "🥇", color: "text-amber-600", barColor: "from-amber-400 to-amber-500" };
  if (rep >= 5) return { name: "Silver", emoji: "🥈", color: "text-blue-600", barColor: "from-blue-400 to-blue-500" };
  return { name: "Bronze", emoji: "🟤", color: "text-orange-600", barColor: "from-orange-400 to-orange-500" };
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { profile, loaded, markReviewed } = useProfile(address);

  useEffect(() => {
    if (!loaded) return;
    if (!isConnected) {
      router.replace("/welcome");
    } else if (!profile) {
      router.replace("/onboarding");
    }
  }, [isConnected, profile, loaded, router]);

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
      args: [BigInt(i)],
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

  const uniqueBusinesses = new Set(userReviews.map((r) => r.businessId.toString())).size;

  // Mark profile as reviewed if they have reviews
  useEffect(() => {
    if (userReviews.length > 0 && profile && !profile.hasReviewed) {
      markReviewed();
    }
  }, [userReviews.length, profile, markReviewed]);

  if (!loaded || !isConnected || !profile) return null;

  const rep = Number(reputation || 0);
  const tier = getTierInfo(rep);
  const balance = welpBalance ? formatUnits(welpBalance as bigint, 18) : "0";
  const balanceNum = Number(balance);

  const t3Threshold =
    tierData?.[1]?.status === "success" ? Number(tierData[1].result) : 20;

  const showGettingStarted = !profile.hasReviewed && userReviews.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-4 mb-8">
        <Image
          src={profile.avatar}
          alt="avatar"
          width={48}
          height={48}
          className="rounded-full"
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile.displayName}! 👋
          </h1>
          <p className="text-gray-500 mt-0.5">
            You&apos;ve earned {balanceNum.toFixed(0)} WELP tokens. Keep exploring to earn more!
          </p>
        </div>
      </div>

      {/* Getting Started Card — disappears after first review */}
      {showGettingStarted && (
        <div className="rounded-[1.5rem] bg-gradient-to-r from-blue-50 to-amber-50 border-2 border-blue-100 p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#F5D033] flex items-center justify-center flex-shrink-0">
              <span className="text-xl">⭐</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Complete your first review to earn WELP tokens! Visit a business, check in, and share your experience.
              </p>
            </div>
            <Link
              href="/businesses"
              className="px-5 py-2.5 rounded-xl bg-[#4A90E2] hover:bg-[#357ABD] text-white text-sm font-semibold transition-all duration-300 flex-shrink-0"
            >
              Find a Business
            </Link>
          </div>
        </div>
      )}

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
          {rep >= 20 ? "Elite Reviewer" : rep >= 5 ? "Rising Reviewer" : "New Reviewer"}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">📍 Businesses Reviewed</span>
          </div>
          <p className="text-3xl font-bold text-[#4A90E2]">{uniqueBusinesses}</p>
          <p className="text-sm text-gray-400 mt-1">Unique places</p>
        </div>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">✏️ Reviews Written</span>
          </div>
          <p className="text-3xl font-bold text-[#4A90E2]">{userReviews.length}</p>
          <p className="text-sm text-gray-400 mt-1">On-chain reviews</p>
        </div>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">🪙 WELP Balance</span>
          </div>
          <p className="text-3xl font-bold text-[#4A90E2]">{balanceNum.toFixed(0)}</p>
          <p className="text-sm text-gray-400 mt-1">{balanceNum > 0 ? "WELP tokens earned" : "Earn by writing reviews"}</p>
        </div>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">⭐ Reputation</span>
          </div>
          <p className="text-3xl font-bold text-[#4A90E2]">{rep}</p>
          <p className="text-sm text-gray-400 mt-1">{tier.name} tier</p>
        </div>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
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

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => toast("QR scanning coming soon!", { icon: "📱" })}
              className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 border-2 border-gray-100 text-center cursor-default"
            >
              <span className="text-lg text-gray-300">📱</span>
              <span className="text-sm font-medium text-gray-400">Scan QR Code</span>
              <span className="text-[10px] text-gray-400">Coming Soon</span>
            </button>
            <Link
              href="/businesses"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#4A90E2] transition-all text-center"
            >
              <span className="text-lg">✍️</span>
              <span className="text-sm font-medium text-gray-700">Write Review</span>
            </Link>
            <Link
              href="/businesses"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#4A90E2] transition-all text-center"
            >
              <span className="text-lg">📍</span>
              <span className="text-sm font-medium text-gray-700">Find Places</span>
            </Link>
            <Link
              href="/feed"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#4A90E2] transition-all text-center"
            >
              <span className="text-lg">📰</span>
              <span className="text-sm font-medium text-gray-700">View Feed</span>
            </Link>
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
                href={`/business/${i}`}
                className="flex-shrink-0 w-40 rounded-xl border-2 border-gray-100 p-3 hover:border-[#4A90E2] transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <img src={bizAvatar} alt="" className="w-8 h-8 rounded-full" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{category}</p>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-[#4A90E2]">View →</span>
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

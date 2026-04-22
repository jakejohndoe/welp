"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import {
  ADDRESSES,
  REVIEW_REGISTRY_ABI,
  WELP_TOKEN_ABI,
} from "@/lib/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useProfile } from "@/hooks/useProfile";
import confetti from "canvas-confetti";
import { useWelpPrice } from "@/hooks/useWelpPrice";
import { Info, Pencil } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { TierProgressCard, getTierInfo } from "@/components/TierProgressCard";

function relativeTime(unixSec: number): string {
  const diff = Math.max(0, Date.now() / 1000 - unixSec);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo ago`;
  return `${Math.floor(diff / (86400 * 365))}y ago`;
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { profile, loaded, markReviewed } = useProfile(address);
  const { price: welpPriceUsd } = useWelpPrice();

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

  const [showTierUp, setShowTierUp] = useState<{ name: string; reward: number } | null>(null);

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 1500;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ["#4A90E2", "#10B981", "#F5D033", "#8B5CF6"] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ["#4A90E2", "#10B981", "#F5D033", "#8B5CF6"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  // Tier-up detection
  useEffect(() => {
    if (!address || reputation === undefined) return;
    const rep = Number(reputation);
    const currentTier = rep >= 20 ? "gold" : rep >= 5 ? "silver" : "bronze";
    const key = `welp_last_tier_${address.toLowerCase()}`;
    const lastTier = localStorage.getItem(key) || "bronze";

    const tierOrder = { bronze: 0, silver: 1, gold: 2 };
    if (tierOrder[currentTier as keyof typeof tierOrder] > tierOrder[lastTier as keyof typeof tierOrder]) {
      const reward = currentTier === "gold" ? 300 : 200;
      setShowTierUp({ name: currentTier === "gold" ? "Gold" : "Silver", reward });
      fireConfetti();
    }
    localStorage.setItem(key, currentTier);
  }, [address, reputation, fireConfetti]);

  if (!loaded || !isConnected || !profile) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse" />
          <div className="h-64 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const rep = Number(reputation || 0);
  const tier = getTierInfo(rep);
  const balance = welpBalance ? formatUnits(welpBalance as bigint, 18) : "0";
  const balanceNum = Number(balance);

  const showGettingStarted = !profile.hasReviewed && userReviews.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-4 mb-8">
        <img
          src={profile.avatar.startsWith("/") ? profile.avatar : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(profile.avatar)}`}
          alt="avatar"
          width={48}
          height={48}
          className="rounded-full"
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile.displayName}! <span className="animate-wave">👋</span>
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
            <div className="w-12 h-12 rounded-full bg-brand-yellow flex items-center justify-center flex-shrink-0">
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
              className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-all duration-300 flex-shrink-0"
            >
              Find a Business
            </Link>
          </div>
        </div>
      )}

      {/* Tier Progress */}
      <div className="mb-8">
        <TierProgressCard address={address!} />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">📍 Businesses Reviewed</span>
          </div>
          <p className="text-3xl font-bold text-brand-primary"><CountUp value={uniqueBusinesses} /></p>
          <p className="text-sm text-gray-400 mt-1">Unique places</p>
        </div>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">✏️ Reviews Written</span>
          </div>
          <p className="text-3xl font-bold text-brand-primary"><CountUp value={userReviews.length} /></p>
          <p className="text-sm text-gray-400 mt-1">On-chain reviews</p>
        </div>

        <Link
          href="/wallet"
          className="group rounded-[1.5rem] bg-white border-2 border-gray-100 p-5 hover:-translate-y-0.5 hover:shadow-md hover:border-brand-primary/30 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">🪙 WELP Balance</span>
            <span className="text-xs text-gray-300 group-hover:text-brand-primary transition-colors">→</span>
          </div>
          <p className="text-3xl font-bold text-brand-primary"><CountUp value={Math.round(balanceNum)} /></p>
          <p className="text-sm text-gray-400 mt-1">{balanceNum > 0 ? "WELP tokens earned" : "Earn by writing reviews"}</p>
          {balanceNum > 0 && welpPriceUsd && (
            <p className="text-xs text-gray-400 mt-0.5">
              ≈ ${(balanceNum * welpPriceUsd).toFixed(2)} USD
            </p>
          )}
        </Link>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="group relative inline-flex items-center gap-1 text-sm text-gray-600">
              ⭐ Reputation
              <Info className="h-3 w-3 text-gray-400 cursor-help" />
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-xs rounded-lg w-60 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50 font-normal normal-case">
                On-chain reputation. +1 per upvote received on your reviews, -1 per downvote. Silver at 5, Gold at 20.
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900/90" />
              </span>
            </span>
          </div>
          <p className="text-3xl font-bold text-brand-primary"><CountUp value={rep} /></p>
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
              {userReviews.slice(0, 5).map((review) => {
                const bizName = businessNames[review.businessId.toString()] || `Business #${review.businessId}`;
                return (
                  <Link
                    key={Number(review.id)}
                    href={`/business/${review.businessId}`}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 hover:shadow-md hover:border-brand-primary/30 transition-all duration-200"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-brand-primary flex items-center justify-center flex-shrink-0">
                      <Pencil className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        You reviewed <span className="font-semibold text-gray-900 group-hover:text-brand-primary transition-colors">{bizName}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{relativeTime(Number(review.timestamp))}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-amber-400 tracking-wide">{"★".repeat(review.rating)}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">▲ {Number(review.upvotes)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Nearby Businesses -- promoted into the top row so the user
            always has somewhere to go. Replaces the old Quick Actions
            panel; Write a Review lives in the FAB at the bottom. */}
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6 flex flex-col">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nearby Businesses</h2>
              <p className="text-sm text-gray-400">Discover great places near you</p>
            </div>
            <Link href="/businesses" className="text-xs text-brand-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1 auto-rows-fr">
            {businessesData?.slice(0, 6).map((b, i) => {
              if (b.status !== "success") return null;
              const [, name, category] = b.result as unknown as [bigint, string, string, string, boolean];
              const bizAvatar = `https://api.dicebear.com/9.x/shapes/svg?seed=${name.toLowerCase().replace(/\s+/g, "")}`;
              return (
                <Link
                  key={i}
                  href={`/business/${i}`}
                  className="rounded-xl border-2 border-gray-100 p-3 hover:border-brand-primary hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={bizAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-400 truncate">{category}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-brand-primary mt-2 self-start">View →</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wallet info */}
      <div className="mt-8 text-xs text-gray-400">
        Connected: <span className="font-mono text-gray-500">{address}</span>
      </div>

      {/* Floating action button: primary action is always one tap away
          without burning column space on the dashboard. */}
      <Link
        href="/review"
        aria-label="Write a review"
        title="Write a review"
        className="fixed bottom-6 right-6 z-40 h-14 pl-5 pr-6 rounded-full bg-brand-primary hover:bg-brand-hover text-white shadow-[0_12px_30px_-8px_rgba(118,75,162,0.6)] flex items-center gap-2 font-semibold transition-all duration-200 hover:-translate-y-0.5"
      >
        <Pencil className="h-5 w-5" />
        <span>Write a Review</span>
      </Link>

      {/* Tier-up celebration modal */}
      {showTierUp && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm">
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[1.5rem] border-2 border-gray-100 p-10 max-w-sm w-full mx-4 shadow-xl text-center z-[101]"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 flex items-center justify-center">
              <span className="text-4xl">{showTierUp.name === "Gold" ? "🥇" : "🥈"}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {showTierUp.name} Tier!
            </h2>
            <p className="text-gray-500 mb-1">
              You&apos;ve reached <span className="font-semibold text-gray-900">{showTierUp.name}</span> tier!
            </p>
            <p className="text-sm text-gray-400 mb-8">
              Your reviews now earn {showTierUp.reward} WELP tokens each.
            </p>
            <button
              onClick={() => setShowTierUp(null)}
              className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold transition-all duration-300"
            >
              Keep it up!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

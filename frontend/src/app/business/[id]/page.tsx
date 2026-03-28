"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { ADDRESSES, REVIEW_REGISTRY_ABI } from "@/lib/contracts";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useProfile } from "@/hooks/useProfile";
import { ReviewText } from "@/components/ReviewText";
import { TierBadge } from "@/components/TierBadge";

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

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 tracking-wide">
      {"★".repeat(rating)}
      <span className="text-gray-200">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function BusinessDetail() {
  const params = useParams();
  const businessId = BigInt(params.id as string);
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const { profile } = useProfile(address);

  const { data: business } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "businesses",
    args: [businessId],
  });

  const { data: nextReviewId } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "nextReviewId",
  });

  const { data: lastCheckInTime, queryKey: checkInQueryKey } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "lastCheckIn",
    args: [businessId, address!],
    query: { enabled: !!address },
  });

  const reviewCount = Number(nextReviewId || 0);
  const { data: allReviews } = useReadContracts({
    contracts: Array.from({ length: reviewCount }, (_, i) => ({
      address: ADDRESSES.ReviewRegistry,
      abi: REVIEW_REGISTRY_ABI,
      functionName: "reviews" as const,
      args: [BigInt(i)],
    })),
    query: { enabled: reviewCount > 0 },
  });

  const businessReviews =
    allReviews
      ?.filter((r) => r.status === "success")
      .map((r) => {
        const res = r.result as unknown as [bigint, bigint, string, number, string, bigint, bigint, bigint];
        const [id, bId, reviewer, rating, ipfsHash, timestamp, upvotes, downvotes] = res;
        return { id, businessId: bId, reviewer, rating, ipfsHash, timestamp, upvotes, downvotes };
      })
      .filter((r) => r.businessId === businessId) || [];

  const reviewerAddresses = [...new Set(businessReviews.map((r) => r.reviewer))];
  const { data: repData } = useReadContracts({
    contracts: reviewerAddresses.map((addr) => ({
      address: ADDRESSES.ReviewRegistry,
      abi: REVIEW_REGISTRY_ABI,
      functionName: "reputation" as const,
      args: [addr as `0x${string}`],
    })),
    query: { enabled: reviewerAddresses.length > 0 },
  });

  const reputations: Record<string, number> = {};
  reviewerAddresses.forEach((addr, i) => {
    if (repData?.[i]?.status === "success") {
      reputations[addr] = Number(repData[i].result as bigint);
    }
  });

  const {
    writeContract: doCheckIn,
    data: checkInHash,
    isPending: checkInPending,
  } = useWriteContract();

  const { isSuccess: checkInConfirmed } = useWaitForTransactionReceipt({
    hash: checkInHash,
  });

  // After check-in confirms, invalidate the lastCheckIn query so isCheckedIn updates
  useEffect(() => {
    if (checkInConfirmed) {
      toast.success("Checked in! You can now write a review.");
      queryClient.invalidateQueries({ queryKey: checkInQueryKey });
    }
  }, [checkInConfirmed, queryClient, checkInQueryKey]);

  const handleCheckIn = () => {
    doCheckIn({
      address: ADDRESSES.ReviewRegistry,
      abi: REVIEW_REGISTRY_ABI,
      functionName: "checkIn",
      args: [businessId],
    });
  };

  // Use both the contract read AND the confirmed receipt as signals
  const isCheckedInFromContract =
    lastCheckInTime !== undefined &&
    Number(lastCheckInTime) > 0 &&
    Date.now() / 1000 - Number(lastCheckInTime) < 86400;
  const isCheckedIn = isCheckedInFromContract || checkInConfirmed;

  if (!business) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-48 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse" />
      </div>
    );
  }

  const [, name, category, location, exists] = business as unknown as [
    bigint, string, string, string, boolean,
  ];

  if (!exists) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-gray-500">Business not found.</p>
        <Link href="/businesses" className="text-[#4A90E2] hover:underline mt-4 inline-block">
          Back to businesses
        </Link>
      </div>
    );
  }

  const avatarIdx = Number(params.id) % AVATARS.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/businesses"
        className="text-sm text-gray-400 hover:text-[#4A90E2] mb-6 inline-flex items-center gap-1 transition"
      >
        <span>&larr;</span> All Businesses
      </Link>

      {/* Business header card */}
      <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 overflow-hidden mb-8">
        <div className="h-32 bg-gradient-to-r from-[#4A90E2] to-blue-500" />
        <div className="p-6 -mt-10">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-4">
              <img
                src={AVATARS[avatarIdx]}
                alt=""
                className="w-16 h-16 rounded-full border-4 border-white shadow-sm"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                <p className="text-gray-500 mt-1">{category}</p>
                <p className="text-sm text-gray-400">{location}</p>
                <div className="mt-2">
                  {businessReviews.length > 0 ? (
                    <>
                      <StarRating rating={Math.round(businessReviews.reduce((sum, r) => sum + r.rating, 0) / businessReviews.length)} />
                      <span className="text-sm text-gray-400 ml-2">
                        {(businessReviews.reduce((sum, r) => sum + r.rating, 0) / businessReviews.length).toFixed(1)} ({businessReviews.length} review{businessReviews.length !== 1 ? "s" : ""})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">No ratings yet</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {isConnected && (
                <>
                  <button
                    onClick={handleCheckIn}
                    disabled={checkInPending || isCheckedIn}
                    className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      isCheckedIn
                        ? "bg-green-50 text-green-600 border-2 border-green-200"
                        : "bg-[#4A90E2] hover:bg-[#357ABD] text-white"
                    } disabled:opacity-70`}
                  >
                    {checkInPending
                      ? "Checking in..."
                      : isCheckedIn
                      ? "Checked In ✓"
                      : "Check In"}
                  </button>
                  {isCheckedIn && (
                    <Link
                      href={`/review?businessId=${params.id}&businessName=${encodeURIComponent(name)}`}
                      className="px-8 py-3 rounded-xl bg-[#F5D033] hover:bg-[#E6C029] text-sm font-semibold text-gray-900 transition-all duration-300"
                    >
                      Write a Review
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <h2 className="text-xl font-semibold text-gray-900 mb-5">
        Reviews ({businessReviews.length})
      </h2>

      {businessReviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-[1.5rem] border-2 border-gray-100">
          <p className="text-lg">No reviews yet</p>
          <p className="text-sm mt-1">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {businessReviews.map((review) => {
            const netVotes = Number(review.upvotes) - Number(review.downvotes);
            const isOwnReview = address && review.reviewer.toLowerCase() === address.toLowerCase();
            const reviewerAvatar = isOwnReview && profile ? profile.avatar : AVATARS[parseInt(review.reviewer.slice(2, 4), 16) % AVATARS.length];
            const reviewerName = isOwnReview && profile ? profile.displayName : `${review.reviewer.slice(0, 6)}...${review.reviewer.slice(-4)}`;
            return (
              <div
                key={Number(review.id)}
                className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={reviewerAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium flex items-center gap-1.5 ${isOwnReview ? "text-[#4A90E2]" : "text-gray-600 font-mono"}`}>
                        {reviewerName}
                        {isOwnReview && <span className="text-[10px] bg-blue-50 text-[#4A90E2] px-1.5 py-0.5 rounded-full font-sans">You</span>}
                        {reputations[review.reviewer] !== undefined && <TierBadge rep={reputations[review.reviewer]} />}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(Number(review.timestamp) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <StarRating rating={review.rating} />
                    <ReviewText ipfsHash={review.ipfsHash} />
                    {(Number(review.upvotes) + Number(review.downvotes) > 0) && (
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-gray-400">
                          ▲ {Number(review.upvotes)}
                        </span>
                        <span className="text-gray-400">
                          ▼ {Number(review.downvotes)}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            netVotes > 0
                              ? "bg-blue-50 text-[#4A90E2]"
                              : netVotes < 0
                              ? "bg-red-50 text-red-500"
                              : "bg-gray-50 text-gray-400"
                          }`}
                        >
                          {netVotes > 0 ? "+" : ""}
                          {netVotes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

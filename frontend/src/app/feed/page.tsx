"use client";

import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ADDRESSES, REVIEW_REGISTRY_ABI } from "@/lib/contracts";
import { useEffect } from "react";
import toast from "react-hot-toast";
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

function VoteButton({
  reviewId,
  type,
}: {
  reviewId: bigint;
  type: "upvote" | "downvote";
}) {
  const { address } = useAccount();

  const { data: alreadyVoted } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "hasVoted",
    args: [reviewId, address!],
    query: { enabled: !!address },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success(
        `${type === "upvote" ? "Upvote" : "Downvote"} recorded on-chain!`
      );
    }
  }, [isSuccess, type]);

  const voted = isSuccess || alreadyVoted === true;

  return (
    <button
      onClick={() =>
        writeContract({
          address: ADDRESSES.ReviewRegistry,
          abi: REVIEW_REGISTRY_ABI,
          functionName: type,
          args: [reviewId],
        })
      }
      disabled={!address || isPending || alreadyVoted === true}
      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all text-sm font-bold disabled:cursor-default ${
        type === "upvote"
          ? voted
            ? "bg-blue-100 text-[#4A90E2]"
            : "text-gray-300 hover:bg-blue-50 hover:text-[#4A90E2]"
          : voted
          ? "bg-red-100 text-red-500"
          : "text-gray-300 hover:bg-red-50 hover:text-red-500"
      }`}
      title={alreadyVoted ? "Already voted" : type}
    >
      {type === "upvote" ? "▲" : "▼"}
    </button>
  );
}

export default function Feed() {
  const { data: nextReviewId } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "nextReviewId",
  });

  const reviewCount = Number(nextReviewId || 0);

  const { data: reviewsData, isLoading } = useReadContracts({
    contracts: Array.from({ length: reviewCount }, (_, i) => ({
      address: ADDRESSES.ReviewRegistry,
      abi: REVIEW_REGISTRY_ABI,
      functionName: "reviews" as const,
      args: [BigInt(i)],
    })),
    query: { enabled: reviewCount > 0 },
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

  const reviewers = new Set<string>();
  const reviews =
    reviewsData
      ?.filter((r) => r.status === "success")
      .map((r) => {
        const res = r.result as unknown as [bigint, bigint, string, number, string, bigint, bigint, bigint];
        const [id, businessId, reviewer, rating, ipfsHash, timestamp, upvotes, downvotes] = res;
        reviewers.add(reviewer);
        return { id, businessId, reviewer, rating, ipfsHash, timestamp, upvotes, downvotes };
      })
      .reverse() || [];

  const { data: repData } = useReadContracts({
    contracts: Array.from(reviewers).map((addr) => ({
      address: ADDRESSES.ReviewRegistry,
      abi: REVIEW_REGISTRY_ABI,
      functionName: "reputation" as const,
      args: [addr as `0x${string}`],
    })),
    query: { enabled: reviewers.size > 0 },
  });

  const reputations: Record<string, bigint> = {};
  Array.from(reviewers).forEach((addr, i) => {
    if (repData?.[i]?.status === "success") {
      reputations[addr] = repData[i].result as bigint;
    }
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Feed</h1>
      <p className="text-gray-500 mb-8">
        All reviews, newest first. Vote to shape reviewer reputation.
      </p>

      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-36 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-[1.5rem] border-2 border-gray-100">
          <p className="text-lg">No reviews yet</p>
          <p className="text-sm mt-1">
            <Link href="/" className="text-[#4A90E2] hover:underline">
              Check in to a business
            </Link>{" "}
            to write the first one!
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => {
            const netVotes = Number(review.upvotes) - Number(review.downvotes);
            const rep = reputations[review.reviewer];
            const avatarIdx = parseInt(review.reviewer.slice(2, 4), 16) % AVATARS.length;

            return (
              <div
                key={Number(review.id)}
                className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6"
              >
                <div className="flex gap-5">
                  {/* Vote column */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <VoteButton reviewId={review.id} type="upvote" />
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        netVotes > 0
                          ? "text-[#4A90E2]"
                          : netVotes < 0
                          ? "text-red-500"
                          : "text-gray-300"
                      }`}
                    >
                      {netVotes}
                    </span>
                    <VoteButton reviewId={review.id} type="downvote" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={AVATARS[avatarIdx]}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-500 font-mono">
                            {review.reviewer.slice(0, 6)}...
                            {review.reviewer.slice(-4)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(
                              Number(review.timestamp) * 1000
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/business/${review.businessId}`}
                      className="text-sm font-semibold text-[#4A90E2] hover:underline"
                    >
                      {businessNames[review.businessId.toString()] ||
                        `Business #${review.businessId}`}
                    </Link>

                    <div className="text-amber-400 text-sm mt-1">
                      {"★".repeat(review.rating)}
                      <span className="text-gray-200">
                        {"★".repeat(5 - review.rating)}
                      </span>
                    </div>

                    {rep !== undefined && (
                      <span
                        className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          Number(rep) >= 20
                            ? "bg-amber-100 text-amber-700"
                            : Number(rep) >= 5
                            ? "bg-blue-50 text-[#4A90E2]"
                            : "bg-gray-50 text-gray-400"
                        }`}
                      >
                        Rep: {Number(rep)}
                        {Number(rep) >= 20
                          ? " • Elite"
                          : Number(rep) >= 5
                          ? " • Premium"
                          : ""}
                      </span>
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

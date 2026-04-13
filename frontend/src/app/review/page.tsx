"use client";

import { useSearchParams, useRouter } from "next/navigation";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ADDRESSES, REVIEW_REGISTRY_ABI, REWARDS_VAULT_ABI } from "@/lib/contracts";
import { uploadToPinata } from "@/lib/pinata";
import { useState, useEffect, Suspense, useCallback } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useWelpPrice } from "@/hooks/useWelpPrice";
import { formatUnits } from "viem";

export default function WriteReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-6 py-10 text-gray-400">
          Loading...
        </div>
      }
    >
      <WriteReview />
    </Suspense>
  );
}

function WriteReview() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const businessId = searchParams.get("businessId");
  const businessName =
    searchParams.get("businessName") || `Business #${businessId}`;
  const { address, isConnected } = useAccount();
  const { price: welpPriceUsd } = useWelpPrice();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
  const { isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 1500;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#4A90E2", "#10B981", "#F5D033", "#8B5CF6"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#4A90E2", "#10B981", "#F5D033", "#8B5CF6"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  useEffect(() => {
    if (confirmed) {
      setShowConfirmation(true);
      fireConfetti();
    }
  }, [confirmed, fireConfetti]);

  useEffect(() => {
    if (txError) {
      const msg = (txError as Error).message || "Transaction failed";
      if (msg.includes("NotCheckedIn")) {
        toast.error("You must check in at this business before reviewing.");
      } else if (msg.includes("ReviewCooldown")) {
        toast.error("You already reviewed this business recently. Wait 48 hours.");
      } else if (msg.includes("InvalidRating")) {
        toast.error("Rating must be between 1 and 5.");
      } else if (msg.includes("User rejected") || msg.includes("User denied")) {
        toast.error("Transaction was cancelled.");
      } else {
        toast.error("Transaction failed. Please try again.");
      }
    }
  }, [txError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !businessId || rating === 0) return;

    try {
      setUploading(true);
      let ipfsHash = "";

      try {
        ipfsHash = await uploadToPinata({
          text: reviewText,
          rating,
          businessId: Number(businessId),
          reviewer: address,
        });
        toast.success("Review text uploaded to IPFS!");
      } catch {
        ipfsHash = `QmPlaceholder${Date.now()}`;
        toast("Pinata not configured — using placeholder IPFS hash.", {
          icon: "⚠️",
        });
      }

      setUploading(false);

      writeContract({
        address: ADDRESSES.ReviewRegistry,
        abi: REVIEW_REGISTRY_ABI,
        functionName: "submitReview",
        args: [BigInt(businessId), rating, ipfsHash],
      });
    } catch {
      setUploading(false);
      toast.error("Failed to submit review.");
    }
  };

  // --- Confirmation screen ---
  if (showConfirmation) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="bg-white rounded-[1.5rem] border-2 border-gray-100 p-10 text-center max-w-sm w-full">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Review Submitted!
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            You earned 100 WELP tokens{welpPriceUsd ? ` (~$${(welpPriceUsd * 100).toFixed(2)} USD)` : ''}!
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push(`/business/${businessId}`)}
              className="w-full py-3 rounded-xl bg-[#4A90E2] hover:bg-[#357ABD] text-white font-semibold transition-all duration-300"
            >
              Back to Business
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 rounded-xl border-2 border-gray-100 text-gray-600 font-medium hover:bg-gray-50 transition-all"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Not connected ---
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-500 text-lg">
          Connect your wallet to write a review.
        </p>
      </div>
    );
  }

  // --- No business selected ---
  if (!businessId) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-500">No business selected.</p>
        <Link
          href="/businesses"
          className="text-[#4A90E2] hover:underline mt-4 inline-block"
        >
          Browse businesses
        </Link>
      </div>
    );
  }

  // --- Review form ---
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/business/${businessId}`}
        className="text-sm text-gray-400 hover:text-[#4A90E2] mb-6 inline-flex items-center gap-1 transition"
      >
        <span>&larr;</span> Back to {businessName}
      </Link>

      <div className="bg-white rounded-[1.5rem] border-2 border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A90E2] to-blue-500 p-6">
          <h1 className="text-xl font-bold text-white">Write a Review</h1>
          <p className="text-white/80 mt-1">{businessName}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Your Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-4xl transition-transform hover:scale-110 active:scale-95"
                >
                  <span
                    className={
                      star <= (hoverRating || rating)
                        ? "text-amber-400"
                        : "text-gray-200"
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                {rating}/5 star{rating !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Review text */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Your Review
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={5}
              placeholder="Share your experience..."
              className="w-full rounded-xl border-2 border-gray-100 bg-white px-4 py-3 text-gray-900 placeholder-gray-300 focus:border-[#4A90E2] focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={rating === 0 || isPending || uploading}
            className="w-full py-3.5 rounded-xl bg-[#4A90E2] hover:bg-[#357ABD] text-white font-semibold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading
              ? "Uploading to IPFS..."
              : isPending
              ? "Confirm in wallet..."
              : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}

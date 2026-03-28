"use client";

import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { ADDRESSES, REVIEW_REGISTRY_ABI } from "@/lib/contracts";
import { useState } from "react";

const BUSINESS_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

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

const CATEGORIES = ["All", "Coffee & Tea", "Restaurant", "Bar & Grill", "Market", "Entertainment", "Brewery"];

export default function Businesses() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data, isLoading } = useReadContracts({
    contracts: BUSINESS_IDS.map((id) => ({
      address: ADDRESSES.ReviewRegistry,
      abi: REVIEW_REGISTRY_ABI,
      functionName: "businesses" as const,
      args: [BigInt(id)],
    })),
  });

  const { data: nextReviewId } = useReadContract({
    address: ADDRESSES.ReviewRegistry,
    abi: REVIEW_REGISTRY_ABI,
    functionName: "nextReviewId",
  });

  const reviewCount = Number(nextReviewId || 0);
  const { data: allReviewsData } = useReadContracts({
    contracts: Array.from({ length: reviewCount }, (_, i) => ({
      address: ADDRESSES.ReviewRegistry,
      abi: REVIEW_REGISTRY_ABI,
      functionName: "reviews" as const,
      args: [BigInt(i)],
    })),
    query: { enabled: reviewCount > 0 },
  });

  // Compute average rating per business
  const avgRatings: Record<string, { sum: number; count: number }> = {};
  allReviewsData?.forEach((r) => {
    if (r.status === "success") {
      const [, bId, , rating] = r.result as unknown as [bigint, bigint, string, number, string, bigint, bigint, bigint];
      const key = bId.toString();
      if (!avgRatings[key]) avgRatings[key] = { sum: 0, count: 0 };
      avgRatings[key].sum += rating;
      avgRatings[key].count += 1;
    }
  });

  const businesses = data
    ?.map((result, i) => {
      if (result.status !== "success") return null;
      const [, name, category, location, exists] = result.result as unknown as [
        bigint, string, string, string, boolean,
      ];
      if (!exists) return null;
      return { id: BUSINESS_IDS[i], name, category, location };
    })
    .filter(Boolean) as { id: number; name: string; category: string; location: string }[] | undefined;

  const filtered = businesses?.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || b.category.includes(selectedCategory.replace(" & ", " & "));
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Discover Saint Paul Businesses
        </h1>
        <p className="text-gray-500">
          Explore local businesses and discover new favorites in your community
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-100 bg-white text-gray-900 placeholder-gray-400 focus:border-[#4A90E2] focus:outline-none transition"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-[#4A90E2] text-white"
                  : "bg-white border-2 border-gray-100 text-gray-600 hover:border-[#4A90E2] hover:text-[#4A90E2]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-sm text-[#4A90E2]">
          Showing {filtered?.length || 0} of {businesses?.length || 0} businesses
        </p>
      </div>

      {/* Business Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered?.map((biz) => {
            const avatarIdx = biz.id % AVATARS.length;
            return (
              <Link
                key={biz.id}
                href={`/business/${biz.id}`}
                className="group rounded-[1.5rem] bg-white border-2 border-gray-100 hover:border-[#4A90E2] overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={AVATARS[avatarIdx]}
                      alt=""
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-gray-900 group-hover:text-[#4A90E2] transition-colors truncate">
                        {biz.name}
                      </h2>
                      <p className="text-sm text-gray-500">{biz.category}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{biz.location}</p>

                  <div className="flex items-center justify-between">
                    {avgRatings[biz.id.toString()] ? (
                      <span className="text-sm">
                        <span className="text-amber-400">
                          {"★".repeat(Math.round(avgRatings[biz.id.toString()].sum / avgRatings[biz.id.toString()].count))}
                        </span>
                        <span className="text-gray-200">
                          {"★".repeat(5 - Math.round(avgRatings[biz.id.toString()].sum / avgRatings[biz.id.toString()].count))}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">({avgRatings[biz.id.toString()].count})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No ratings yet</span>
                    )}
                    <span className="text-xs font-medium text-[#4A90E2] bg-blue-50 px-3 py-1 rounded-full">
                      View →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {filtered?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <span className="text-4xl mb-4 block">🔍</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No businesses found</h3>
          <p className="text-gray-400">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

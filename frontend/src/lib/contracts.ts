import { type Address } from "viem";

// Sepolia deployment — 2026-03-27
export const ADDRESSES = {
  WelpToken: "0xDF76BdF11812E93f31BDF6363FE3CD1fE4078A52" as Address,
  RewardsVault: "0xaCd596F9546A32469E4d7120593e7b54e119351B" as Address,
  ReviewRegistry: "0xed08ee493161Fb3eA1Fb8935271ed6E85fdD8C0C" as Address,
} as const;

export const WELP_TOKEN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const REVIEW_REGISTRY_ABI = [
  {
    type: "function",
    name: "businesses",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "name", type: "string" },
      { name: "category", type: "string" },
      { name: "location", type: "string" },
      { name: "exists", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reviews",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "businessId", type: "uint256" },
      { name: "reviewer", type: "address" },
      { name: "rating", type: "uint8" },
      { name: "ipfsHash", type: "string" },
      { name: "timestamp", type: "uint256" },
      { name: "upvotes", type: "uint256" },
      { name: "downvotes", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextBusinessId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextReviewId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reputation",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "int256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastCheckIn",
    inputs: [
      { name: "businessId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasVoted",
    inputs: [
      { name: "reviewId", type: "uint256" },
      { name: "voter", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "checkIn",
    inputs: [{ name: "businessId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitReview",
    inputs: [
      { name: "businessId", type: "uint256" },
      { name: "rating", type: "uint8" },
      { name: "ipfsHash", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "upvote",
    inputs: [{ name: "reviewId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "downvote",
    inputs: [{ name: "reviewId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "CheckedIn",
    inputs: [
      { name: "businessId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ReviewSubmitted",
    inputs: [
      { name: "reviewId", type: "uint256", indexed: true },
      { name: "businessId", type: "uint256", indexed: true },
      { name: "reviewer", type: "address", indexed: true },
      { name: "rating", type: "uint8", indexed: false },
      { name: "ipfsHash", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteRecorded",
    inputs: [
      { name: "reviewId", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
      { name: "isUpvote", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ReputationUpdated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "newReputation", type: "int256", indexed: false },
    ],
  },
] as const;

export const REWARDS_VAULT_ABI = [
  {
    type: "function",
    name: "tier2Threshold",
    inputs: [],
    outputs: [{ name: "", type: "int256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tier3Threshold",
    inputs: [],
    outputs: [{ name: "", type: "int256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tier1Reward",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tier2Reward",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tier3Reward",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

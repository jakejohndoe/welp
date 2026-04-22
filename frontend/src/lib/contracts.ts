import { type Address } from "viem";

// Sepolia deployment -- 2026-03-27 (OGBadge 2026-04-22)
export const ADDRESSES = {
  WelpToken: "0xDF76BdF11812E93f31BDF6363FE3CD1fE4078A52" as Address,
  RewardsVault: "0xaCd596F9546A32469E4d7120593e7b54e119351B" as Address,
  ReviewRegistry: "0xed08ee493161Fb3eA1Fb8935271ed6E85fdD8C0C" as Address,
  OGBadge: "0x44e5B877BB1f42Ea1EBE3733682A48F0caf433Da" as Address,
} as const;

export const OG_BADGE_ADDRESS = ADDRESSES.OGBadge;

// Deploy block numbers -- used as fromBlock floor for getLogs queries.
// Querying from genesis on Sepolia is rejected by most RPCs.
// BigInt() form is required because the tsconfig target is ES2017.
export const DEPLOY_BLOCKS = {
  WelpToken: BigInt(10535150),
  RewardsVault: BigInt(10535150),
  ReviewRegistry: BigInt(10535150),
  PriceFeed: BigInt(10645575),
  OGBadge: BigInt(10711704),
} as const;

// Dead address used for the OGBadge burn-to-mint pattern. WelpToken MVP
// does not implement ERC20Burnable, so we move tokens to 0x...dEaD
// rather than calling burn(). totalSupply is unchanged on paper, but
// the tokens are permanently locked.
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD" as Address;

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

export const OG_BADGE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextTokenId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MINT_PRICE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_SUPPLY",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "DEAD",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "welpToken",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mintBadge",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "BadgeMinted",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

// ERC-20 approve + Transfer event, needed on the /wallet page for the
// badge-mint approval step and for reading WELP in/out history.
export const WELP_TOKEN_WRITE_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
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

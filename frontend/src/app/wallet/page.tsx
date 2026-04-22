"use client";

import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { formatUnits, parseAbiItem, type Address, type Hash } from "viem";
import {
  ADDRESSES,
  DEPLOY_BLOCKS,
  DEAD_ADDRESS,
  REVIEW_REGISTRY_ABI,
  WELP_TOKEN_ABI,
  WELP_TOKEN_WRITE_ABI,
  OG_BADGE_ABI,
} from "@/lib/contracts";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Pencil,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Coins,
  Flame,
  Award,
  ExternalLink,
  Info,
} from "lucide-react";
import { WelpCoin } from "@/components/WelpCoin";
import { CountUp } from "@/components/CountUp";
import { TierProgressCard } from "@/components/TierProgressCard";
import { TxLoadingModal } from "@/components/TxLoadingModal";
import { useWelpPrice } from "@/hooks/useWelpPrice";
import { useProfile } from "@/hooks/useProfile";

type ActivityKind = "review" | "checkin" | "vote" | "received" | "burn" | "badge";

type ActivityRow = {
  kind: ActivityKind;
  timestamp: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
  label: string;
  amount?: string;
  icon: React.ReactNode;
  iconBg: string;
};

const MINT_PRICE = BigInt(100) * BigInt(10) ** BigInt(18);
const MAX_SUPPLY = 100;
const ACTIVITY_LIMIT = 50;
const BADGE_IMAGE_SRC =
  "https://gateway.pinata.cloud/ipfs/bafybeib4ob5mrimz3gxiaijglg33s3nbompgvtdo3yq4fyyxix7sgclj3u";
// Alchemy and most Sepolia RPCs cap eth_getLogs at ~10k block range. The
// core welp contracts were deployed ~175k blocks back, so every getLogs
// needs to be paginated. 9500 leaves a little headroom under the cap.
const LOG_CHUNK_BLOCKS = BigInt(9500);

function relativeTime(unixSec: number): string {
  const diff = Math.max(0, Date.now() / 1000 - unixSec);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo ago`;
  return `${Math.floor(diff / (86400 * 365))}y ago`;
}

// Sepolia public RPCs and Alchemy's free tier cap eth_getLogs at roughly
// 10k blocks per request. The welp contracts sit ~175k blocks in the
// past, so every query here has to be paginated. Concatenates results
// across chunks; any chunk that throws bubbles up and is caught by the
// per-stream handler in the activity effect.
async function getLogsChunked(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
): Promise<any[]> {
  const { fromBlock, toBlock, ...rest } = params;
  const from: bigint = fromBlock as bigint;
  const to: bigint = toBlock as bigint;
  if (to < from) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  let cursor = from;
  while (cursor <= to) {
    const end = cursor + LOG_CHUNK_BLOCKS - BigInt(1);
    const chunkEnd = end > to ? to : end;
    const logs = await client.getLogs({
      ...rest,
      fromBlock: cursor,
      toBlock: chunkEnd,
    });
    results.push(...logs);
    cursor = chunkEnd + BigInt(1);
  }
  return results;
}

function etherscanTx(hash: string) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const publicClient = usePublicClient();
  const { profile, loaded } = useProfile(address);
  const { price: welpPriceUsd } = useWelpPrice();

  useEffect(() => {
    if (!loaded) return;
    if (!isConnected) {
      router.replace("/welcome");
    } else if (!profile) {
      router.replace("/onboarding");
    }
  }, [isConnected, profile, loaded, router]);

  // ──────────────── Balances and stats ────────────────

  const { data: welpBalance, refetch: refetchBalance } = useReadContract({
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

  const userReviews = useMemo(() => {
    return (
      allReviews
        ?.filter((r) => r.status === "success")
        .map((r) => {
          const res = r.result as unknown as [
            bigint, bigint, string, number, string, bigint, bigint, bigint,
          ];
          const [id, businessId, reviewer, rating, ipfsHash, timestamp, upvotes, downvotes] = res;
          return { id, businessId, reviewer, rating, ipfsHash, timestamp, upvotes, downvotes };
        })
        .filter((r) => r.reviewer.toLowerCase() === address?.toLowerCase()) || []
    );
  }, [allReviews, address]);

  const upvotesReceived = useMemo(
    () => userReviews.reduce((acc, r) => acc + Number(r.upvotes), 0),
    [userReviews]
  );

  // ──────────────── Check-in count via event logs ────────────────

  const [checkInCount, setCheckInCount] = useState<number | null>(null);

  useEffect(() => {
    if (!publicClient || !address) return;
    let cancelled = false;
    (async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        const logs = await getLogsChunked(publicClient, {
          address: ADDRESSES.ReviewRegistry,
          event: parseAbiItem(
            "event CheckedIn(uint256 indexed businessId, address indexed user, uint256 timestamp)"
          ),
          args: { user: address },
          fromBlock: DEPLOY_BLOCKS.ReviewRegistry,
          toBlock: latest,
        });
        if (!cancelled) setCheckInCount(logs.length);
      } catch (err) {
        console.error("[wallet] check-in log query failed:", err);
        if (!cancelled) setCheckInCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address]);

  // ──────────────── OG Badge state ────────────────

  const { data: badgeBalance, refetch: refetchBadgeBalance } = useReadContract({
    address: ADDRESSES.OGBadge,
    abi: OG_BADGE_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: nextTokenId, refetch: refetchNextTokenId } = useReadContract({
    address: ADDRESSES.OGBadge,
    abi: OG_BADGE_ABI,
    functionName: "nextTokenId",
  });

  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.WelpToken,
    abi: WELP_TOKEN_WRITE_ABI,
    functionName: "allowance",
    args: [address!, ADDRESSES.OGBadge],
    query: { enabled: !!address },
  });

  const [ownedTokenId, setOwnedTokenId] = useState<bigint | null>(null);

  useEffect(() => {
    if (!publicClient || !address || !badgeBalance || badgeBalance === BigInt(0)) {
      setOwnedTokenId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        const logs = await getLogsChunked(publicClient, {
          address: ADDRESSES.OGBadge,
          event: parseAbiItem(
            "event BadgeMinted(address indexed to, uint256 indexed tokenId)"
          ),
          args: { to: address },
          fromBlock: DEPLOY_BLOCKS.OGBadge,
          toBlock: latest,
        });
        if (cancelled) return;
        const last = logs[logs.length - 1];
        if (last?.args?.tokenId !== undefined) {
          setOwnedTokenId(last.args.tokenId as bigint);
        }
      } catch (err) {
        console.error("[wallet] badge mint log query failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, badgeBalance]);

  // ──────────────── Approve + Mint flow ────────────────

  const { writeContract: writeApprove, data: approveHash, isPending: approvePending, reset: resetApprove } =
    useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: writeMint, data: mintHash, isPending: mintPending, reset: resetMint } =
    useWriteContract();
  const { isSuccess: mintConfirmed } = useWaitForTransactionReceipt({ hash: mintHash });

  const [mintStep, setMintStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (approveConfirmed && mintStep === 1) {
      refetchAllowance();
      toast.success("Approval confirmed. Now mint your badge.");
    }
  }, [approveConfirmed, mintStep, refetchAllowance]);

  useEffect(() => {
    if (mintConfirmed && mintStep === 2) {
      refetchBadgeBalance();
      refetchNextTokenId();
      refetchBalance();
      refetchAllowance();
      toast.success("Welcome, OG Welper!");
      setMintStep(0);
      resetApprove();
      resetMint();
    }
  }, [
    mintConfirmed,
    mintStep,
    refetchBadgeBalance,
    refetchNextTokenId,
    refetchBalance,
    refetchAllowance,
    resetApprove,
    resetMint,
  ]);

  const handleApprove = () => {
    if (!address) return;
    setMintStep(1);
    writeApprove({
      address: ADDRESSES.WelpToken,
      abi: WELP_TOKEN_WRITE_ABI,
      functionName: "approve",
      args: [ADDRESSES.OGBadge, MINT_PRICE],
    });
  };

  const handleMint = () => {
    if (!address) return;
    setMintStep(2);
    writeMint({
      address: ADDRESSES.OGBadge,
      abi: OG_BADGE_ABI,
      functionName: "mintBadge",
      args: [],
    });
  };

  // ──────────────── Unified activity feed ────────────────

  const [activity, setActivity] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    if (!publicClient || !address) return;
    let cancelled = false;

    (async () => {
      try {
        // Pin a toBlock for this run so every chunked stream walks the
        // same window. Otherwise a stream scheduled later could overshoot
        // and hit "toBlock > fromBlock" edge cases.
        const latestBlock = await publicClient.getBlockNumber();

        // Each stream has its own try/catch so one failing RPC call
        // can't blank the whole feed. Streams also get paginated via
        // getLogsChunked because Sepolia RPCs cap eth_getLogs ranges.
        const fetchStream = async <T,>(
          name: string,
          fn: () => Promise<T[]>
        ): Promise<T[]> => {
          try {
            return await fn();
          } catch (err) {
            console.error(`[wallet] ${name} log query failed:`, err);
            return [];
          }
        };

        const [
          reviewLogs,
          checkInLogs,
          voteLogs,
          welpInLogs,
          badgeLogs,
          burnLogs,
        ] = await Promise.all([
          fetchStream("reviews", () =>
            getLogsChunked(publicClient, {
              address: ADDRESSES.ReviewRegistry,
              event: parseAbiItem(
                "event ReviewSubmitted(uint256 indexed reviewId, uint256 indexed businessId, address indexed reviewer, uint8 rating, string ipfsHash, uint256 timestamp)"
              ),
              args: { reviewer: address },
              fromBlock: DEPLOY_BLOCKS.ReviewRegistry,
              toBlock: latestBlock,
            })
          ),
          fetchStream("check-ins", () =>
            getLogsChunked(publicClient, {
              address: ADDRESSES.ReviewRegistry,
              event: parseAbiItem(
                "event CheckedIn(uint256 indexed businessId, address indexed user, uint256 timestamp)"
              ),
              args: { user: address },
              fromBlock: DEPLOY_BLOCKS.ReviewRegistry,
              toBlock: latestBlock,
            })
          ),
          fetchStream("votes", () =>
            getLogsChunked(publicClient, {
              address: ADDRESSES.ReviewRegistry,
              event: parseAbiItem(
                "event VoteRecorded(uint256 indexed reviewId, address indexed voter, bool isUpvote)"
              ),
              args: { voter: address },
              fromBlock: DEPLOY_BLOCKS.ReviewRegistry,
              toBlock: latestBlock,
            })
          ),
          fetchStream("welp-in", () =>
            getLogsChunked(publicClient, {
              address: ADDRESSES.WelpToken,
              event: parseAbiItem(
                "event Transfer(address indexed from, address indexed to, uint256 value)"
              ),
              args: { from: ADDRESSES.RewardsVault, to: address },
              fromBlock: DEPLOY_BLOCKS.WelpToken,
              toBlock: latestBlock,
            })
          ),
          fetchStream("badge-mints", () =>
            getLogsChunked(publicClient, {
              address: ADDRESSES.OGBadge,
              event: parseAbiItem(
                "event BadgeMinted(address indexed to, uint256 indexed tokenId)"
              ),
              args: { to: address },
              fromBlock: DEPLOY_BLOCKS.OGBadge,
              toBlock: latestBlock,
            })
          ),
          fetchStream("welp-burn", () =>
            getLogsChunked(publicClient, {
              address: ADDRESSES.WelpToken,
              event: parseAbiItem(
                "event Transfer(address indexed from, address indexed to, uint256 value)"
              ),
              args: { from: address, to: DEAD_ADDRESS },
              fromBlock: DEPLOY_BLOCKS.WelpToken,
              toBlock: latestBlock,
            })
          ),
        ]);

        // Block-number -> timestamp cache, so we don't refetch the same block
        const uniqueBlocks = new Set<bigint>();
        const addBlocks = (logs: { blockNumber: bigint }[]) =>
          logs.forEach((l) => uniqueBlocks.add(l.blockNumber));
        addBlocks(reviewLogs);
        addBlocks(checkInLogs);
        addBlocks(voteLogs);
        addBlocks(welpInLogs);
        addBlocks(burnLogs);
        addBlocks(badgeLogs);

        const blockTimes = new Map<bigint, number>();
        await Promise.all(
          Array.from(uniqueBlocks).map(async (bn) => {
            try {
              const block = await publicClient.getBlock({ blockNumber: bn });
              blockTimes.set(bn, Number(block.timestamp));
            } catch {
              blockTimes.set(bn, 0);
            }
          })
        );

        const rows: ActivityRow[] = [];

        for (const log of reviewLogs) {
          const ts = blockTimes.get(log.blockNumber) ?? 0;
          const bizId = log.args?.businessId?.toString() ?? "?";
          rows.push({
            kind: "review",
            timestamp: ts,
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex ?? 0,
            label: `Wrote a review for business #${bizId}`,
            icon: <Pencil className="h-4 w-4" />,
            iconBg: "bg-blue-50 text-brand-primary",
          });
        }

        for (const log of checkInLogs) {
          const ts = blockTimes.get(log.blockNumber) ?? 0;
          const bizId = log.args?.businessId?.toString() ?? "?";
          rows.push({
            kind: "checkin",
            timestamp: ts,
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex ?? 0,
            label: `Checked in to business #${bizId}`,
            icon: <MapPin className="h-4 w-4" />,
            iconBg: "bg-amber-50 text-amber-600",
          });
        }

        for (const log of voteLogs) {
          const ts = blockTimes.get(log.blockNumber) ?? 0;
          const reviewId = log.args?.reviewId?.toString() ?? "?";
          const isUp = log.args?.isUpvote === true;
          rows.push({
            kind: "vote",
            timestamp: ts,
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex ?? 0,
            label: `${isUp ? "Upvoted" : "Downvoted"} review #${reviewId}`,
            icon: isUp ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />,
            iconBg: isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
          });
        }

        for (const log of welpInLogs) {
          const ts = blockTimes.get(log.blockNumber) ?? 0;
          const value = (log.args?.value as bigint) ?? BigInt(0);
          const amount = Number(formatUnits(value, 18));
          rows.push({
            kind: "received",
            timestamp: ts,
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex ?? 0,
            label: "Earned WELP from Rewards Vault",
            amount: `+${amount.toFixed(0)} WELP`,
            icon: <Coins className="h-4 w-4" />,
            iconBg: "bg-emerald-50 text-emerald-600",
          });
        }

        for (const log of burnLogs) {
          const ts = blockTimes.get(log.blockNumber) ?? 0;
          const value = (log.args?.value as bigint) ?? BigInt(0);
          const amount = Number(formatUnits(value, 18));
          rows.push({
            kind: "burn",
            timestamp: ts,
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex ?? 0,
            label: "Burned WELP for OG Badge",
            amount: `-${amount.toFixed(0)} WELP`,
            icon: <Flame className="h-4 w-4" />,
            iconBg: "bg-orange-50 text-orange-600",
          });
        }

        for (const log of badgeLogs) {
          const ts = blockTimes.get(log.blockNumber) ?? 0;
          const tid = log.args?.tokenId?.toString() ?? "?";
          rows.push({
            kind: "badge",
            timestamp: ts,
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex ?? 0,
            label: `Minted OG Welper Badge #${tid}`,
            icon: <Award className="h-4 w-4" />,
            iconBg: "bg-purple-50 text-purple-600",
          });
        }

        rows.sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return b.logIndex - a.logIndex;
          return a.blockNumber > b.blockNumber ? -1 : 1;
        });

        if (!cancelled) setActivity(rows.slice(0, ACTIVITY_LIMIT));
      } catch (err) {
        console.error("activity feed query failed", err);
        if (!cancelled) setActivity([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, address, approveHash, mintHash]);

  // ──────────────── Derived UI values ────────────────

  if (!loaded || !isConnected || !profile) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-40 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse mb-6" />
        <div className="h-64 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse mb-6" />
        <div className="h-96 rounded-[1.5rem] bg-white border-2 border-gray-100 animate-pulse" />
      </div>
    );
  }

  const balance = welpBalance ? formatUnits(welpBalance as bigint, 18) : "0";
  const balanceNum = Number(balance);
  const rep = Number(reputation || 0);
  const mintedSoFar = Math.max(0, Number(nextTokenId || BigInt(1)) - 1);
  const ownsBadge = badgeBalance !== undefined && (badgeBalance as bigint) > BigInt(0);
  const hasEnoughWelp = welpBalance !== undefined && (welpBalance as bigint) >= MINT_PRICE;
  const hasAllowance =
    currentAllowance !== undefined && (currentAllowance as bigint) >= MINT_PRICE;
  const supplyRemaining = MAX_SUPPLY - mintedSoFar;
  const soldOut = supplyRemaining <= 0;
  const shortfall = hasEnoughWelp ? 0 : Math.max(0, 100 - balanceNum);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Wallet</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Everything you&apos;ve earned, minted, and voted on -- straight from the chain.
        </p>
      </div>

      {/* 1. WELP Balance Hero */}
      <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-8 mb-6 flex items-center gap-6">
        <WelpCoin size={72} animation="spin" durationSec={6} />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">
            WELP Balance
          </p>
          <p className="text-4xl font-bold text-gray-900">
            <CountUp value={Math.round(balanceNum)} /> <span className="text-brand-primary">WELP</span>
          </p>
          {balanceNum > 0 && welpPriceUsd && (
            <p className="text-sm text-gray-500 mt-1">
              ≈ ${(balanceNum * welpPriceUsd).toFixed(2)} USD
            </p>
          )}
        </div>
      </div>

      {/* 2. Quick stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">✏️ Reviews Written</span>
          </div>
          <p className="text-3xl font-bold text-brand-primary">
            <CountUp value={userReviews.length} />
          </p>
          <p className="text-sm text-gray-400 mt-1">On-chain reviews</p>
        </div>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">👍 Upvotes Received</span>
          </div>
          <p className="text-3xl font-bold text-brand-primary">
            <CountUp value={upvotesReceived} />
          </p>
          <p className="text-sm text-gray-400 mt-1">On your reviews</p>
        </div>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600">📍 Check-ins</span>
          </div>
          <p className="text-3xl font-bold text-brand-primary">
            <CountUp value={checkInCount ?? 0} />
          </p>
          <p className="text-sm text-gray-400 mt-1">Places visited</p>
        </div>

        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="group relative inline-flex items-center gap-1 text-sm text-gray-600">
              ⭐ Reputation
              <Info className="h-3 w-3 text-gray-400 cursor-help" />
            </span>
          </div>
          <p className="text-3xl font-bold text-brand-primary">
            <CountUp value={rep} />
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {rep >= 20 ? "Gold" : rep >= 5 ? "Silver" : "Bronze"} tier
          </p>
        </div>
      </div>

      {/* 3. Tier progress */}
      <div className="mb-6">
        <TierProgressCard address={address!} />
      </div>

      {/* 4. OG Welper Badge */}
      <OGBadgeCard
        address={address!}
        ownsBadge={ownsBadge}
        ownedTokenId={ownedTokenId}
        mintedSoFar={mintedSoFar}
        soldOut={soldOut}
        hasEnoughWelp={hasEnoughWelp}
        hasAllowance={hasAllowance}
        balanceNum={balanceNum}
        shortfall={shortfall}
        onApprove={handleApprove}
        onMint={handleMint}
        mintStep={mintStep}
        approvePending={approvePending}
        approveHash={approveHash}
        approveConfirmed={approveConfirmed}
        mintPending={mintPending}
        mintHash={mintHash}
        mintConfirmed={mintConfirmed}
      />

      {/* 5. Transaction history */}
      <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Transaction History</h2>
        <p className="text-sm text-gray-400 mb-4">
          Your last {ACTIVITY_LIMIT} on-chain actions, newest first.
        </p>
        {activity === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-3xl mb-3 block">📜</span>
            <p className="text-gray-500">No activity yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Check in to a business to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activity.map((row) => (
              <a
                key={`${row.txHash}-${row.logIndex}`}
                href={etherscanTx(row.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-primary/30 hover:bg-blue-50/40 transition-all duration-200"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${row.iconBg}`}>
                  {row.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{row.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {row.timestamp ? relativeTime(row.timestamp) : "--"}
                  </p>
                </div>
                {row.amount && (
                  <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                    {row.amount}
                  </span>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Multi-step loading modal */}
      <TxLoadingModal
        open={mintStep === 1 && (approvePending || (approveHash !== undefined && !approveConfirmed))}
        step={1}
        totalSteps={2}
        stepLabel="Approving"
        title="Approving 100 WELP"
        subtitle="Granting the badge contract permission to burn your WELP."
      />
      <TxLoadingModal
        open={mintStep === 2 && (mintPending || (mintHash !== undefined && !mintConfirmed))}
        step={2}
        totalSteps={2}
        stepLabel="Minting"
        title="Minting your badge"
        subtitle="Burning 100 WELP and issuing your soulbound OG Welper badge."
      />
    </div>
  );
}

// ──────────────── OGBadge card ────────────────

type BadgeCardProps = {
  address: Address;
  ownsBadge: boolean;
  ownedTokenId: bigint | null;
  mintedSoFar: number;
  soldOut: boolean;
  hasEnoughWelp: boolean;
  hasAllowance: boolean;
  balanceNum: number;
  shortfall: number;
  onApprove: () => void;
  onMint: () => void;
  mintStep: 0 | 1 | 2;
  approvePending: boolean;
  approveHash: Hash | undefined;
  approveConfirmed: boolean;
  mintPending: boolean;
  mintHash: Hash | undefined;
  mintConfirmed: boolean;
};

function OGBadgeCard(props: BadgeCardProps) {
  const {
    ownsBadge,
    ownedTokenId,
    mintedSoFar,
    soldOut,
    hasEnoughWelp,
    hasAllowance,
    balanceNum,
    shortfall,
    onApprove,
    onMint,
    mintStep,
    approvePending,
    approveHash,
    approveConfirmed,
    mintPending,
    mintHash,
    mintConfirmed,
  } = props;

  const approveWaiting =
    mintStep === 1 && (approvePending || (approveHash !== undefined && !approveConfirmed));
  const mintWaiting =
    mintStep === 2 && (mintPending || (mintHash !== undefined && !mintConfirmed));

  const locked = !ownsBadge && (!hasEnoughWelp || soldOut);
  const badgeImage = (
    <div
      className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden flex-shrink-0 bg-white ${
        ownsBadge
          ? "ring-2 ring-brand-primary/50 shadow-[0_0_28px_-4px_rgba(74,144,226,0.55)]"
          : hasEnoughWelp && !soldOut
          ? "border-2 border-gray-100"
          : "border-2 border-gray-200"
      }`}
    >
      <Image
        src={BADGE_IMAGE_SRC}
        alt="OG Welper Badge"
        width={160}
        height={160}
        priority
        className={`w-full h-full object-cover ${
          locked ? "grayscale opacity-60" : ""
        }`}
      />
    </div>
  );

  return (
    <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {badgeImage}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                OG Welper Badge
                {ownsBadge && ownedTokenId !== null && (
                  <span className="ml-2 text-gray-400 font-normal">#{ownedTokenId.toString()}</span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-1 max-w-prose">
                {ownsBadge
                  ? "Soulbound. Non-transferable. Your proof of early contribution."
                  : "Burn 100 WELP to mint your soulbound founder badge. One of the first 100 reviewers on Welp."}
              </p>
            </div>
            <div className="text-xs text-gray-400 whitespace-nowrap">
              {mintedSoFar} / {MAX_SUPPLY} minted
            </div>
          </div>

          <div className="mt-4">
            {ownsBadge ? (
              <a
                href={`https://sepolia.etherscan.io/token/${ADDRESSES.OGBadge}?a=${
                  ownedTokenId !== null ? ownedTokenId.toString() : ""
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-brand-primary hover:underline"
              >
                View on Etherscan <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : soldOut ? (
              <button
                disabled
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed"
              >
                Sold out
              </button>
            ) : !hasEnoughWelp ? (
              <button
                disabled
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed"
              >
                Need 100 WELP{shortfall > 0 ? ` (${shortfall.toFixed(0)} short)` : ""}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={onApprove}
                  disabled={hasAllowance || approveWaiting || mintWaiting}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    hasAllowance
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-brand-primary hover:bg-brand-hover text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  }`}
                >
                  {hasAllowance ? "✓ Approved" : approveWaiting ? "Approving..." : "1. Approve 100 WELP"}
                </button>
                <button
                  onClick={onMint}
                  disabled={!hasAllowance || mintWaiting || approveWaiting}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {mintWaiting ? "Minting..." : "2. Mint Badge"}
                </button>
              </div>
            )}
          </div>

          {!ownsBadge && !soldOut && balanceNum < 100 && (
            <p className="text-xs text-gray-400 mt-3">
              Keep writing great reviews to earn more WELP.{" "}
              <Link href="/businesses" className="text-brand-primary hover:underline">
                Find a business →
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

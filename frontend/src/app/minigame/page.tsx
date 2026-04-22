"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatUnits } from "viem";
import {
  useAccount,
  useConnect,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { ADDRESSES, COIN_GAME_ABI } from "@/lib/contracts";
import { CoinSandbox } from "@/components/CoinSandbox";
import { TxLoadingModal } from "@/components/TxLoadingModal";
import { WelpCoin } from "@/components/WelpCoin";

const MIN_CLAIM = 5;
const MAX_CLAIM = 10;
const MIN_TREASURY = BigInt(10) * BigInt(10) ** BigInt(18);

function formatMmSs(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function MinigamePage() {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();

  const [count, setCount] = useState(0);
  // Use a Set so repeated clicks on the same coin (shouldn't happen since
  // coins pop once) can't double-count. id is the coin id from CoinSandbox.
  const [poppedIds, setPoppedIds] = useState<Set<number>>(new Set());

  const handlePop = useCallback((id: number) => {
    setPoppedIds((prev) => {
      if (prev.has(id) || prev.size >= MAX_CLAIM) return prev;
      const next = new Set(prev);
      next.add(id);
      setCount(next.size);
      return next;
    });
  }, []);

  // ──────────────── Reads ────────────────

  const { data: cooldownSecsRaw, refetch: refetchCooldown } = useReadContract({
    address: ADDRESSES.CoinGame,
    abi: COIN_GAME_ABI,
    functionName: "cooldownRemaining",
    args: [address!],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: treasuryRaw, refetch: refetchTreasury } = useReadContract({
    address: ADDRESSES.CoinGame,
    abi: COIN_GAME_ABI,
    functionName: "treasuryBalance",
    query: { refetchInterval: 30_000 },
  });

  // Local 1Hz tick so the MM:SS display counts down without hammering the RPC.
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  useEffect(() => {
    setCooldownRemaining(Number(cooldownSecsRaw ?? 0));
  }, [cooldownSecsRaw]);
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const id = setInterval(() => {
      setCooldownRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownRemaining]);

  const treasury = (treasuryRaw as bigint | undefined) ?? BigInt(0);
  const treasuryTooLow = treasury < MIN_TREASURY;
  const treasuryDisplay = Number(formatUnits(treasury, 18)).toFixed(0);

  // ──────────────── Write: claim() ────────────────

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const onCooldown = cooldownRemaining > 0;
  const readyToClaim = count >= MIN_CLAIM;
  const canClaim = isConnected && readyToClaim && !onCooldown && !treasuryTooLow && !isPending && !isConfirming;

  const handleClaim = () => {
    if (!canClaim || !address) return;
    writeContract({
      address: ADDRESSES.CoinGame,
      abi: COIN_GAME_ABI,
      functionName: "claim",
      args: [BigInt(Math.min(count, MAX_CLAIM))],
    });
  };

  useEffect(() => {
    if (!isSuccess) return;
    toast.success(`Claimed ${count} WELP!`);
    setCount(0);
    setPoppedIds(new Set());
    refetchCooldown();
    refetchTreasury();
    reset();
  }, [isSuccess, count, refetchCooldown, refetchTreasury, reset]);

  // ──────────────── UI helpers ────────────────

  const counterSubtext = useMemo(() => {
    if (count === 0) return "Pop 5 more to claim";
    if (count < MIN_CLAIM) return `Pop ${MIN_CLAIM - count} more to claim`;
    if (count < MAX_CLAIM) return "Ready! Or pop more for bigger reward";
    return "Max reached -- time to mint";
  }, [count]);

  const txModalOpen = isPending || isConfirming;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Coin Drop</h1>
        <p className="text-gray-500 mt-1">
          Pop coins. Hit 5 to claim. Max 10 per hour.
        </p>
      </div>

      {!isConnected ? (
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-10 text-center">
          <div className="flex justify-center mb-5">
            <WelpCoin size={72} animation="flip" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect your wallet</h2>
          <p className="text-gray-500 mb-6">
            You&apos;ll need a Sepolia wallet to claim WELP from the treasury.
          </p>
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isConnecting}
            className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold transition-all duration-300 disabled:opacity-60"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      ) : treasuryTooLow ? (
        <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3">🪙</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Treasury topping up</h2>
          <p className="text-gray-500">
            The coin treasury is low. Check back soon -- new funds are on the way.
          </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sandbox */}
          <div className="flex-1 rounded-[1.5rem] bg-white border-2 border-gray-100 p-4 overflow-hidden">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-amber-50">
              <CoinSandbox
                bounded
                width="100%"
                height={500}
                count={20}
                onPop={handlePop}
                paused={count >= MAX_CLAIM}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              Tip: coins dodge your cursor -- click quickly to pop them.
            </p>
          </div>

          {/* Side panel */}
          <aside className="w-full md:w-[280px] md:flex-shrink-0 space-y-4">
            <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Collected</p>
              <p className="text-5xl font-bold text-brand-primary tabular-nums">
                {count}
                <span className="text-2xl text-gray-300"> / {MAX_CLAIM}</span>
              </p>
              <p className="text-sm text-gray-500 mt-3 min-h-[1.25rem]">{counterSubtext}</p>
            </div>

            <div className="rounded-[1.5rem] bg-white border-2 border-gray-100 p-6">
              {onCooldown ? (
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Cooldown</p>
                  <p className="text-3xl font-bold text-gray-900 tabular-nums">
                    {formatMmSs(cooldownRemaining)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">until next claim</p>
                </div>
              ) : (
                <button
                  onClick={handleClaim}
                  disabled={!canClaim}
                  className={
                    readyToClaim
                      ? "w-full py-3 rounded-xl bg-brand-yellow hover:bg-[#E6C029] text-gray-900 font-bold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                      : "w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-semibold cursor-not-allowed"
                  }
                >
                  {isPending || isConfirming
                    ? "Claiming..."
                    : readyToClaim
                      ? `Mint ${count} WELP`
                      : "Mint Now"}
                </button>
              )}
              <p className="text-xs text-gray-400 mt-3 text-center">
                Treasury: {treasuryDisplay} WELP available
              </p>
            </div>

            <Link
              href="/dashboard"
              className="block text-center text-sm text-gray-500 hover:text-brand-primary transition-colors"
            >
              ← Back to dashboard
            </Link>
          </aside>
        </div>
      )}

      <TxLoadingModal
        open={txModalOpen}
        title={isConfirming ? "Confirming on Sepolia..." : "Sign the transaction"}
        subtitle={`Claiming ${count} WELP from the coin treasury`}
      />
    </div>
  );
}

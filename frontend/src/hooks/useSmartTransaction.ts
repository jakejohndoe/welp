import { useState, useCallback, useRef, useEffect } from "react";
import { useWalletClient, usePublicClient, useAccount } from "wagmi";
import { Address, Hash } from "viem";
import { createGaslessClient, validateZeroDevConfig } from "@/lib/aa-config";
import type { KernelAccountClient } from "@zerodev/sdk";

interface UseSmartTransactionReturn {
  sendGaslessTransaction: (params: {
    address: Address;
    abi: readonly unknown[] | any[];
    functionName: string;
    args?: any[];
  }) => Promise<Hash>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  isAAReady: boolean;
  reset: () => void;
}

/**
 * Hook for sending gasless transactions through ZeroDev Kernel accounts
 */
export function useSmartTransaction(): UseSmartTransactionReturn {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAAReady, setIsAAReady] = useState(false);

  const kernelClientRef = useRef<KernelAccountClient<any, any, any, any, any> | null>(null);

  // Initialize Kernel client when wallet and public clients are ready
  useEffect(() => {
    const initializeKernelClient = async () => {
      if (!walletClient || !publicClient || !isConnected) {
        setIsAAReady(false);
        kernelClientRef.current = null;
        return;
      }

      try {
        const kernelClient = await createGaslessClient(walletClient, publicClient);
        kernelClientRef.current = kernelClient;
        setIsAAReady(kernelClient !== null);
      } catch (err) {
        console.error("Failed to initialize Kernel client:", err);
        console.error("Actual error details:", {
          message: err instanceof Error ? err.message : "Unknown error",
          stack: err instanceof Error ? err.stack : undefined,
        });
        setIsAAReady(false);
        kernelClientRef.current = null;
      }
    };

    initializeKernelClient();
  }, [walletClient, publicClient, isConnected]);

  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
  }, []);

  const sendGaslessTransaction = useCallback(
    async ({
      address,
      abi,
      functionName,
      args = [],
    }: {
      address: Address;
      abi: readonly unknown[] | any[];
      functionName: string;
      args?: any[];
    }): Promise<Hash> => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }

      if (!kernelClientRef.current) {
        throw new Error("Kernel client not initialized");
      }

      setIsPending(true);
      setIsError(false);
      setError(null);
      setIsSuccess(false);

      try {
        // Send the UserOperation through the Kernel client
        const hash = await kernelClientRef.current.writeContract({
          address,
          abi,
          functionName,
          args,
        } as any);

        setIsSuccess(true);
        setIsPending(false);
        return hash;
      } catch (err) {
        const error = err as Error;
        setError(error);
        setIsError(true);
        setIsPending(false);
        throw error;
      }
    },
    [isConnected]
  );

  return {
    sendGaslessTransaction,
    isPending,
    isSuccess,
    isError,
    error,
    isAAReady,
    reset,
  };
}
import { sepolia } from "viem/chains";
import { http } from "viem";
import type {
  WalletClient,
  PublicClient,
  Hash,
} from "viem";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  type KernelAccountClient,
  constants,
} from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";

/**
 * ZeroDev configuration for gasless transactions
 * Using Kernel v3.1 on Sepolia testnet
 */
export const zeroDev = {
  bundlerUrl: process.env.NEXT_PUBLIC_ZERODEV_BUNDLER_URL || "",
  paymasterUrl: process.env.NEXT_PUBLIC_ZERODEV_PAYMASTER_URL || "",
  apiKey: process.env.NEXT_PUBLIC_ZERODEV_API_KEY || "",
  chain: sepolia,
} as const;

/**
 * Validate ZeroDev configuration
 */
export function validateZeroDevConfig(): boolean {
  if (!zeroDev.bundlerUrl) {
    console.warn("NEXT_PUBLIC_ZERODEV_BUNDLER_URL not found in environment variables");
    return false;
  }
  if (!zeroDev.paymasterUrl) {
    console.warn("NEXT_PUBLIC_ZERODEV_PAYMASTER_URL not found in environment variables");
    return false;
  }
  if (!zeroDev.apiKey) {
    console.warn("NEXT_PUBLIC_ZERODEV_API_KEY not found in environment variables");
    return false;
  }
  return true;
}

/**
 * Creates a gasless Kernel account client using ZeroDev
 */
export async function createGaslessClient(
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<KernelAccountClient<any, any, any, any, any> | null> {
  if (!validateZeroDevConfig()) {
    console.error("ZeroDev configuration invalid, gasless transactions unavailable");
    return null;
  }

  if (!walletClient.account) {
    console.error("Wallet client account not available, gasless transactions unavailable");
    return null;
  }

  try {
    // Get the EntryPoint for version 0.7
    const entryPoint = constants.getEntryPoint("0.7");

    // Convert the wallet's EOA account to an ECDSA validator
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
      signer: walletClient as any, // WalletClient acts as signer
      entryPoint,
      kernelVersion: constants.KERNEL_V3_1,
    });

    // Create the Kernel smart account with the ECDSA validator as sudo
    const kernelAccount = await createKernelAccount(publicClient, {
      plugins: {
        sudo: ecdsaValidator,
      },
      entryPoint,
      kernelVersion: constants.KERNEL_V3_1,
    });

    // Create the paymaster client for gas sponsorship using explicit v3 URL with API key authentication
    const paymasterClient = createZeroDevPaymasterClient({
      transport: http(zeroDev.paymasterUrl, {
        fetchOptions: {
          headers: {
            'Authorization': `Bearer ${zeroDev.apiKey}`,
          },
        },
      }),
    });

    // Create the Kernel account client with bundler and paymaster using explicit v3 URLs with API key authentication
    const kernelClient = createKernelAccountClient({
      account: kernelAccount,
      chain: sepolia,
      bundlerTransport: http(zeroDev.bundlerUrl, {
        fetchOptions: {
          headers: {
            'Authorization': `Bearer ${zeroDev.apiKey}`,
          },
        },
      }),
      paymaster: {
        getPaymasterData: paymasterClient.getPaymasterData,
        getPaymasterStubData: paymasterClient.getPaymasterStubData,
      },
      client: publicClient,
    });

    console.log("✅ ZeroDev Kernel client created successfully");
    console.log("Smart Account Address:", kernelAccount.address);

    return kernelClient;
  } catch (error) {
    console.error("Failed to create ZeroDev Kernel client:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}
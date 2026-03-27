import { http, createConfig, createStorage, noopStorage } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  storage: createStorage({
    storage:
      typeof window !== "undefined" ? window.localStorage : noopStorage,
  }),
  ssr: true,
  transports: {
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
        "https://rpc.sepolia.org"
    ),
  },
});

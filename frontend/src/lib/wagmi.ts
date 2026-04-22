import { http, createConfig, createStorage, noopStorage } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";

// PublicNode Sepolia RPC. Alchemy's free tier caps eth_getLogs at a 10
// block range per request, which breaks the /wallet activity feed --
// the core contracts are ~175k blocks behind head. PublicNode has no
// such cap and is fine for everything else wagmi does (eth_call,
// eth_blockNumber, eth_getBlockByNumber). ZeroDev AA keeps using its
// own bundler RPC separately in aa-config.ts.
const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

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
    [sepolia.id]: http(SEPOLIA_RPC),
  },
});

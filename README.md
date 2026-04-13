# welp

**Decentralized Business Review Platform**

Review local businesses, earn WELP tokens, build on-chain reputation.

welp is a blockchain-native review platform for Saint Paul, MN businesses. Users check in at businesses, write reviews stored on IPFS, and earn WELP tokens as rewards. Community voting on reviews drives an on-chain reputation system that determines reward tiers -- creating a flywheel where quality reviewers earn more.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.20, Foundry, OpenZeppelin v5 |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Blockchain | wagmi v3, viem, WalletConnect |
| Storage | Pinata (IPFS) for review content |
| Network | Ethereum Sepolia Testnet |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  Next.js 16 + wagmi + Pinata IPFS              │
│  Wallet-gated routing, 3-step onboarding        │
└──────────────────┬──────────────────────────────┘
                   │ wagmi / viem
┌──────────────────▼──────────────────────────────┐
│              ReviewRegistry                      │
│  - Stores businesses, reviews, check-ins        │
│  - Tracks reputation via upvotes/downvotes      │
│  - Enforces 24h check-in window, 48h cooldown   │
│  - Calls RewardsVault on review submission       │
└──────────┬───────────────────────────────────────┘
           │ distributeReward()
┌──────────▼───────────────────────────────────────┐
│              RewardsVault                         │
│  - Reads reviewer reputation from Registry       │
│  - Calculates tier-based reward amount           │
│  - Calls WelpToken.mint()                        │
└──────────┬───────────────────────────────────────┘
           │ mint()
┌──────────▼───────────────────────────────────────┐
│              WelpToken (ERC-20)                   │
│  - "Welp" / "WELP" reward token                  │
│  - Mint restricted to RewardsVault only          │
│  - Pausable by owner for emergencies             │
└──────────────────────────────────────────────────┘
```

### Contracts

**WelpToken** -- ERC-20 reward token. Only the RewardsVault can mint. Pausable by the contract owner for emergency stops.

**ReviewRegistry** -- Core contract. Manages businesses (owner-added), check-ins (anyone), reviews (must check in first), and voting (one vote per address per review). Reputation is an `int256` that goes up with upvotes and down with downvotes.

**RewardsVault** -- Distributes WELP tokens on review submission with tier-based scaling:

| Tier | Reputation | Reward per Review |
|------|-----------|------------------|
| Bronze | < 5 | 100 WELP |
| Silver | >= 5 | 200 WELP |
| Gold | >= 20 | 300 WELP |

### How Reputation Works

Reviews earn WELP, but **reputation comes from the community**. When other users upvote your reviews, your reputation increases. Downvotes decrease it. Higher reputation unlocks higher reward tiers. This design prevents review spam -- writing 100 low-quality reviews won't boost your tier, but writing reviews the community finds helpful will.

## Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil)
- [MetaMask](https://metamask.io/) or another injected wallet
- A [Pinata](https://www.pinata.cloud/) account (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/jakejohndoe/welp.git
cd welp
```

### 2. Smart contracts

```bash
cd contracts
forge install
forge build
forge test
```

### 3. Deploy to Sepolia (optional -- contracts are already deployed)

Create `contracts/.env`:
```env
PRIVATE_KEY=         # Deployer wallet private key
SEPOLIA_RPC_URL=     # Alchemy/Infura Sepolia RPC endpoint
ETHERSCAN_API_KEY=   # For contract verification (optional)
```

```bash
source .env
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

### 4. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SEPOLIA_RPC_URL=     # Sepolia RPC (Alchemy/Infura)
NEXT_PUBLIC_WALLETCONNECT_ID=    # WalletConnect project ID (from cloud.walletconnect.com)
NEXT_PUBLIC_PINATA_JWT=          # Pinata API JWT for IPFS uploads
NEXT_PUBLIC_PINATA_GATEWAY=      # Your Pinata gateway URL (e.g., https://your-gateway.mypinata.cloud)
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect MetaMask (Sepolia network).

### User Flow

1. Connect wallet on `/welcome`
2. Complete 3-step onboarding (name, avatar, interests)
3. Browse businesses on `/businesses`
4. Check in at a business (on-chain transaction)
5. Write a review (uploaded to IPFS, hash stored on-chain)
6. Earn WELP tokens automatically via RewardsVault
7. Vote on other reviews in the `/feed` to shape reputation

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| WelpToken | [`0xDF76BdF11812E93f31BDF6363FE3CD1fE4078A52`](https://sepolia.etherscan.io/address/0xDF76BdF11812E93f31BDF6363FE3CD1fE4078A52) |
| RewardsVault | [`0xaCd596F9546A32469E4d7120593e7b54e119351B`](https://sepolia.etherscan.io/address/0xaCd596F9546A32469E4d7120593e7b54e119351B) |
| ReviewRegistry | [`0xed08ee493161Fb3eA1Fb8935271ed6E85fdD8C0C`](https://sepolia.etherscan.io/address/0xed08ee493161Fb3eA1Fb8935271ed6E85fdD8C0C) |
| PriceFeed (Chainlink) | [`0xC1a5A807d0c0913BcD8635b345FFf9148EcE9dbb`](https://sepolia.etherscan.io/address/0xC1a5A807d0c0913BcD8635b345FFf9148EcE9dbb) |

## Project Structure

```
welp/
├── contracts/
│   ├── src/
│   │   ├── WelpToken.sol          # ERC-20 reward token
│   │   ├── ReviewRegistry.sol     # Core review/reputation contract
│   │   └── RewardsVault.sol       # Tier-based reward distribution
│   ├── test/                      # Foundry test suite
│   ├── script/Deploy.s.sol        # Deployment + business seeding
│   └── foundry.toml
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages
│   │   │   ├── welcome/           # Wallet connection landing
│   │   │   ├── onboarding/        # 3-step profile setup
│   │   │   ├── dashboard/         # User home with stats
│   │   │   ├── businesses/        # Business directory
│   │   │   ├── business/[id]/     # Business detail + reviews
│   │   │   ├── review/            # Review submission form
│   │   │   └── feed/              # Global review feed + voting
│   │   ├── components/            # Navbar, ReviewText, Providers
│   │   ├── hooks/                 # useProfile (localStorage)
│   │   └── lib/                   # Contract ABIs, wagmi config, Pinata
│   └── public/                    # Avatars, logos, icons
├── SECURITY.md                    # Slither analysis + manual audit
└── README.md
```

## Security

Contracts have been analyzed with [Slither](https://github.com/crytic/slither) static analyzer. See [SECURITY.md](./SECURITY.md) for the full audit report including:

- Slither findings (0 critical, 0 high, 3 medium, 5 low)
- Manual code review of all 3 contracts
- Frontend security assessment
- Full app flow audit with data source verification

Key security features:
- `Ownable2Step` for safe ownership transfers
- `ReentrancyGuard` on state-changing reward flows
- `Pausable` emergency stop on ReviewRegistry and WelpToken
- Locked pragma `0.8.20` (no floating versions)
- Zero-address validation on all admin setters

## Future Roadmap

- **Account Abstraction (ERC-4337)** -- Gasless upvotes/downvotes via paymaster
- **QR-based Proof of Visit** -- Replace trust-based check-ins with cryptographic QR verification at businesses
- **Cross-chain deployment** -- Polygon, Base, Arbitrum for lower gas costs
- **ZK privacy-preserving check-ins** -- Prove you visited a location without revealing which one
- **LayerZero bridge** -- Cross-chain WELP token transfers
- **On-chain profiles** -- Move display names and avatars from localStorage to contract storage

## License

MIT

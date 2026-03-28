Create a CLAUDE.md in the welp project root with the following:

# welp -- Development Guidelines

## What This Is

Decentralized business review platform on Sepolia. Users check in to local businesses, write reviews (stored on IPFS, hashed on-chain), earn WELP tokens, and build reputation through community upvotes. Capstone project for Metana Solidity Bootcamp. Target completion: mid-April 2026.

## Tech Stack

- Frontend: Next.js 16, TypeScript, Tailwind CSS, wagmi/viem, WalletConnect (Reown)
- Contracts: Foundry, Solidity 0.8.x
- Storage: Pinata (IPFS) for review content
- Network: Sepolia testnet
- Fonts: Fredoka (headings), Nunito (body)

## Deployed Contracts (Sepolia)

- WelpToken (ERC-20): 0xDF76BdF11812E93f31BDF6363FE3CD1fE4078A52
- RewardsVault: 0xaCd596F9546A32469E4d7120593e7b54e119351B
- ReviewRegistry: 0xed08ee493161Fb3eA1Fb8935271ed6E85fdD8C0C

## Design System (DO NOT DEVIATE)

- Primary blue: #4A90E2 (NOT Tailwind blue-500 #3B82F6 -- this has been wrong before)
- Background: warm cream hsl(36, 50%, 98%) (NOT gray-white #F9FAFB)
- Business yellow: #F5D033
- Cards: white bg, subtle borders, 1.5rem border-radius, no heavy shadows
- Consumer app feel -- NOT a crypto dashboard. NOT dark. NOT moody
- Match welp.network landing page and pitch deck aesthetic
- Always light mode -- no dark mode, no prefers-color-scheme overrides

## Architecture -- How The Core Loop Works

1. User connects wallet → onboarding (name, avatar, categories) → dashboard
2. User checks in to a business (on-chain tx)
3. User writes review → text uploaded to IPFS via Pinata → CID stored on-chain via ReviewRegistry.submitReview()
4. ReviewRegistry calls RewardsVault.distributeReward() → WelpToken.mint() → tokens sent to reviewer
5. Other users upvote/downvote reviews → changes reviewer's reputation score
6. Reputation determines tier: Bronze (rep 0-4, 100 WELP/review) → Silver (rep 5-19, 200 WELP/review) → Gold (rep 20+, 300 WELP/review)

Key: Reputation comes from OTHER users voting on YOUR reviews. NOT from writing reviews. This prevents spam.

## Route Structure

- / → redirect: no wallet → /welcome, no profile → /onboarding, else → /dashboard
- /welcome → wallet gate, hero page, "How welp works" explainer
- /onboarding → 3 steps: display name, avatar picker, category interests
- /dashboard → home base, real on-chain stats, quick actions, nearby businesses
- /businesses → explore all 10 seeded businesses, search + category filter
- /business/[id] → detail page, check-in, reviews, write review
- /review → star rating + text input, IPFS upload + on-chain submit, confetti celebration
- /feed → community reviews with upvote/downvote

## Environment Variables

Root .env (Foundry only):

- PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY

frontend/.env.local (Next.js):

- NEXT_PUBLIC_SEPOLIA_RPC_URL (Alchemy)
- NEXT_PUBLIC_WC_PROJECT_ID (WalletConnect/Reown)
- NEXT_PUBLIC_PINATA_JWT
- NEXT_PUBLIC_PINATA_GATEWAY

NEVER mix these up. Next.js only reads from frontend/.env.local. Foundry only reads from root .env.

## Lessons Learned (update after every correction)

- On-chain business IDs are 0-indexed (0-9), NOT 1-indexed. Off-by-one caused review submission reverts
- WalletConnect has SSR issues -- indexedDB not available during SSR. Use dynamic import with { ssr: false }
- Dark mode references creep in via globals.css prefers-color-scheme overrides and layout dark class. Always remove
- Fixed positioning inside sticky nav elements creates stacking context issues (disconnect modal was clipped). Render modals as siblings, not children
- Always run build after changes. Never mark done without verifying zero errors and zero warnings
- When reading review data, fetch actual IPFS content via Pinata gateway -- don't just show metadata
- Star ratings must be calculated from real review scores, not hardcoded to 5

## Style Preferences (Jake's Rules)

- No em-dashes anywhere -- use double hyphens or rewrite naturally. Em-dashes are an AI giveaway
- Keep code clean and simple -- no over-engineering
- Commit messages: conventional commits (feat:, fix:, docs:)
- When in doubt, ask -- don't guess or assume
- Skip basic explanations -- Jake is a developer

## Planning

- Enter plan mode for any task with 3+ steps or architectural decisions
- If something breaks mid-task, STOP and re-plan -- don't keep pushing
- Write detailed specs upfront to reduce ambiguity
- Verify every change compiles and renders before marking complete

## What's Remaining

1. Account abstraction (ERC-4337) -- gasless upvotes at minimum. MUST for capstone
2. Demo script / presentation prep
3. Final polish and testing
